import { existsSync } from "fs";
import { run } from "./exec";
import { isValidRegionId } from "./regions";
import {
  AUTO_REGION,
  ConnectionState,
  Protocol,
  SetupState,
  VpnStatus,
} from "../types";

export const PIA_APP_PATH = "/Applications/Private Internet Access.app";

/**
 * piactl is symlinked into /usr/local/bin by the installer, but that symlink is
 * optional — fall back to the binary inside the app bundle.
 */
const CLI_CANDIDATES = [
  "/usr/local/bin/piactl",
  `${PIA_APP_PATH}/Contents/MacOS/piactl`,
  "/opt/homebrew/bin/piactl",
];

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

function parseState(value: string | undefined): ConnectionState {
  const match = CONNECTION_STATES.find((s) => s === value);
  return match ?? "Disconnected";
}

export async function readStatus(cliPath: string): Promise<VpnStatus> {
  const [
    state,
    regionId,
    vpnIp,
    publicIp,
    protocol,
    portForward,
    requestPortForward,
    allowLan,
  ] = await Promise.all([
    get(cliPath, "connectionstate"),
    get(cliPath, "region"),
    get(cliPath, "vpnip"),
    get(cliPath, "pubip"),
    get(cliPath, "protocol"),
    get(cliPath, "portforward"),
    get(cliPath, "requestportforward"),
    get(cliPath, "allowlan"),
  ]);

  return {
    state: parseState(state),
    regionId: regionId ?? AUTO_REGION,
    // piactl reports "Unknown" rather than empty when there is no tunnel.
    vpnIp: vpnIp && vpnIp !== "Unknown" ? vpnIp : undefined,
    publicIp: publicIp && publicIp !== "Unknown" ? publicIp : undefined,
    protocol:
      protocol === "openvpn" || protocol === "wireguard" ? protocol : undefined,
    portForward,
    requestPortForward: requestPortForward === "true",
    allowLan: allowLan === "true",
  };
}

/**
 * Settings the user can change from the action panel. Each is only ever called
 * from an explicit action — nothing here runs on its own.
 */
export async function setRequestPortForward(
  cliPath: string,
  enabled: boolean,
): Promise<void> {
  await piactl(cliPath, ["set", "requestportforward", String(enabled)]);
}

export async function setAllowLan(
  cliPath: string,
  enabled: boolean,
): Promise<void> {
  await piactl(cliPath, ["set", "allowlan", String(enabled)]);
}

export async function setProtocol(
  cliPath: string,
  protocol: Protocol,
): Promise<void> {
  await piactl(cliPath, ["set", "protocol", protocol]);
}

export async function readConnectionState(
  cliPath: string,
): Promise<ConnectionState> {
  return parseState(await get(cliPath, "connectionstate"));
}

export async function setRegion(
  cliPath: string,
  regionId: string,
): Promise<void> {
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

// Note: no wrapper for `piactl background enable` / `set` beyond the region.
// This extension only connects, disconnects, and selects a region — it never
// changes how PIA behaves outside of an action the user explicitly triggered.

export async function waitForState(
  cliPath: string,
  predicate: (s: ConnectionState) => boolean,
  { attempts = 40, intervalMs = 500 } = {},
): Promise<ConnectionState> {
  let current: ConnectionState = "Disconnected";
  for (let i = 0; i < attempts; i++) {
    current = await readConnectionState(cliPath);
    if (predicate(current)) return current;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return current;
}

/**
 * Wait for a connect that was issued while a tunnel was already up.
 *
 * `piactl connect` on an active tunnel goes Connected -> Reconnecting ->
 * Connected. Polling for "Connected" alone would match the *pre-switch* state
 * and report success before the new region is live, so first wait for the
 * tunnel to leave Connected. If it never does, the requested region was already
 * the active one and there is nothing to wait for.
 */
export async function waitForReconnect(
  cliPath: string,
): Promise<ConnectionState> {
  const left = await waitForState(cliPath, (s) => s !== "Connected", {
    attempts: 10,
    intervalMs: 400,
  });
  if (left === "Connected") return left;
  return waitForState(cliPath, (s) => s === "Connected");
}

export function isActive(state: ConnectionState): boolean {
  return (
    state === "Connected" ||
    state === "Connecting" ||
    state === "Reconnecting" ||
    state === "DisconnectingToReconnect"
  );
}

/**
 * Detect whether we can drive PIA at all. `piactl get connectionstate` fails
 * when the daemon is unreachable, and reports through stderr when logged out.
 */
export async function detectSetup(): Promise<SetupState> {
  if (!existsSync(PIA_APP_PATH)) return { stage: "not-installed" };

  const cliPath = findCliPath();
  if (!cliPath) return { stage: "no-cli", appPath: PIA_APP_PATH };

  try {
    await piactl(cliPath, ["get", "connectionstate"], 6000);
  } catch (e) {
    const message = e instanceof Error ? e.message.toLowerCase() : "";
    if (message.includes("not logged in") || message.includes("log in")) {
      return { stage: "not-logged-in", appPath: PIA_APP_PATH, cliPath };
    }
    return { stage: "daemon-unavailable", appPath: PIA_APP_PATH, cliPath };
  }

  return { stage: "ready", appPath: PIA_APP_PATH, cliPath };
}
