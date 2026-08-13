import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { isConversionRunning, requestStop } from "./utils/stop-signal";

export default async function Command() {
  if (!(await isConversionRunning())) {
    // A no-view toast renders its title only, so the whole message goes there.
    await showToast(Toast.Style.Failure, "No conversion is running");
    return;
  }
  await requestStop();
  await closeMainWindow().catch(() => {});
  await showToast(Toast.Style.Success, "Stopping — the current file finishes, the rest is skipped");
}
