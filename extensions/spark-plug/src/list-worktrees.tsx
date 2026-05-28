import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { existsSync, readdirSync, rmSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClaudeSession,
  liveSessionIds,
  readSessions,
  relativeShort,
  sessionDir,
  sessionLabel,
  sessionTitle,
} from "./claude-sessions";
import { launchClaude } from "./launch";

interface Preferences {
  worktreesRoot: string;
}

interface Worktree {
  name: string;
  path: string;
  isGitRepo: boolean;
  sessions: ClaudeSession[];
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  if (p === "~") return homedir();
  return p;
}

function loadWorktrees(root: string): { trees: Worktree[]; error?: string } {
  const expanded = expandHome(root.trim());
  if (!existsSync(expanded)) {
    return { trees: [], error: `Folder not found: ${expanded}` };
  }
  let stat;
  try {
    stat = statSync(expanded);
  } catch (e) {
    return { trees: [], error: `Cannot read ${expanded}: ${String(e)}` };
  }
  if (!stat.isDirectory()) {
    return { trees: [], error: `Not a directory: ${expanded}` };
  }

  const live = liveSessionIds();
  const trees: Worktree[] = [];

  for (const name of readdirSync(expanded)) {
    if (name.startsWith(".")) continue;
    const full = join(expanded, name);
    try {
      if (!statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    trees.push({
      name,
      path: full,
      isGitRepo: existsSync(join(full, ".git")),
      sessions: readSessions(full, live),
    });
  }

  trees.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  return { trees };
}

function NewSessionForm({
  worktree,
  onStarted,
}: {
  worktree: Worktree;
  onStarted: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`New Session — ${worktree.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Claude"
            icon={Icon.Play}
            onSubmit={async (values: { name: string }) => {
              const name = values.name.trim();
              if (!name) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Name required",
                });
                return;
              }
              try {
                await launchClaude(worktree.path, { newSessionName: name });
                pop();
                onStarted();
              } catch (e) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to launch",
                  message: String(e),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={worktree.path} />
      <Form.TextField
        id="name"
        title="Session Name"
        placeholder='e.g. "refactor auth flow"'
        autoFocus
      />
    </Form>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [state, setState] = useState<{ trees: Worktree[]; error?: string }>({
    trees: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = useCallback(() => {
    setIsLoading(true);
    setState(loadWorktrees(prefs.worktreesRoot));
    setIsLoading(false);
  }, [prefs.worktreesRoot]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const emptyDescription = useMemo(() => {
    if (state.error) return state.error;
    return `Configure the worktrees folder in extension preferences. Current: ${prefs.worktreesRoot}`;
  }, [state.error, prefs.worktreesRoot]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter worktrees"
      navigationTitle="Spark Plug"
    >
      {state.trees.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title={state.error ? "No worktrees" : "No subdirectories found"}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <Action.OpenInBrowser
                title="Open Extension Preferences"
                url="raycast://extensions/kylescudder/spark-plug"
              />
            </ActionPanel>
          }
        />
      ) : (
        state.trees.map((wt) => (
          <List.Item
            key={wt.path}
            title={wt.name}
            subtitle={wt.path}
            icon={wt.isGitRepo ? Icon.CodeBlock : Icon.Folder}
            accessories={
              wt.sessions.length > 0
                ? [
                    {
                      icon: Icon.Stars,
                      text: `${wt.sessions.length} · ${relativeShort(wt.sessions[0].lastModified)}`,
                      tooltip: `${wt.sessions.length} Claude session${wt.sessions.length === 1 ? "" : "s"}`,
                    },
                  ]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="New Session…"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(<NewSessionForm worktree={wt} onStarted={refresh} />)
                  }
                />

                {wt.sessions.length > 0 && (
                  <ActionPanel.Submenu
                    title="Continue Session"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  >
                    {wt.sessions.map((s) => (
                      <Action
                        key={s.id}
                        title={sessionLabel(s)}
                        icon={s.isLive ? Icon.CircleFilled : Icon.Message}
                        onAction={async () => {
                          if (s.isLive) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Session is live",
                              message: "Quit it first, then resume.",
                            });
                            return;
                          }
                          try {
                            await launchClaude(wt.path, {
                              resumeSessionId: s.id,
                            });
                          } catch (e) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Failed to launch",
                              message: String(e),
                            });
                          }
                        }}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}

                {wt.sessions.length > 0 && (
                  <ActionPanel.Submenu
                    title="Delete Session"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  >
                    {wt.sessions.map((s) => (
                      <Action
                        key={s.id}
                        title={sessionLabel(s)}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          if (s.isLive) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Cannot delete a live session",
                              message: "Quit Claude first.",
                            });
                            return;
                          }
                          const confirmed = await confirmAlert({
                            title: "Delete this session?",
                            message: `This permanently deletes the transcript for "${sessionTitle(s)}".`,
                            primaryAction: {
                              title: "Delete",
                              style: Alert.ActionStyle.Destructive,
                            },
                          });
                          if (!confirmed) return;
                          try {
                            rmSync(s.filePath);
                            const companion = join(sessionDir(wt.path), s.id);
                            if (existsSync(companion))
                              rmSync(companion, { recursive: true });
                            refresh();
                          } catch (e) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Delete failed",
                              message: String(e),
                            });
                          }
                        }}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}

                <Action.Open
                  title="Open Folder in Finder"
                  icon={Icon.Folder}
                  target={wt.path}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
