import { showHUD } from "@raycast/api";
import { friendlyError, liftWindows } from "./lib/lift";

export default async function Command() {
  try {
    const { planned, ok, failed } = await liftWindows();
    if (planned.length === 0) {
      await showHUD("Nothing hiding behind the Dock");
    } else if (ok === 0) {
      await showHUD(
        failed.length ? `Couldn't move ${[...new Set(failed)].join(", ")}` : "Windows moved, left them alone",
      );
    } else {
      await showHUD(`Lifted ${ok} window${ok === 1 ? "" : "s"} above the Dock`);
    }
  } catch (error) {
    await showHUD(friendlyError(error));
  }
}
