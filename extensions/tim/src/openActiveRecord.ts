import { Toast, captureException, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { getActiveTask, installedWrapper, openActiveRecord } from "./lib/tim";

export default installedWrapper(async () => {
  try {
    const id = await getActiveTask();
    if (!id) {
      return showToast({
        title: "No active task",
        style: Toast.Style.Failure,
      });
    }

    await openActiveRecord();
  } catch (error) {
    captureException(error);
    await showFailureToast(error, { title: "Failed to open active record" });
  }
});
