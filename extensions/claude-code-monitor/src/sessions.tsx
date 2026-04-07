import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Detail,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useSessions } from "./hooks/useSessions";
import { hooksInstalled, deleteHookSession } from "./lib/hook-state";
import { getSessionDetail } from "./lib/session-parser";
import { focusSession, resumeSession } from "./lib/terminal";
import { formatRelativeTime, formatDuration } from "./lib/time";
import { formatCost } from "./lib/usage-stats";
import {
  STATE_CONFIG,
  DEFAULT_STATE_CONFIG,
  getSessionTitle,
  getAppLabel,
} from "./lib/constants";
import { escapeMarkdown } from "./lib/fs-utils";
import { Session, SessionDetail as SessionDetailType } from "./types";

export default function SessionsCommand() {
  const {
    activeSessions,
    waitingSessions,
    idleSessions,
    endedSessions,
    isLoading,
    revalidate,
  } = useSessions();

  if (!isLoading && !hooksInstalled()) {
    return (
      <List>
        <List.EmptyView
          title="Hooks Not Installed"
          description='Run "Setup Claude Code Hooks" command first to enable real-time session monitoring.'
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const sections = [
    { title: "Waiting for Input", sessions: waitingSessions },
    { title: "Active", sessions: activeSessions },
    { title: "Idle", sessions: idleSessions },
    { title: "Ended", sessions: endedSessions },
  ];

  const isEmpty = sections.every((s) => s.sessions.length === 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      {isEmpty && !isLoading && (
        <List.EmptyView
          title="No Sessions"
          description="Start a Claude Code session to see it here."
          icon={Icon.Terminal}
        />
      )}
      {sections
        .filter((s) => s.sessions.length > 0)
        .map((section) => (
          <List.Section
            key={section.title}
            title={section.title}
            subtitle={`${section.sessions.length}`}
          >
            {section.sessions.map((s) => (
              <SessionItem
                key={s.session_id}
                session={s}
                onDelete={revalidate}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function SessionItem({
  session,
  onDelete,
}: {
  session: Session;
  onDelete: () => void;
}) {
  const config = STATE_CONFIG[session.state] || DEFAULT_STATE_CONFIG;
  const startedAt = session.started_at || Date.now();
  const endedAt = session.ended_at ?? Date.now();
  const duration = formatDuration(startedAt, endedAt);
  const lastUpdate = formatRelativeTime(session.last_updated_at || Date.now());

  const accessories: List.Item.Accessory[] = [
    { tag: { value: config.label, color: config.color } },
  ];

  if (session.is_worktree) {
    accessories.push({
      tag: { value: "Worktree", color: Color.Purple },
    });
  }

  const appLabel = getAppLabel(
    session.term_program,
    session.terminal_emulator,
    session.bundle_id,
  );
  if (appLabel) {
    accessories.push({
      tag: { value: appLabel, color: Color.Blue },
    });
  }

  if (session.gitBranch && session.gitBranch !== "HEAD") {
    accessories.push({ icon: Icon.CodeBlock, text: session.gitBranch });
  }

  accessories.push({ text: duration });
  accessories.push({ text: lastUpdate });

  const title = getSessionTitle(session);
  const cleanPrompt = session.first_prompt?.replace(/\n+/g, " ").trim() ?? "";
  const subtitle =
    session.label ||
    (cleanPrompt.length > 50 ? cleanPrompt.slice(0, 50) + "..." : cleanPrompt);

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={{ source: config.icon, tintColor: config.color }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Session">
            <Action
              title="Focus Session"
              icon={Icon.Terminal}
              onAction={async () => {
                try {
                  await focusSession(session);
                } catch {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to focus session",
                  });
                }
              }}
            />
            {session.state === "ended" && session.session_id && session.cwd && (
              <ActionPanel.Submenu
                title="Resume In…"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              >
                {[
                  { title: "Terminal.app", value: "Apple_Terminal" },
                  { title: "iTerm2", value: "iTerm.app" },
                  { title: "Warp", value: "WarpTerminal" },
                  { title: "Ghostty", value: "ghostty" },
                  { title: "kitty", value: "kitty" },
                ].map((term) => (
                  <Action
                    key={term.value}
                    title={term.title}
                    onAction={async () => {
                      try {
                        await resumeSession(
                          session.session_id,
                          session.cwd,
                          term.value,
                        );
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Resume command copied",
                          message: "Paste in terminal to resume",
                        });
                      } catch {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to resume session",
                        });
                      }
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
            {session.session_id && (
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                target={
                  <SessionDetailView
                    sessionId={session.session_id}
                    session={session}
                  />
                }
              />
            )}
            {session.cwd && (
              <Action.ShowInFinder
                title="Show in Finder"
                path={session.cwd}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {session.session_id && (
              <Action.CopyToClipboard
                title="Copy Session ID"
                content={session.session_id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            {session.cwd && (
              <Action.CopyToClipboard
                title="Copy Project Path"
                content={session.cwd}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Session"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete Session",
                  message: `Remove "${session.project_name || session.session_id}" from the list?`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (confirmed) {
                  deleteHookSession(session.session_id);
                  onDelete();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Session deleted",
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SessionDetailView({
  sessionId,
  session: parentSession,
}: {
  sessionId: string;
  session: Session;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<SessionDetailType | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const d = await getSessionDetail(sessionId);
        setDetail(d);
      } catch (e) {
        console.error("Failed to load session detail:", e);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [sessionId]);

  if (!detail && !isLoading) {
    return (
      <Detail
        markdown={
          loadError
            ? "# Failed to Load Session\n\nCould not read session data."
            : "# Session Not Found"
        }
      />
    );
  }

  const title =
    parentSession.label ||
    parentSession.first_prompt?.replace(/\n+/g, " ").trim().slice(0, 50) ||
    detail?.summary ||
    "Session";
  const stateConfig = STATE_CONFIG[parentSession.state] || DEFAULT_STATE_CONFIG;
  const startedAt = parentSession.started_at || Date.now();
  const endedAt = parentSession.ended_at ?? Date.now();
  const duration = formatDuration(startedAt, endedAt);
  const gitBranch = parentSession.gitBranch || detail?.gitBranch;
  const firstPrompt = parentSession.first_prompt || detail?.firstMessage || "";
  let markdown = `# ${escapeMarkdown(title)}\n\n`;
  if (detail?.summary) markdown += `> ${escapeMarkdown(detail.summary)}\n\n`;
  if (firstPrompt)
    markdown += `---\n\n## First Prompt\n\n${escapeMarkdown(firstPrompt)}\n`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        detail ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Session ID" text={detail.id || ""} />
            <Detail.Metadata.Label
              title="Project"
              text={detail.projectName || ""}
            />
            <Detail.Metadata.Label
              title="Path"
              text={detail.projectPath || ""}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={stateConfig.label}
                color={stateConfig.color}
              />
            </Detail.Metadata.TagList>
            {(parentSession.term_program ||
              parentSession.terminal_emulator) && (
              <Detail.Metadata.Label
                title="Terminal"
                text={getAppLabel(
                  parentSession.term_program,
                  parentSession.terminal_emulator,
                  parentSession.bundle_id,
                )}
              />
            )}
            {gitBranch && gitBranch !== "HEAD" && (
              <Detail.Metadata.Label title="Git Branch" text={gitBranch} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Turns"
              text={`${detail.turnCount || 0}`}
            />
            {detail.cost > 0 && (
              <Detail.Metadata.Label
                title="Cost"
                text={formatCost(detail.cost)}
              />
            )}
            {detail.model && (
              <Detail.Metadata.Label title="Model" text={detail.model} />
            )}
            {detail.inputTokens && (
              <Detail.Metadata.Label
                title="Input Tokens"
                text={detail.inputTokens.toLocaleString()}
              />
            )}
            {detail.outputTokens && (
              <Detail.Metadata.Label
                title="Output Tokens"
                text={detail.outputTokens.toLocaleString()}
              />
            )}
            {detail.cacheReadTokens && (
              <Detail.Metadata.Label
                title="Cache Read"
                text={detail.cacheReadTokens.toLocaleString()}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Duration" text={duration} />
            <Detail.Metadata.Label
              title="Started"
              text={new Date(startedAt).toLocaleString()}
            />
            <Detail.Metadata.Label
              title="Last Modified"
              text={
                detail.lastModified ? detail.lastModified.toLocaleString() : ""
              }
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Resume Session"
            icon={Icon.ArrowRight}
            onAction={async () => {
              try {
                const cwd = parentSession.cwd || detail?.projectPath || "";
                await resumeSession(sessionId, cwd, parentSession.term_program);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Resume command copied",
                  message: "Paste in terminal to resume",
                });
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to resume session",
                });
              }
            }}
          />
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={sessionId}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {(parentSession.cwd || detail?.projectPath) && (
            <Action.CopyToClipboard
              title="Copy Project Path"
              content={parentSession.cwd || detail?.projectPath || ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
