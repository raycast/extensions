import { ActionPanel, Action, List, Icon, showToast, Toast, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import { getTerminalAdapter } from "./terminal";

const execFileAsync = promisify(execFile);

const OPENCODE_BIN = `${process.env.HOME}/.opencode/bin/opencode`;

interface Session {
  id: string;
  title: string;
  updated: string;
}

interface CommandPreferences {
  terminalApp?: string;
}

function parseSessions(stdout: string): Session[] {
  const lines = stdout.split("\n");
  const sessions: Session[] = [];

  for (const line of lines) {
    const match = line.match(/^(ses_\S+)\s{2,}(.+?)\s{2,}(\S.*)$/);
    if (match) {
      sessions.push({
        id: match[1].trim(),
        title: match[2].trim(),
        updated: match[3].trim(),
      });
    }
  }

  return sessions;
}

export default function Command() {
  const preferences = getPreferenceValues<CommandPreferences>();
  const terminalName = preferences.terminalApp ?? "Terminal";
  const terminalAdapter = getTerminalAdapter(terminalName);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { stdout } = await execFileAsync(OPENCODE_BIN, ["session", "list"]);
      setSessions(parseSessions(stdout));
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sessions",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function openSession(sessionId: string, title: string) {
    await closeMainWindow();
    await showToast({ style: Toast.Style.Animated, title: `Opening: ${title}` });
    await terminalAdapter.open(`${OPENCODE_BIN} --session ${sessionId}`);
  }

  async function newSession() {
    await closeMainWindow();
    await showToast({ style: Toast.Style.Animated, title: "Starting new session" });
    await terminalAdapter.open(OPENCODE_BIN);
  }

  async function continueLastSession() {
    await closeMainWindow();
    await showToast({ style: Toast.Style.Animated, title: "Continuing last session" });
    await terminalAdapter.open(`${OPENCODE_BIN} --continue`);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      <List.Section title="Quick Actions">
        <List.Item
          icon={Icon.Plus}
          title="New Session"
          subtitle="Start a fresh OpenCode session"
          actions={
            <ActionPanel>
              <Action title="Start New Session" icon={Icon.Plus} onAction={newSession} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ArrowClockwise}
          title="Continue Last Session"
          subtitle="Resume the most recent session"
          actions={
            <ActionPanel>
              <Action title="Continue Last" icon={Icon.ArrowClockwise} onAction={continueLastSession} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Sessions" subtitle={`${sessions.length} sessions`}>
        {sessions.map((session) => (
          <List.Item
            key={session.id}
            icon={Icon.Terminal}
            title={session.title}
            subtitle={session.id}
            accessories={[{ text: session.updated, icon: Icon.Clock }]}
            actions={
              <ActionPanel>
                <Action
                  title={`Open in ${terminalAdapter.name}`}
                  icon={Icon.Terminal}
                  onAction={() => openSession(session.id, session.title)}
                />
                <Action.CopyToClipboard
                  title="Copy Session ID"
                  content={session.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Reload Sessions"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadSessions}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
