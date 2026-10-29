import { Alert, Icon, closeMainWindow, confirmAlert, showHUD } from "@raycast/api";
import { getPreferences, getStatus, leaveMeeting } from "./mutedeck";
import { errorHud } from "./run-toggle";

export default async function command() {
  try {
    const status = await getStatus();
    if (status.call !== "active") {
      await closeMainWindow();
      await showHUD("👋 No active call to leave");
      return;
    }
    if (getPreferences().confirmLeave) {
      const confirmed = await confirmAlert({
        title: "Leave Meeting?",
        message: "MuteDeck will leave the current meeting.",
        icon: Icon.Logout,
        primaryAction: { title: "Leave", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) {
        return;
      }
    }
    await leaveMeeting();
    await closeMainWindow();
    await showHUD("👋 Left the meeting");
  } catch (e) {
    await closeMainWindow();
    await showHUD(errorHud(e));
  }
}
