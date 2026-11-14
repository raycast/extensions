import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const SCUTIL = "/usr/sbin/scutil";
const PROTON_NE_BUNDLE_ID = "ch.protonvpn.mac";
export const PROTON_APP_BUNDLE_ID = "ch.protonvpn.mac";

export type VpnState =
  "Connected" | "Connecting" | "Disconnected" | "Disconnecting";

export interface VpnService {
  id: string;
  name: string;
  enabled: boolean;
}

export interface VpnSnapshot {
  service: VpnService;
  state: VpnState;
  serverAddress?: string;
  lastChange?: string;
}

export class ProtonVpnNotFoundError extends Error {
  constructor() {
    super(
      "No Proton VPN profile was found. Open the Proton VPN app, sign in, and connect once to create the system profile.",
    );
    this.name = "ProtonVpnNotFoundError";
  }
}

/** Find the Proton VPN network-extension service registered with macOS. */
export async function getService(): Promise<VpnService> {
  const { stdout } = await exec(SCUTIL, ["--nc", "list"]);
  for (const line of stdout.split("\n")) {
    if (!line.includes(`[VPN:${PROTON_NE_BUNDLE_ID}]`)) continue;
    const match = line.match(
      /^(\*?)\s*\((\w+)\)\s+([0-9A-F-]{36})\s+.*"([^"]*)"/,
    );
    if (!match) continue;
    return { id: match[3], name: match[4], enabled: match[1] === "*" };
  }
  throw new ProtonVpnNotFoundError();
}

export async function getState(serviceId: string): Promise<VpnState> {
  const { stdout } = await exec(SCUTIL, ["--nc", "status", serviceId]);
  const firstLine = stdout.split("\n")[0]?.trim();
  if (
    firstLine === "Connected" ||
    firstLine === "Connecting" ||
    firstLine === "Disconnected" ||
    firstLine === "Disconnecting"
  ) {
    return firstLine;
  }
  return "Disconnected";
}

export async function getSnapshot(): Promise<VpnSnapshot> {
  const service = await getService();
  const [state, details] = await Promise.all([
    getState(service.id),
    getDetails(service.id),
  ]);
  return { service, state, ...details };
}

async function getDetails(
  serviceId: string,
): Promise<{ serverAddress?: string; lastChange?: string }> {
  try {
    const [{ stdout: show }, { stdout: status }] = await Promise.all([
      exec(SCUTIL, ["--nc", "show", serviceId]),
      exec(SCUTIL, ["--nc", "status", serviceId]),
    ]);
    return {
      serverAddress: show.match(/RemoteAddress\s*:\s*(\S+)/)?.[1],
      lastChange: status.match(/LastStatusChangeTime\s*:\s*(.+)/)?.[1]?.trim(),
    };
  } catch {
    return {};
  }
}

export async function getOnDemandEnabled(serviceId: string): Promise<boolean> {
  const { stdout } = await exec(SCUTIL, ["--nc", "show", serviceId]);
  return /OnDemandEnabled\s*:\s*TRUE/.test(stdout);
}

export async function start(serviceId: string): Promise<void> {
  await exec(SCUTIL, ["--nc", "start", serviceId]);
}

export async function stop(serviceId: string): Promise<void> {
  await exec(SCUTIL, ["--nc", "stop", serviceId]);
}

/** Poll the service until it reaches a wanted state, or until the timeout. */
export async function waitForState(
  serviceId: string,
  wanted: VpnState[],
  timeoutMs = 20000,
): Promise<VpnState> {
  const deadline = Date.now() + timeoutMs;
  let state = await getState(serviceId);
  while (!wanted.includes(state) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    state = await getState(serviceId);
  }
  return state;
}
