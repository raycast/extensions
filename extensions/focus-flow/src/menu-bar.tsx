"use client";

import { useState, useEffect } from "react";
import { MenuBarExtra, LaunchType, launchCommand } from "@raycast/api";
import { Storage } from "./utils/storage";
import { TimeUtils } from "./utils/time";
import type { StudySession, UserStats, TeamData } from "./types";

export default function MenuBar() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      if (session) {
        setSession({ ...session });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [session]);

  async function loadData() {
    try {
      const [currentSession, currentStats, currentTeam] = await Promise.all([
        Storage.getSession(),
        Storage.getStats(),
        Storage.getTeam(),
      ]);

      setSession(currentSession);
      setStats(currentStats);
      setTeam(currentTeam);
    } catch (error) {
      console.error("Failed to load data:", error);
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
      const duration = TimeUtils.formatSessionTime(session.startTime);
      return `${duration}`;
    }
    return "";
  }

  function getMenuBarTooltip(): string {
    if (session) {
      return `FocusFlow - Focusing for ${TimeUtils.formatSessionTime(session.startTime)}`;
    }
    return "FocusFlow - Team Focus Tracker";
  }

  return (
    <MenuBarExtra icon="📚" title={getMenuBarTitle()} tooltip={getMenuBarTooltip()}>
      <MenuBarExtra.Section title="Focus Session">
        {session ? (
          <>
            <MenuBarExtra.Item title={`Focusing: ${TimeUtils.formatSessionTime(session.startTime)}`} />
            <MenuBarExtra.Item
              title="Stop Focus Session"
              onAction={handleStopSession}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </>
        ) : (
          <MenuBarExtra.Item
            title="Start Focus Session"
            onAction={handleStartSession}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
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
