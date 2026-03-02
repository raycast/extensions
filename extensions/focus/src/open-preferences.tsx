import { Toast } from "@raycast/api";
import { openPreferences } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function () {
  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const toast = new Toast({
    title: "Opening preferences",
    style: Toast.Style.Animated,
  });

  await toast.show();

  await openPreferences();
}
