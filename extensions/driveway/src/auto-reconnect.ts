import { environment, getPreferenceValues, LaunchType, showToast, Toast } from "@raycast/api";
import { buildShare } from "./lib/share";
import { connectShare, findMountedShare, listMountedShares } from "./lib/mount";
import { getServers } from "./lib/storage";
import { dueToRun, markRun } from "./lib/throttle";
import { mountsInFlight } from "./lib/in-flight";

const LAST_RUN_KEY = "auto-reconnect-last-run";

// Scheduled runs are silent, touch only opted-in entries, never unmount.
// The manifest interval can't read a preference, so it ticks at 5m and
// dueToRun() enforces the real cadence. Manual runs skip it and toast.
export default async function command() {
  const isManual = environment.launchType === LaunchType.UserInitiated;
  const { pref_auto_reconnect_interval: intervalPref } = getPreferenceValues<Preferences.AutoReconnect>();
  const intervalMinutes = parseInt(intervalPref, 10);

  const due = await dueToRun(LAST_RUN_KEY, intervalMinutes);
  if (!due) {
    if (!isManual) return;
    await markRun(LAST_RUN_KEY);
  }

  const servers = await getServers();
  const candidates = servers.filter((server) => server.autoMount && server.path?.trim());
  if (!candidates.length) {
    if (isManual) {
      await showToast({ title: "No drives have Auto-Reconnect enabled", style: Toast.Style.Success });
    }
    return;
  }

  const mounted = await listMountedShares();
  // Mounting a share the menu bar is already mounting would attach it twice.
  const inFlight = await mountsInFlight();
  let reconnected = 0;
  let alreadyConnected = 0;
  let failed = 0;

  for (const server of candidates) {
    if (findMountedShare(mounted, server) || inFlight.has(server.id)) {
      alreadyConnected++;
      continue;
    }

    try {
      const share = buildShare(server);
      await connectShare(share);
      reconnected++;
    } catch {
      // Offline, no cached password, bad entry: all mean "try again next tick".
      failed++;
    }
  }

  if (isManual) {
    const failedMessage = failed ? `${failed} unreachable or need a fresh password` : undefined;
    let title: string;
    if (reconnected === 0 && failed === 0) {
      title = alreadyConnected === 1 ? "Already connected" : `All ${alreadyConnected} already connected`;
    } else if (failed === 0) {
      title = reconnected === 1 ? "Reconnected 1 drive" : `Reconnected ${reconnected} drives`;
    } else if (reconnected === 0) {
      title = "Couldn't reconnect";
    } else {
      title = `Reconnected ${reconnected}, ${failed} failed`;
    }

    await showToast({
      title,
      message: failedMessage,
      style: reconnected === 0 && failed > 0 ? Toast.Style.Failure : Toast.Style.Success,
    });
  }
}
