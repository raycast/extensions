import { ActionPanel, Action, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import { TimeUtils } from "./utils/time";
import type { StudySession } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function ModifySession() {
  const [lastSession, setLastSession] = useState<StudySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLastSession() {
      const session = await Storage.getLastSession();
      setLastSession(session);
      setIsLoading(false);
    }
    fetchLastSession();
  }, []);

  async function handleSubmit(values: { minutes?: string; delete?: boolean }) {
    if (!lastSession) {
      await showFailureToast("No last session found to modify.");
      return;
    }

    if (values.delete) {
      await handleDelete();
      return;
    }

    const minutesToShorten = parseInt(values.minutes || "0", 10);
    if (isNaN(minutesToShorten) || minutesToShorten <= 0) {
      await showFailureToast("Invalid number of minutes.", { title: "Please enter a positive number." });
      return;
    }

    const originalDuration = TimeUtils.getSessionDuration(lastSession.startTime, lastSession.endTime);
    if (minutesToShorten > originalDuration) {
      await showFailureToast("Cannot shorten more than the session length.", {
        title: `Session was ${originalDuration} minutes long.`,
      });
      return;
    }

    await handleShorten(minutesToShorten);
  }

  async function handleShorten(minutesToShorten: number) {
    if (!lastSession) return;

    try {
      await showToast(Toast.Style.Animated, "Shortening session...");

      const team = await Storage.getTeam();
      const stats = await Storage.getStats();

      if (team && stats) {
        const message = await DiscordAPI.getMessage(team.webhookUrl, team.messageId);
        const members = TeamUtils.parseEmbed(message.embeds);
        const member = members.find((m) => m.username === stats.username);

        if (member) {
          const updatedMembers = TeamUtils.updateMember(members, stats.username, {
            totalMinutes: member.totalMinutes - minutesToShorten,
          });
          const embed = TeamUtils.createEmbed(updatedMembers, team.teamName);
          await DiscordAPI.updateMessage(team.webhookUrl, team.messageId, undefined, [embed]);
        }
      }

      await Storage.updateStats(-minutesToShorten, 0); // Only adjust time, not session count
      await Storage.clearLastSession();

      await showToast(Toast.Style.Success, "Session shortened successfully!");
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to shorten session" });
    }
  }

  async function handleDelete() {
    if (!lastSession) return;

    try {
      await showToast(Toast.Style.Animated, "Deleting session...");

      const originalDuration = TimeUtils.getSessionDuration(lastSession.startTime, lastSession.endTime);
      const team = await Storage.getTeam();
      const stats = await Storage.getStats();

      if (team && stats) {
        const message = await DiscordAPI.getMessage(team.webhookUrl, team.messageId);
        const members = TeamUtils.parseEmbed(message.embeds);
        const member = members.find((m) => m.username === stats.username);

        if (member) {
          const updatedMembers = TeamUtils.updateMember(members, stats.username, {
            totalMinutes: member.totalMinutes - originalDuration,
          });
          const embed = TeamUtils.createEmbed(updatedMembers, team.teamName);
          await DiscordAPI.updateMessage(team.webhookUrl, team.messageId, undefined, [embed]);
        }
      }

      await Storage.updateStats(-originalDuration, -1); // Adjust time and session count
      await Storage.clearLastSession();

      await showToast(Toast.Style.Success, "Session deleted successfully!");
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete session" });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (!lastSession) {
    return (
      <Form>
        <Form.Description text="No previous session found to modify." />
      </Form>
    );
  }

  const sessionDuration = TimeUtils.getSessionDuration(lastSession.startTime, lastSession.endTime);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten Session" onSubmit={handleSubmit} />
          <Action.SubmitForm title="Delete Session" onSubmit={() => handleSubmit({ delete: true })} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Your last session was ${sessionDuration} minutes long.`} />
      <Form.TextField id="minutes" title="Shorten by (minutes)" placeholder="e.g., 10" />
      <Form.Separator />
      <Form.Checkbox id="delete" label="Delete the entire session" defaultValue={false} />
    </Form>
  );
}
