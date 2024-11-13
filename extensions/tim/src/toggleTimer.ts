import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { isNoActiveTaskError, isNoActiveTimerToToggleError } from "./helpers/error";
import { getActiveTask, installedWrapper, toggleTimer } from "./lib/tim";

export default installedWrapper(async () => {
  try {
    await toggleTimer();
    const id = await getActiveTask();
    await showToast({ title: id ? "Timer stopped" : "Timer started", style: Toast.Style.Success });
  } catch (error) {
    if (isNoActiveTimerToToggleError(error)) {
      return showToast({ title: "No active timer to toggle", style: Toast.Style.Failure });
    }

    if (isNoActiveTaskError(error)) {
      return showToast({ title: "No active task", style: Toast.Style.Failure });
    }

    await showFailureToast(error);
  }
});
