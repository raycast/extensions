import { showToast, Toast } from "@raycast/api";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import { TimeUtils } from "./utils/time";

export default async function StopSession() {
  try {
    const currentSession = await Storage.getSession();
    if (!currentSession) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active session",
        message: "Start a study session first",
      });
      return;
    }

    const endTime = Date.now();
    const sessionWithEndTime = { ...currentSession, endTime };
    await Storage.setLastSession(sessionWithEndTime);

    const currentTeam = await Storage.getTeam();
    if (!currentTeam) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Team not found",
        message: "Unable to find your team data",
      });
      return;
    }

    const sessionMinutes = TimeUtils.getSessionDuration(currentSession.startTime, endTime);

    const message = await DiscordAPI.getMessage(currentTeam.webhookUrl, currentTeam.messageId);
    const currentMembers = TeamUtils.parseEmbed(message.embeds);

    const updatedMembers = TeamUtils.updateMember(currentMembers, currentSession.username, {
      isStudying: false,
      totalMinutes:
        (currentMembers.find((m) => m.username === currentSession.username)?.totalMinutes || 0) + sessionMinutes,
    });

    const updatedEmbed = TeamUtils.createEmbed(updatedMembers, currentTeam.teamName);
    await DiscordAPI.updateMessage(currentTeam.webhookUrl, currentTeam.messageId, undefined, [updatedEmbed]);

    await Storage.clearCurrentSession();

    await Storage.updateStats(sessionMinutes, 1);

    await showToast({
      style: Toast.Style.Success,
      title: "Session completed! 🎉",
      message: `Added ${TimeUtils.formatDuration(sessionMinutes)} to your total`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop session",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
