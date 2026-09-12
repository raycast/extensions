import { showToast, Toast } from "@raycast/api";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import type { StudySession } from "./types";

export default async function StartSession() {
  try {
    const currentTeam = await Storage.getTeam();
    if (!currentTeam) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No team found",
        message: "Please join a team first",
      });
      return;
    }

    const username = await Storage.getUsername();
    if (!username) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Username not set",
        message: "Please join a team first to set your username",
      });
      return;
    }

    const currentSession = await Storage.getSession();
    if (currentSession) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Session already active",
        message: "Stop your current session before starting a new one",
      });
      return;
    }

    const startTime = Date.now();

    const message = await DiscordAPI.getMessage(currentTeam.webhookUrl, currentTeam.messageId);
    const currentMembers = TeamUtils.parseEmbed(message.embeds);

    const updatedMembers = TeamUtils.updateMember(currentMembers, username, {
      isStudying: true,
      studyStartTime: startTime,
    });

    const updatedEmbed = TeamUtils.createEmbed(updatedMembers, currentTeam.teamName);
    await DiscordAPI.updateMessage(currentTeam.webhookUrl, currentTeam.messageId, undefined, [updatedEmbed]);

    const session: StudySession = {
      username,
      startTime,
    };
    await Storage.setSession(session);

    await showToast({
      style: Toast.Style.Success,
      title: "Study session started! 📚",
      message: "Your team can see you're studying now",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start session",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
