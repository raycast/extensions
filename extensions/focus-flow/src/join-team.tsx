import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import { showFailureToast } from "@raycast/utils";

interface FormValues {
  teamCode: string;
  username: string;
}

export default function JoinTeam() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if (!values.teamCode.trim() || !values.username.trim()) {
      await showFailureToast("Missing Required Fields", {
        title: "Please fill in team code and username",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { messageId, webhookUrl } = TeamUtils.parseTeamCode(values.teamCode.trim());
      const username = values.username.trim();

      const message = await DiscordAPI.getMessage(webhookUrl, messageId);
      const members = TeamUtils.parseEmbed(message.embeds);

      const updatedMembers = TeamUtils.addMember(members, username);

      const teamName = message.embeds[0]?.title?.replace("📚 ", "").replace(" Study Leaderboard", "") || "Study Team";

      const embed = TeamUtils.createEmbed(updatedMembers, teamName);

      await DiscordAPI.updateMessage(webhookUrl, messageId, undefined, [embed]);

      await Storage.setTeam({
        messageId,
        webhookUrl,
        teamName,
        isCreator: false,
        createdAt: Date.now(),
      });
      await Storage.setUsername(username);
      await Storage.clearCurrentSession();
      await Storage.clearUserStats();

      await showToast({
        style: Toast.Style.Success,
        title: "Successfully Joined Team! 🎉",
        message: `Welcome to ${teamName}, ${username}!`,
      });

      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Join Team" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Join Study Team"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Join Team" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Join an existing study team using the team code shared by your team leader." />

      <Form.TextField
        id="teamCode"
        title="Team Code"
        placeholder="Paste team code here..."
        info="Get this from your team leader who created the team"
      />

      <Form.TextField
        id="username"
        title="Your Username"
        placeholder="Enter your display name"
        info="This will be your display name in the leaderboard"
      />
    </Form>
  );
}
