import { Toast, showToast } from "@raycast/api";

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
    showToast({
      title: "Active record could be opened",
      style: Toast.Style.Failure,
    });
  }
});
