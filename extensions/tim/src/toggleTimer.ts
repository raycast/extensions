import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { installedWrapper, toggleTimer } from "./lib/tim";

export default installedWrapper(async () => {
  try {
    await toggleTimer();
    await showHUD("Active task toggled", { clearRootSearch: true });
  } catch (error) {
    showFailureToast(error);
  }
});
