import { Toast } from "@raycast/api";
import { getInstallStatus, openPreferences } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function () {
  const toast = new Toast({
    title: "Opening preferences",
    style: Toast.Style.Animated,
  });

  await toast.show();

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  await openPreferences();
}
