import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import { TimeUtils } from "./utils/time";
import type { TeamMember } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function Leaderboard() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState("Study Team");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    const username = await Storage.getUsername();
    setCurrentUser(username);
  }

  async function loadLeaderboard() {
    try {
      const team = await Storage.getTeam();
      if (!team) {
        await showFailureToast("No Team Found", { title: "Please join a team first to view the leaderboard" });
        return;
      }

      const message = await DiscordAPI.getMessage(team.webhookUrl, team.messageId);
      const teamMembers = TeamUtils.parseEmbed(message.embeds);

      const sorted = teamMembers.sort((a, b) => b.totalMinutes - a.totalMinutes);

      setMembers(sorted);
      setTeamName(team.teamName);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Load Leaderboard" });
    } finally {
      setIsLoading(false);
    }
  }

  function getRankEmoji(index: number): string {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `${index + 1}.`;
    }
  }

  function getMemberIcon(member: TeamMember): { source: Icon; tintColor: Color } {
    if (member.username === currentUser) {
      return { source: Icon.Person, tintColor: Color.Green };
    }
    if (member.isStudying) {
      return { source: Icon.Book, tintColor: Color.Blue };
    }
    return { source: Icon.Person, tintColor: Color.SecondaryText };
  }

  function getMemberSubtitle(member: TeamMember): string {
    if (member.isStudying && member.studyStartTime) {
      const timeAgo = TimeUtils.formatRelativeTime(member.studyStartTime);
      return `📚 Currently studying • Started ${timeAgo}`;
    }
    return "";
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${teamName} Leaderboard`}
      searchBarPlaceholder="Search team members..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh Leaderboard"
            onAction={loadLeaderboard}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {members.length === 0 ? (
        <List.EmptyView
          title="No Team Members Yet"
          description="Invite others to join your study team!"
          icon="📚"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadLeaderboard} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        members.map((member, index) => (
          <List.Item
            key={member.username}
            title={member.username}
            subtitle={getMemberSubtitle(member)}
            accessories={[{ text: TimeUtils.formatDuration(member.totalMinutes) }, { text: getRankEmoji(index) }]}
            icon={getMemberIcon(member)}
            actions={
              <ActionPanel>
                <Action title="Refresh Leaderboard" onAction={loadLeaderboard} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
