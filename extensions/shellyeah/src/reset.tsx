import { Alert, closeMainWindow, confirmAlert, LocalStorage, showHUD } from "@raycast/api";

export default async function Command() {
  const confirmed = await confirmAlert({
    title: "Reset All Preferences",
    message: "This will clear your API key and shell preferences. Continue?",
    primaryAction: {
      title: "Reset",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (confirmed) {
    try {
      await LocalStorage.clear();
      await LocalStorage.setItem("needsOnboarding", "true");
      await showHUD("Preferences reset successfully");
    } catch (error) {
      await showHUD("Error resetting preferences");
      console.error(error);
    }
  }

  await closeMainWindow();
}
