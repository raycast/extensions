import { useState, useEffect } from "react";
import { List, showToast, Toast, ActionPanel, Action, Icon, Color, Alert, confirmAlert } from "@raycast/api";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import type { TeamData, TeamMember } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function TeamSettings() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, []);

  async function loadTeamData() {
    try {
      setIsLoading(true);
      const currentTeam = await Storage.getTeam();
      if (!currentTeam) {
        await showFailureToast("No Team Found", { title: "Please join a team first" });
        return;
      }

      setTeam(currentTeam);

      const message = await DiscordAPI.getMessage(currentTeam.webhookUrl, currentTeam.messageId);
      const teamMembers = TeamUtils.parseEmbed(message.embeds);
      setMembers(teamMembers);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Load Team Data" });
    } finally {
      setIsLoading(false);
    }
  }

  async function resetAllTimes() {
    if (!team) return;

    const confirmed = await confirmAlert({
      title: "Reset All Study Times",
      message: "This will reset all team members' study times to 0 minutes. This action cannot be undone.",
      primaryAction: {
        title: "Reset All Times",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const resetMembers = TeamUtils.resetAllTimes(members);
      const embed = TeamUtils.createEmbed(resetMembers, team.teamName);

      await DiscordAPI.updateMessage(team.webhookUrl, team.messageId, undefined, [embed]);

      const username = await Storage.getUsername();
      if (username) {
        await Storage.setStats({
          username,
          totalMinutes: 0,
          sessionsToday: 0,
          lastStudyDate: new Date().toDateString(),
          longestSession: 0,
          totalSessions: 0,
        });
      }

      setMembers(resetMembers);

      await showToast({
        style: Toast.Style.Success,
        title: "Times Reset Successfully",
        message: "All team members' study times have been reset to 0",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Reset Times" });
    }
  }

  async function leaveTeam() {
    const confirmed = await confirmAlert({
      title: "Leave Team",
      message: "Are you sure you want to leave this team?",
      primaryAction: {
        title: "Leave Team",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await Storage.clearTeam();
      await showToast({
        style: Toast.Style.Success,
        title: "Left Team Successfully",
        message: "You have left the team. You can join another team anytime.",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Leave Team" });
    }
  }

  if (!team?.isCreator) {
    return (
      <List navigationTitle="Team Settings">
        <List.EmptyView
          title="You are not authorised to edit this team"
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action
                title="Leave Team"
                onAction={leaveTeam}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Team Settings"
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={loadTeamData} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    >
      <List.Section title="Team Information">
        <List.Item
          title={team.teamName}
          subtitle="Team Name"
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          accessories={[{ text: "Creator" }]}
        />
        <List.Item
          title={`${members.length} members`}
          subtitle="Team Size"
          icon={{ source: Icon.Person, tintColor: Color.Green }}
          accessories={[{ text: `${10 - members.length} slots available` }]}
        />
        <List.Item
          title={new Date(team.createdAt).toLocaleDateString()}
          subtitle="Created On"
          icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
        />
      </List.Section>

      <List.Section title="Danger Zone">
        <List.Item
          title="Reset All Study Times"
          subtitle="Reset all members' times to 0 minutes"
          icon={{ source: Icon.Trash, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action
                title="Reset All Times"
                onAction={resetAllTimes}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
              />
              <Action title="Refresh" onAction={loadTeamData} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Leave Team"
          subtitle="Leave this team and lose creator privileges"
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Leave Team"
                onAction={leaveTeam}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
              />
              <Action title="Refresh" onAction={loadTeamData} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
