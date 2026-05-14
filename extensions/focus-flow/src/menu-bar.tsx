import { useState, useEffect } from "react";
import { MenuBarExtra, LaunchType, launchCommand } from "@raycast/api";
import { Storage } from "./utils/storage";
import { TimeUtils } from "./utils/time";
import type { StudySession, UserStats, TeamData } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function MenuBar() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayTime, setDisplayTime] = useState("0m");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (session) {
      const interval = setInterval(() => {
        setDisplayTime(TimeUtils.formatSessionTime(session.startTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  async function loadData() {
    try {
      setIsLoading(true);
      const [currentSession, currentStats, currentTeam] = await Promise.all([
        Storage.getSession(),
        Storage.getStats(),
        Storage.getTeam(),
      ]);

      setSession(currentSession);
      setStats(currentStats);
      setTeam(currentTeam);

      if (currentSession) {
        setDisplayTime(TimeUtils.formatSessionTime(currentSession.startTime));
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load data" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartSession() {
    await launchCommand({ name: "start-session", type: LaunchType.UserInitiated });
    await loadData();
  }

  async function handleStopSession() {
    await launchCommand({ name: "stop-session", type: LaunchType.UserInitiated });
    await loadData();
  }

  function getMenuBarTitle(): string {
    if (isLoading) return "⏳";
    if (session) {
      return displayTime;
    }
    return "";
  }

  function getMenuBarTooltip(): string {
    if (session) {
      return `FocusFlow - Focusing for ${displayTime}`;
    }
    return "FocusFlow - Team Focus Tracker";
  }

  return (
    <MenuBarExtra icon="📚" title={getMenuBarTitle()} tooltip={getMenuBarTooltip()}>
      <MenuBarExtra.Section title="Focus Session">
        {session ? (
          <>
            <MenuBarExtra.Item title={`Focusing: ${displayTime}`} />
            <MenuBarExtra.Item
              title="Stop Focus Session"
              onAction={handleStopSession}
              shortcut={{ modifiers: ["cmd"], key: "x" }}
            />
          </>
        ) : (
          <>
            <MenuBarExtra.Item
              title="Start Focus Session"
              onAction={handleStartSession}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <MenuBarExtra.Item
              title="Modify Last Session"
              onAction={() => launchCommand({ name: "modify-session", type: LaunchType.UserInitiated })}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
          </>
        )}
      </MenuBarExtra.Section>

      {stats && (
        <MenuBarExtra.Section title="My Stats">
          <MenuBarExtra.Item title={`Total Focus: ${TimeUtils.formatDuration(stats.totalMinutes)}`} />
          <MenuBarExtra.Item title={`Today's Sessions: ${stats.sessionsToday}`} />
          <MenuBarExtra.Item title={`Longest Focus: ${TimeUtils.formatDuration(stats.longestSession)}`} />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Team Flow">
        <MenuBarExtra.Item
          title="View Flow Leaderboard"
          onAction={() => launchCommand({ name: "leaderboard", type: LaunchType.UserInitiated })}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
        <MenuBarExtra.Item
          title="My Focus Stats"
          onAction={() => launchCommand({ name: "my-stats", type: LaunchType.UserInitiated })}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
        {team?.isCreator && (
          <MenuBarExtra.Item
            title="Manage Flow Team Settings"
            onAction={() => launchCommand({ name: "team-settings", type: LaunchType.UserInitiated })}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Team Setup">
        <MenuBarExtra.Item
          title="Flow with a Team"
          onAction={() => launchCommand({ name: "create-team", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Join a Flow Team"
          onAction={() => launchCommand({ name: "join-team", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
