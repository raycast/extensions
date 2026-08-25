import { closeMainWindow, LocalStorage, open, showHUD } from "@raycast/api";
import {
  connect,
  detectSetup,
  disconnect,
  isActive,
  readConnectionState,
  readStatus,
  setRegion,
  waitForReconnect,
  waitForState,
} from "./pia";
import { AUTO_REGION_ENTRY, RECENTS_KEY } from "./regions";
import { Region } from "../types";

function label(region: Region): string {
  return region.id === AUTO_REGION_ENTRY.id ? "Automatic" : region.name;
}

/** PIA's own wording when its daemon is idle because the app isn't running. */
const DAEMON_INACTIVE = /background mode|start the PIA client/i;

export class DaemonInactiveError extends Error {
  constructor() {
    super(
      "PIA's background service is inactive. Open the PIA app, or enable " +
        "“Allow PIA to run in the background” in its settings.",
    );
    this.name = "DaemonInactiveError";
  }
}

/**
 * Reports the idle daemon instead of enabling background mode, which is a
 * persistent change to how the VPN behaves with the app closed.
 */
async function connectOrExplain(cliPath: string): Promise<void> {
  try {
    await connect(cliPath);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (DAEMON_INACTIVE.test(message)) throw new DaemonInactiveError();
    throw e;
  }
}

export async function rememberRecent(region: Region): Promise<void> {
  if (region.id === AUTO_REGION_ENTRY.id) return;
  const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
  let list: Region[] = [];
  try {
    list = raw ? (JSON.parse(raw) as Region[]) : [];
  } catch {
    list = [];
  }
  const next = [region, ...list.filter((r) => r.id !== region.id)].slice(0, 5);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export async function loadRecents(): Promise<Region[]> {
  const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Region[];
  } catch {
    return [];
  }
}

/** `piactl connect` re-applies settings on an active tunnel, so switching needs no disconnect. */
export async function connectToRegion(region: Region): Promise<void> {
  await closeMainWindow({ clearRootSearch: true });

  const setup = await detectSetup();
  if (setup.stage !== "ready" || !setup.cliPath) {
    if (setup.appPath) void open(setup.appPath);
    await showHUD("PIA isn't ready — opening the app");
    return;
  }

  try {
    const before = await readConnectionState(setup.cliPath);
    if (before === "Unknown") {
      await showHUD("Could not read PIA status — is the app running?");
      return;
    }

    await setRegion(setup.cliPath, region.id);
    await showHUD(`Connecting to ${label(region)}…`);
    await connectOrExplain(setup.cliPath);

    // piactl exposes the selected region, not the connected one, so an active
    // tunnel must be seen cycling before "Connected" means this region.
    const state = isActive(before)
      ? await waitForReconnect(setup.cliPath)
      : await waitForState(setup.cliPath, (s) => s === "Connected");
    if (state !== "Connected") {
      await showHUD(`Could not connect (${state})`);
      return;
    }

    // Only after success, so a failed attempt can't displace the last working region.
    await rememberRecent(region);

    const status = await readStatus(setup.cliPath);
    await showHUD(status.vpnIp ? `Connected — ${label(region)} · ${status.vpnIp}` : `Connected — ${label(region)}`);
  } catch (e) {
    await showHUD(`Connect failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Connects using whichever region PIA already has selected, without changing it. */
export async function connectCurrent(): Promise<void> {
  await closeMainWindow({ clearRootSearch: true });

  const setup = await detectSetup();
  if (setup.stage !== "ready" || !setup.cliPath) {
    if (setup.appPath) void open(setup.appPath);
    await showHUD("PIA isn't ready — opening the app");
    return;
  }

  try {
    const before = await readConnectionState(setup.cliPath);
    if (before === "Connected") {
      const status = await readStatus(setup.cliPath);
      await showHUD(status.vpnIp ? `Already connected — ${status.vpnIp}` : "Already connected");
      return;
    }

    await showHUD("Connecting…");
    await connectOrExplain(setup.cliPath);
    const state = await waitForState(setup.cliPath, (s) => s === "Connected");
    if (state !== "Connected") {
      await showHUD(`Could not connect (${state})`);
      return;
    }

    const status = await readStatus(setup.cliPath);
    await showHUD(status.vpnIp ? `Connected — ${status.vpnIp}` : "PIA connected");
  } catch (e) {
    await showHUD(`Connect failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Disconnect, reporting only a state that was actually observed. */
export async function disconnectVpn(): Promise<void> {
  await closeMainWindow({ clearRootSearch: true });

  const setup = await detectSetup();
  if (setup.stage !== "ready" || !setup.cliPath) {
    if (setup.appPath) void open(setup.appPath);
    await showHUD("PIA isn't ready — opening the app");
    return;
  }

  try {
    await showHUD("Disconnecting…");
    await disconnect(setup.cliPath);
    const state = await waitForState(setup.cliPath, (s) => s === "Disconnected", { attempts: 20 });
    await showHUD(state === "Disconnected" ? "PIA disconnected" : `Could not disconnect (${state})`);
  } catch (e) {
    await showHUD(`Disconnect failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function toggleVpn(): Promise<void> {
  await closeMainWindow({ clearRootSearch: true });

  const setup = await detectSetup();
  if (setup.stage !== "ready" || !setup.cliPath) {
    if (setup.appPath) void open(setup.appPath);
    await showHUD("PIA isn't ready — opening the app");
    return;
  }

  try {
    const state = await readConnectionState(setup.cliPath);
    // Guessing here would connect a VPN the user asked to disconnect.
    if (state === "Unknown") {
      await showHUD("Could not read PIA status — is the app running?");
      return;
    }
    if (isActive(state)) {
      await showHUD("Disconnecting…");
      await disconnect(setup.cliPath);
      const next = await waitForState(setup.cliPath, (s) => s === "Disconnected", { attempts: 20 });
      await showHUD(next === "Disconnected" ? "PIA disconnected" : `Could not disconnect (${next})`);
      return;
    }

    await showHUD("Connecting…");
    await connectOrExplain(setup.cliPath);
    const next = await waitForState(setup.cliPath, (s) => s === "Connected");
    if (next !== "Connected") {
      await showHUD(`Could not connect (${next})`);
      return;
    }
    const status = await readStatus(setup.cliPath);
    await showHUD(status.vpnIp ? `Connected — ${status.vpnIp}` : "PIA connected");
  } catch (e) {
    await showHUD(`Failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
