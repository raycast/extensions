import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Clipboard } from "@raycast/api";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import { showFailureToast } from "@raycast/utils";

interface FormValues {
  webhookUrl: string;
  teamName: string;
  username: string;
}

export default function CreateTeam() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if (!values.webhookUrl.trim() || !values.username.trim()) {
      await showFailureToast("Missing Required Fields", {
        title: "Please fill in webhook URL and username",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!values.webhookUrl.includes("discord.com/api/webhooks/")) {
        throw new Error("Invalid Discord webhook URL format");
      }

      const teamName = values.teamName.trim() || "Study Team";
      const username = values.username.trim();

      const initialMembers = [{ username, totalMinutes: 0, isStudying: false }];
      const embed = TeamUtils.createEmbed(initialMembers, teamName);

      const message = await DiscordAPI.sendMessage(values.webhookUrl, undefined, [embed]);

      await Storage.clearAll();

      const teamData = {
        messageId: message.id,
        webhookUrl: values.webhookUrl,
        teamName,
        isCreator: true,
        createdAt: Date.now(),
      };

      await Storage.setTeam(teamData);
      await Storage.setUsername(username);

      const teamCode = TeamUtils.generateTeamCode(message.id, values.webhookUrl);
      await Clipboard.copy(teamCode);

      await showToast({
        style: Toast.Style.Success,
        title: "Team Created Successfully! 🎉",
        message: "Team code copied to clipboard. Share it with your teammates!",
      });

      pop();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to Create Team",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Study Team"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Team" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new study team with Discord integration. You'll automatically be added as the team creator." />

      <Form.TextField
        id="webhookUrl"
        title="Discord Webhook URL"
        placeholder="https://discord.com/api/webhooks/..."
        info="Create a webhook in your Discord server settings → Integrations → Webhooks"
      />

      <Form.TextField
        id="teamName"
        title="Team Name"
        placeholder="My Study Team"
        defaultValue="Study Team"
        info="Choose a name for your study team"
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
