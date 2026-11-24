import { Alert, closeMainWindow, confirmAlert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { resetSpaceTabs } from "./cra";

export default async function command() {
  const confirmed = await confirmAlert({
    title: "Reset all tabs in the current space?",
    message: "Cra closes the unpinned tabs of the active space and returns pinned tabs to their original pages.",
    primaryAction: { title: "Reset Tabs", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }

  try {
    await closeMainWindow();
    await resetSpaceTabs();
  } catch (error) {
    await showFailureToast(error, { title: "Failed to reset tabs in the current space" });
  }
}
