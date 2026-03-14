import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { SessionDetailView } from "./components/SessionDetailView";
import { TargetForm } from "./components/TargetForm";
import { PromptForm } from "./forms/PromptForm";
import {
  previewFromMessages,
  sessionSubtitle,
  transcriptToMarkdown,
} from "./lib/format";
import {
  createClient,
  getMessages,
  listPendingPermissions,
  listPendingQuestions,
  listSessionStatuses,
  listSessions,
  listWorkspaces,
} from "./lib/opencode";
import { getPreferences } from "./lib/preferences";
import {
  resolveServerCandidates,
  resolveServerUrl,
} from "./lib/server-discovery";
import {
  getLastTarget,
  getRecentSessions,
  getRecentTargets,
  saveRecentTarget,
} from "./lib/storage";
import { targetDropdownTitle } from "./lib/target-display";
import type {
  OpencodeTarget,
  RecentSession,
  RecentTarget,
  SessionSummary,
  WorkspaceOption,
} from "./lib/types";

type PendingItem =
  | {
      kind: "permission";
      id: string;
      sessionID: string;
      title: string;
      subtitle: string;
    }
  | {
      kind: "question";
      id: string;
      sessionID: string;
      title: string;
      subtitle: string;
    };

export default function Command() {
  const preferences = useMemo(() => getPreferences(), []);
  const { push } = useNavigation();
  const [serverUrl, setServerUrl] = useState<string>();
  const [serverCandidates, setServerCandidates] = useState<string[]>([]);
  const client = useMemo(
    () => (serverUrl ? createClient(serverUrl) : undefined),
    [serverUrl],
  );
  const [target, setTarget] = useState<OpencodeTarget>();
  const [recentTargets, setRecentTargets] = useState<RecentTarget[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [selectedSessionID, setSelectedSessionID] = useState<string>();
  const [detailsMarkdown, setDetailsMarkdown] = useState<string>(
    "Select a session to preview it.",
  );
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const selectedSessionInfo = useMemo(
    () =>
      sessions.find((session) => session.info.id === selectedSessionID)?.info,
    [selectedSessionID, sessions],
  );

  async function hydrateStorage(targetOverride?: OpencodeTarget) {
    const [targets, lastTarget] = await Promise.all([
      getRecentTargets(),
      getLastTarget(),
    ]);
    setRecentTargets(targets);
    const fallbackTarget =
      targetOverride ??
      lastTarget ??
      (preferences.defaultDirectory
        ? { directory: preferences.defaultDirectory }
        : undefined);
    if (fallbackTarget) {
      setTarget(fallbackTarget);
      setRecentSessions(await getRecentSessions(fallbackTarget));
    }
  }

  async function refreshServerDiscovery() {
    const [resolved, candidates] = await Promise.all([
      resolveServerUrl(),
      resolveServerCandidates(),
    ]);
    setServerUrl(resolved);
    setServerCandidates(candidates);
    if (!resolved) {
      const toast = await showToast({
        style: Toast.Style.Failure,
        title: "No running OpenCode server found",
      });
      toast.message = "Start opencode serve or set Server URL in preferences.";
    }
    return resolved;
  }

  async function load(forTarget?: OpencodeTarget, search?: string) {
    if (!client) {
      setIsLoading(false);
      return;
    }
    const activeTarget = forTarget ?? target;
    if (!activeTarget?.directory) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [sessionList, statuses, permissions, questions, workspaceList] =
        await Promise.all([
          listSessions(client, activeTarget, search),
          listSessionStatuses(client, activeTarget),
          listPendingPermissions(client, activeTarget),
          listPendingQuestions(client, activeTarget),
          listWorkspaces(client, activeTarget),
        ]);
      setWorkspaces(workspaceList);
      setSessions(
        sessionList.map((session) => ({
          info: session,
          status: statuses[session.id],
          pendingCount:
            permissions.filter((item) => item.sessionID === session.id).length +
            questions.filter((item) => item.sessionID === session.id).length,
          preview: "",
        })),
      );
      setPendingItems([
        ...permissions.map((item) => ({
          kind: "permission" as const,
          id: item.id,
          sessionID: item.sessionID,
          title: item.permission,
          subtitle: item.patterns.join(", "),
        })),
        ...questions.map((item) => ({
          kind: "question" as const,
          id: item.id,
          sessionID: item.sessionID,
          title: item.questions[0]?.header ?? "Question",
          subtitle: item.questions[0]?.question ?? "",
        })),
      ]);
      await saveRecentTarget(activeTarget);
      setRecentSessions(await getRecentSessions(activeTarget));
      setRecentTargets(await getRecentTargets());
    } catch (error) {
      const toast = await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sessions",
      });
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshServerDiscovery();
    void hydrateStorage();
  }, []);

  useEffect(() => {
    if (!client || !target?.directory) {
      return;
    }
    void load(target, searchText);
  }, [client, target?.directory, target?.workspace, searchText]);

  useEffect(() => {
    const sessionID = selectedSessionID;
    if (!client || !target?.directory || !sessionID) {
      setDetailsMarkdown("Select a session to preview it.");
      return;
    }
    const run = async () => {
      try {
        const messages = await getMessages(client, target, sessionID);
        setDetailsMarkdown(
          transcriptToMarkdown(
            {
              sessionID,
              messages,
              todos: [],
              pending: { permissions: [], questions: [] },
            },
            selectedSessionInfo,
          ),
        );
        setSessions((current) =>
          current.map((session) => {
            if (session.info.id !== sessionID) {
              return session;
            }
            const preview = previewFromMessages(messages);
            return session.preview === preview
              ? session
              : { ...session, preview };
          }),
        );
      } catch {
        setDetailsMarkdown("Preview unavailable.");
      }
    };
    void run();
  }, [
    client,
    selectedSessionID,
    selectedSessionInfo,
    target?.directory,
    target?.workspace,
  ]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        serverUrl ? "Search sessions" : "No OpenCode server detected"
      }
      onSearchTextChange={setSearchText}
      throttle
      onSelectionChange={(id) => setSelectedSessionID(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Target"
          value={target ? `${target.directory}::${target.workspace ?? ""}` : ""}
          onChange={(value) => {
            const match = recentTargets.find(
              (item) => `${item.directory}::${item.workspace ?? ""}` === value,
            );
            if (match) {
              setTarget({
                directory: match.directory,
                workspace: match.workspace,
              });
            }
          }}
        >
          {recentTargets.map((item) => (
            <List.Dropdown.Item
              key={`${item.directory}::${item.workspace ?? ""}`}
              title={targetDropdownTitle(item)}
              value={`${item.directory}::${item.workspace ?? ""}`}
              keywords={[item.directory, item.label]}
            />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="New Session"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              if (!serverUrl) {
                openExtensionPreferences();
                return;
              }
              push(
                <PromptForm
                  serverUrl={serverUrl}
                  initialTarget={target}
                  recentTargets={recentTargets}
                  recentSessions={recentSessions}
                  onSent={async (sessionID, nextTarget) => {
                    setTarget(nextTarget);
                    await load(nextTarget);
                    push(
                      <SessionDetailView
                        serverUrl={serverUrl}
                        target={nextTarget}
                        sessionID={sessionID}
                        recentTargets={recentTargets}
                        recentSessions={recentSessions}
                        workspaces={workspaces}
                        onTargetTouched={async () => {
                          await hydrateStorage(nextTarget);
                        }}
                      />,
                    );
                  }}
                />,
              );
            }}
          />
          <Action
            title="Set Directory"
            icon={Icon.Folder}
            onAction={() =>
              push(
                <TargetForm
                  recentTargets={recentTargets}
                  initialTarget={target}
                  onSave={async (nextTarget) => {
                    setTarget(nextTarget);
                    await load(nextTarget);
                  }}
                />,
              )
            }
          />
          <Action
            title="Refresh Servers"
            icon={Icon.Network}
            onAction={async () => {
              const resolved = await refreshServerDiscovery();
              if (resolved && target) {
                await load(target);
              }
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => load()}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      {!serverUrl ? (
        <List.EmptyView
          icon={Icon.Network}
          title="No OpenCode Server Found"
          description={
            serverCandidates.length > 0
              ? `Tried ${serverCandidates.slice(0, 5).join(", ")}`
              : "Start opencode serve, then refresh servers."
          }
        />
      ) : null}
      {serverUrl && pendingItems.length > 0 ? (
        <List.Section
          title={`Pending Requests • ${serverUrl.replace("http://", "")}`}
        >
          {pendingItems.map((item) => (
            <List.Item
              key={`${item.kind}-${item.id}`}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.kind === "permission" ? Icon.Lock : Icon.QuestionMark}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Session"
                    onAction={() => {
                      if (!target) {
                        return;
                      }
                      push(
                        <SessionDetailView
                          serverUrl={serverUrl}
                          target={target}
                          sessionID={item.sessionID}
                          recentTargets={recentTargets}
                          recentSessions={recentSessions}
                          workspaces={workspaces}
                          onTargetTouched={async () => {
                            await hydrateStorage(target);
                          }}
                        />,
                      );
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {serverUrl ? (
        <List.Section
          title={
            target
              ? target.workspace
                ? `${target.directory} (${target.workspace}) • ${serverUrl.replace("http://", "")}`
                : `${target.directory} • ${serverUrl.replace("http://", "")}`
              : `Choose a target • ${serverUrl.replace("http://", "")}`
          }
        >
          {sessions.map((session) => (
            <List.Item
              key={session.info.id}
              title={session.info.title || "Untitled Session"}
              subtitle={sessionSubtitle(session.info, session.status)}
              accessories={
                session.pendingCount > 0
                  ? [{ text: `${session.pendingCount} pending` }]
                  : undefined
              }
              detail={<List.Item.Detail markdown={detailsMarkdown} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Session"
                    onAction={() => {
                      if (!target) {
                        return;
                      }
                      push(
                        <SessionDetailView
                          serverUrl={serverUrl}
                          target={target}
                          sessionID={session.info.id}
                          recentTargets={recentTargets}
                          recentSessions={recentSessions}
                          workspaces={workspaces}
                          onTargetTouched={async () => {
                            await hydrateStorage(target);
                          }}
                        />,
                      );
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
