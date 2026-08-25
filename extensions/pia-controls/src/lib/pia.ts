import { existsSync, realpathSync } from "fs";
import { run } from "./exec";
import { isValidRegionId } from "./regions";
import { ConnectionState, Protocol, SetupState, VpnStatus } from "../types";

export const PIA_APP_PATH = "/Applications/Private Internet Access.app";
const PIA_BUNDLE_ID = "com.privateinternetaccess.vpn";

const CLI_CANDIDATES = ["/usr/local/bin/piactl", `${PIA_APP_PATH}/Contents/MacOS/piactl`, "/opt/homebrew/bin/piactl"];

const CONNECTION_STATES: ConnectionState[] = [
  "Disconnected",
  "Connecting",
  "Connected",
  "Interrupted",
  "Reconnecting",
  "DisconnectingToReconnect",
  "Disconnecting",
];

export function findCliPath(): string | undefined {
  return CLI_CANDIDATES.find((p) => existsSync(p));
}

/** The installer symlinks piactl into the bundle it belongs to. */
function appPathFromCli(cliPath: string): string | undefined {
  try {
    const real = realpathSync(cliPath);
    const bundle = real.slice(0, real.indexOf("/Contents/MacOS/"));
    return bundle.endsWith(".app") && existsSync(bundle) ? bundle : undefined;
  } catch {
    return undefined;
  }
}

async function findAppPathBySpotlight(): Promise<string | undefined> {
  try {
    const out = await run("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == '${PIA_BUNDLE_ID}'`], { timeout: 5000 });
    return out.split("\n").find(Boolean);
  } catch {
    return undefined;
  }
}

async function piactl(cliPath: string, args: string[], timeout?: number) {
  return run(cliPath, args, { timeout });
}

async function get(cliPath: string, key: string): Promise<string | undefined> {
  try {
    const value = await piactl(cliPath, ["get", key], 6000);
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Unreadable state is "Unknown", never "Disconnected", so a failed read can't invert a toggle. */
function parseState(value: string | undefined): ConnectionState {
  const match = CONNECTION_STATES.find((s) => s === value);
  return match ?? "Unknown";
}

export async function readStatus(cliPath: string): Promise<VpnStatus> {
  const [state, regionId, vpnIp, publicIp, protocol, portForward, requestPortForward, allowLan] = await Promise.all([
    get(cliPath, "connectionstate"),
    get(cliPath, "region"),
    get(cliPath, "vpnip"),
    get(cliPath, "pubip"),
    get(cliPath, "protocol"),
    get(cliPath, "portforward"),
    get(cliPath, "requestportforward"),
    get(cliPath, "allowlan"),
  ]);

  // Unreadable fields stay undefined; a default here would be shown as fact.
  return {
    state: parseState(state),
    regionId,
    // piactl reports "Unknown" rather than empty when there is no tunnel.
    vpnIp: vpnIp && vpnIp !== "Unknown" ? vpnIp : undefined,
    publicIp: publicIp && publicIp !== "Unknown" ? publicIp : undefined,
    protocol: protocol === "openvpn" || protocol === "wireguard" ? protocol : undefined,
    portForward,
    requestPortForward: parseBool(requestPortForward),
    allowLan: parseBool(allowLan),
  };
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function setRequestPortForward(cliPath: string, enabled: boolean): Promise<void> {
  await piactl(cliPath, ["set", "requestportforward", String(enabled)]);
}

export async function setAllowLan(cliPath: string, enabled: boolean): Promise<void> {
  await piactl(cliPath, ["set", "allowlan", String(enabled)]);
}

export async function setProtocol(cliPath: string, protocol: Protocol): Promise<void> {
  await piactl(cliPath, ["set", "protocol", protocol]);
}

export async function readConnectionState(cliPath: string): Promise<ConnectionState> {
  return parseState(await get(cliPath, "connectionstate"));
}

export async function setRegion(cliPath: string, regionId: string): Promise<void> {
  if (!isValidRegionId(regionId)) {
    throw new Error(`Refusing to select malformed region "${regionId}"`);
  }
  await piactl(cliPath, ["set", "region", regionId]);
}

export async function connect(cliPath: string): Promise<void> {
  await piactl(cliPath, ["connect"], 15_000);
}

export async function disconnect(cliPath: string): Promise<void> {
  await piactl(cliPath, ["disconnect"], 15_000);
}

export async function waitForState(
  cliPath: string,
  predicate: (s: ConnectionState) => boolean,
  { attempts = 40, intervalMs = 500 } = {},
): Promise<ConnectionState> {
  let current: ConnectionState = "Unknown";
  for (let i = 0; i < attempts; i++) {
    current = await readConnectionState(cliPath);
    // An unreadable state proves nothing, so it must not satisfy the predicate.
    if (current !== "Unknown" && predicate(current)) return current;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return current;
}

/**
 * Confirms a connect issued while a tunnel was already up. Switching regions
 * goes Connected -> DisconnectingToReconnect -> Connected, so a bare
 * "Connected" poll would match the pre-switch reading. Reconnecting to the
 * region already in use never leaves Connected, so that case is a success;
 * never reading successfully is not.
 */
export async function waitForReconnect(
  cliPath: string,
  { attempts = 12, intervalMs = 400 } = {},
): Promise<ConnectionState> {
  let sawReadable = false;
  let leftConnected = false;

  for (let i = 0; i < attempts; i++) {
    const state = await readConnectionState(cliPath);
    if (state !== "Unknown") {
      sawReadable = true;
      if (state !== "Connected") {
        leftConnected = true;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!sawReadable) return "Unknown";
  if (!leftConnected) return "Connected";

  return waitForState(cliPath, (s) => s === "Connected");
}

export function isActive(state: ConnectionState): boolean {
  return (
    state === "Connected" || state === "Connecting" || state === "Reconnecting" || state === "DisconnectingToReconnect"
  );
}

/**
 * Gates on piactl rather than on the app living at a fixed path: PIA can be
 * installed anywhere while its CLI helper is still on PATH.
 */
export async function detectSetup(): Promise<SetupState> {
  const cliPath = findCliPath();
  const appPath = (cliPath && appPathFromCli(cliPath)) ?? (existsSync(PIA_APP_PATH) ? PIA_APP_PATH : undefined);

  if (!cliPath) {
    const found = appPath ?? (await findAppPathBySpotlight());
    return found ? { stage: "no-cli", appPath: found } : { stage: "not-installed" };
  }

  try {
    await piactl(cliPath, ["get", "connectionstate"], 6000);
  } catch (e) {
    const message = e instanceof Error ? e.message.toLowerCase() : "";
    const stage =
      message.includes("not logged in") || message.includes("log in") ? "not-logged-in" : "daemon-unavailable";
    return { stage, appPath, cliPath };
  }

  return { stage: "ready", appPath, cliPath };
}
