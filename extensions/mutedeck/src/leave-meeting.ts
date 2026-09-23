import { Alert, Icon, closeMainWindow, confirmAlert, showHUD } from "@raycast/api";
import { MuteDeckOffline, getPreferences, getStatus, leaveMeeting } from "./mutedeck";

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
    await showHUD(e instanceof MuteDeckOffline ? "⚠️ MuteDeck isn't running" : "⚠️ MuteDeck error");
  }
}
