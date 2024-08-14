import { Toast, captureException, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getActiveTask, installedWrapper, toggleTimer } from "./lib/tim";

export default installedWrapper(async () => {
  try {
    await toggleTimer();
    const id = await getActiveTask();
    await showToast({ title: id ? "Timer stopped" : "Timer started", style: Toast.Style.Success });
  } catch (error) {
    captureException(error);
    await showFailureToast(error);
  }
});
