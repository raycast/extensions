import { useState, useEffect } from "react";
import { List, showToast, Toast, ActionPanel, Action, Icon, Color, launchCommand, LaunchType } from "@raycast/api";
import { Storage } from "./utils/storage";
import { DiscordAPI } from "./utils/discord";
import { TeamUtils } from "./utils/team";
import { TimeUtils } from "./utils/time";
import type { UserStats, StudySession, TeamData } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function MyStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [displayTime, setDisplayTime] = useState("0m");

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (session) {
      const interval = setInterval(() => {
        setDisplayTime(TimeUtils.formatSessionTime(session.startTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  async function loadStats() {
    try {
      setIsLoading(true);
      const [currentStats, currentSession, currentTeam] = await Promise.all([
        Storage.getStats(),
        Storage.getSession(),
        Storage.getTeam(),
      ]);

      setStats(currentStats);
      setSession(currentSession);
      setTeam(currentTeam);

      if (currentSession) {
        setDisplayTime(TimeUtils.formatSessionTime(currentSession.startTime));
      }

      if (currentTeam) {
        try {
          const username = await Storage.getUsername();
          const message = await DiscordAPI.getMessage(currentTeam.webhookUrl, currentTeam.messageId);
          const members = TeamUtils.parseEmbed(message.embeds);

          const sortedMembers = [...members].sort((a, b) => b.totalMinutes - a.totalMinutes);

          if (username) {
            const userRank = sortedMembers.findIndex((m) => m.username === username) + 1;
            setRank(userRank > 0 ? userRank : null);
          }

          setTotalMembers(members.length);
        } catch (error) {
          await showFailureToast(error, { title: "Failed to load team data" });
        }
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Load Stats" });
    } finally {
      setIsLoading(false);
    }
  }

  async function startSession() {
    try {
      const username = await Storage.getUsername();
      const currentTeam = await Storage.getTeam();

      if (!username || !currentTeam) {
        await showFailureToast("Setup Required", { title: "Please join a team first to start studying" });
        return;
      }

      const newSession: StudySession = {
        startTime: Date.now(),
        username,
      };

      try {
        const message = await DiscordAPI.getMessage(currentTeam.webhookUrl, currentTeam.messageId);
        const members = TeamUtils.parseEmbed(message.embeds);
        const updatedMembers = TeamUtils.updateMember(members, username, {
          isStudying: true,
          studyStartTime: Date.now(),
        });
        const embed = TeamUtils.createEmbed(updatedMembers, currentTeam.teamName);

        await DiscordAPI.updateMessage(currentTeam.webhookUrl, currentTeam.messageId, undefined, [embed]);
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update Discord" });
      }

      await Storage.setSession(newSession);
      setSession(newSession);

      await showToast({
        style: Toast.Style.Success,
        title: "Study Session Started! 📚",
        message: "Your team can see you're studying now",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Start Session" });
    }
  }

  async function stopSession() {
    if (!session) return;

    try {
      const endTime = Date.now();
      const sessionWithEndTime = { ...session, endTime };
      await Storage.setLastSession(sessionWithEndTime);

      const sessionMinutes = TimeUtils.getSessionDuration(session.startTime, endTime);
      const currentTeam = await Storage.getTeam();

      await Storage.updateStats(sessionMinutes, 1);

      if (currentTeam) {
        try {
          const message = await DiscordAPI.getMessage(currentTeam.webhookUrl, currentTeam.messageId);
          const members = TeamUtils.parseEmbed(message.embeds);
          const member = members.find((m) => m.username === session.username);

          if (member) {
            const updatedMembers = TeamUtils.updateMember(members, session.username, {
              totalMinutes: member.totalMinutes + sessionMinutes,
              isStudying: false,
              studyStartTime: undefined,
            });
            const embed = TeamUtils.createEmbed(updatedMembers, currentTeam.teamName);

            await DiscordAPI.updateMessage(currentTeam.webhookUrl, currentTeam.messageId, undefined, [embed]);
          }
        } catch (error) {
          await showFailureToast(error, { title: "Failed to update Discord" });
        }
      }

      await Storage.clearCurrentSession();
      setSession(null);

      const updatedStats = await Storage.getStats();
      setStats(updatedStats);

      await showToast({
        style: Toast.Style.Success,
        title: "Session Completed! 🎉",
        message: `Added ${TimeUtils.formatDuration(sessionMinutes)} to your total`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Stop Session" });
    }
  }

  function getRankDisplay(rank: number, total: number): string {
    const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
    return `${rank}${suffix} of ${total}`;
  }

  function getRankColor(rank: number): Color {
    if (rank === 1) return Color.Yellow;
    if (rank <= 3) return Color.Orange;
    return Color.SecondaryText;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="My Study Stats"
      searchBarPlaceholder="Search stats..."
      actions={
        <ActionPanel>
          <Action title="Refresh Stats" onAction={loadStats} icon={Icon.ArrowClockwise} />
          {session ? (
            <Action title="Stop Session" onAction={stopSession} icon={Icon.Stop} />
          ) : (
            <>
              <Action title="Start Session" onAction={startSession} icon={Icon.Play} />
              <Action
                title="Modify Last Session"
                onAction={() => launchCommand({ name: "modify-session", type: LaunchType.UserInitiated })}
                icon={Icon.Pencil}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <List.Section title="Current Status">
        {session ? (
          <List.Item
            title="Currently Studying"
            subtitle={`Started ${displayTime} ago`}
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            accessories={[{ text: "Active 📚" }]}
            actions={
              <ActionPanel>
                <Action title="Stop Session" onAction={stopSession} icon={Icon.Stop} />
                <Action title="Refresh Stats" onAction={loadStats} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            title="Not Studying"
            subtitle="Start a session to track your time"
            icon={{ source: Icon.Pause, tintColor: Color.SecondaryText }}
            actions={
              <ActionPanel>
                <Action title="Start Session" onAction={startSession} icon={Icon.Play} />
                <Action title="Refresh Stats" onAction={loadStats} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Personal Statistics">
        {stats ? (
          <>
            <List.Item
              title="Total Study Time"
              subtitle={TimeUtils.formatDuration(stats.totalMinutes)}
              icon={{ source: Icon.Clock, tintColor: Color.Blue }}
            />

            <List.Item
              title="Sessions Today"
              subtitle={`${stats.sessionsToday} sessions completed`}
              icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
            />

            <List.Item
              title="Total Sessions"
              subtitle={`${stats.totalSessions} sessions all time`}
              icon={{ source: Icon.BarChart, tintColor: Color.Green }}
            />

            <List.Item
              title="Longest Session"
              subtitle={TimeUtils.formatDuration(stats.longestSession)}
              icon={{ source: Icon.Trophy, tintColor: Color.Orange }}
            />

            <List.Item
              title="Last Study Date"
              subtitle={stats.lastStudyDate}
              icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
            />

            {rank && (
              <List.Item
                title="Team Rank"
                subtitle={getRankDisplay(rank, totalMembers)}
                icon={{ source: Icon.Trophy, tintColor: getRankColor(rank) }}
              />
            )}
          </>
        ) : (
          <List.Item
            title="No Stats Available"
            subtitle="Start studying to build your statistics"
            icon={{ source: Icon.QuestionMark, tintColor: Color.SecondaryText }}
          />
        )}
      </List.Section>

      <List.Section title="Team Information">
        {team ? (
          <>
            <List.Item
              title={team.teamName}
              subtitle={`${totalMembers} members • ${team.isCreator ? "Creator" : "Member"}`}
              icon={{ source: Icon.Person, tintColor: Color.Blue }}
            />
            <List.Item
              title="Team Created"
              subtitle={new Date(team.createdAt).toLocaleDateString()}
              icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
            />
          </>
        ) : (
          <List.Item
            title="No Team"
            subtitle="Join a team to see team statistics"
            icon={{ source: Icon.PersonCircle, tintColor: Color.SecondaryText }}
          />
        )}
      </List.Section>
    </List>
  );
}
