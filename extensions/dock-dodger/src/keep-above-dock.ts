import { LaunchType, environment, showHUD } from "@raycast/api";
import { friendlyError, liftWindows } from "./lib/lift";

// Runs every 10s once activated (see "interval" in package.json).
// Silent in the background; only talks when you run it by hand.
export default async function Command() {
  const manual = environment.launchType === LaunchType.UserInitiated;
  try {
    const { ok } = await liftWindows();
    if (manual) {
      await showHUD(ok ? `Lifted ${ok}, now watching every 10s` : "Watching the Dock every 10s");
    }
  } catch (error) {
    if (manual) await showHUD(friendlyError(error));
    else console.error(error);
  }
}
