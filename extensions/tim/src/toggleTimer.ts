import { showToast, Toast } from "@raycast/api";
import { installedWrapper, toggleTimer } from "./lib/tim";

export default installedWrapper(async () => {
  try {
    await toggleTimer();
    await showToast({
      title: "Success",
      message: "Timer toggled",
      style: Toast.Style.Success,
    });
  } catch (error) {
    showToast({
      title: "Error",
      message: "Could not toggle timer",
      style: Toast.Style.Failure,
    });
  }
});
