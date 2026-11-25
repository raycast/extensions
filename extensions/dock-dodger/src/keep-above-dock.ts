import { LaunchType, LocalStorage, environment, showHUD, updateCommandMetadata } from "@raycast/api";
import { friendlyError, isPermissionError, liftWindows } from "./lib/lift";

const BLOCKED_KEY = "blockedByPermissions";

// Runs every 10s once activated (see "interval" in package.json).
// Silent in the background; only talks when you run it by hand. If access is
// revoked while it runs in the background, the subtitle in root search says so.
export default async function Command() {
  const manual = environment.launchType === LaunchType.UserInitiated;
  try {
    const { ok, failed } = await liftWindows();
    await setBlocked(false);
    if (manual) {
      if (ok) await showHUD(`Lifted ${ok}, now watching every 10s`);
      else if (failed.length) await showHUD(`Watching every 10s, couldn't move ${[...new Set(failed)].join(", ")}`);
      else await showHUD("Watching the Dock every 10s");
    }
  } catch (error) {
    if (isPermissionError(error)) await setBlocked(true);
    if (manual) await showHUD(friendlyError(error));
    else console.error(error);
  }
}

// Only touches the metadata when the state flips, not on every 10s run.
async function setBlocked(blocked: boolean) {
  const was = (await LocalStorage.getItem<boolean>(BLOCKED_KEY)) ?? false;
  if (was === blocked) return;
  if (blocked) await LocalStorage.setItem(BLOCKED_KEY, true);
  else await LocalStorage.removeItem(BLOCKED_KEY);
  await updateCommandMetadata({ subtitle: blocked ? "Paused: run to fix permissions" : null });
}
