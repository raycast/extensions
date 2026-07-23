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
 * Connect, translating PIA's idle-daemon failure into something actionable.
 *
 * This deliberately does NOT switch on background mode by itself: that is a
 * persistent change to how the user's VPN behaves when the app is closed
 * (it also keeps the killswitch alive), and an extension must not silently
 * reconfigure a security tool. Surface it and let the user decide.
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

/**
 * Select a region and connect. `piactl connect` also re-applies settings on an
 * already-active tunnel, so switching regions needs no explicit disconnect.
 */
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

    // Any already-active tunnel — connected or still connecting toward a
    // different region — has to be observed cycling before a "Connected"
    // reading means anything. Otherwise the in-flight connection completing
    // would be reported as success for the region just requested.
    //
    // piactl exposes the *selected* region, not the connected one, so there is
    // no way to confirm the endpoint directly; observing the transition is the
    // strongest signal available.
    const state = isActive(before)
      ? await waitForReconnect(setup.cliPath)
      : await waitForState(setup.cliPath, (s) => s === "Connected");
    if (state !== "Connected") {
      await showHUD(`Could not connect (${state})`);
      return;
    }

    // Recorded only after the tunnel is confirmed up. Storing it earlier would
    // let a failed attempt become the target of "Connect Most Recent",
    // displacing the last region that actually worked.
    await rememberRecent(region);

    // Report the tunnel address, not `pubip` — that one still shows the user's
    // real ISP address while connected.
    const status = await readStatus(setup.cliPath);
    await showHUD(
      status.vpnIp
        ? `Connected — ${label(region)} · ${status.vpnIp}`
        : `Connected — ${label(region)}`,
    );
  } catch (e) {
    await showHUD(
      `Connect failed: ${e instanceof Error ? e.message : String(e)}`,
    );
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
    // Never guess which way to toggle. Treating an unreadable state as "off"
    // would connect a VPN the user asked to disconnect.
    if (state === "Unknown") {
      await showHUD("Could not read PIA status — is the app running?");
      return;
    }
    if (isActive(state)) {
      await showHUD("Disconnecting…");
      await disconnect(setup.cliPath);
      const next = await waitForState(
        setup.cliPath,
        (s) => s === "Disconnected",
        { attempts: 20 },
      );
      await showHUD(
        next === "Disconnected"
          ? "PIA disconnected"
          : `Could not disconnect (${next})`,
      );
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
    await showHUD(
      status.vpnIp ? `Connected — ${status.vpnIp}` : "PIA connected",
    );
  } catch (e) {
    await showHUD(`Failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
