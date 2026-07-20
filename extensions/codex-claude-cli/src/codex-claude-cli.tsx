import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";

import { ConversationWorkspace } from "./components/conversation-workspace";
import { McpManager } from "./components/mcp-manager";
import { SkillsManager } from "./components/skills-manager";
import { StartupConfiguration } from "./components/startup-configuration";
import { ShortcutSettings } from "./components/shortcut-settings";
import { UsageDashboard } from "./components/usage-dashboard";
import { useChatSessions } from "./hooks/use-chat-sessions";
import { usePreferredTerminalApplication } from "./hooks/use-preferred-terminal";
import { providerName } from "./lib/format";
import { liveIcon, providerIcon, sessionAccessories } from "./lib/presentation";
import { shortcut, useShortcutStore } from "./lib/shortcuts";
import { openProjectInTerminal, preferredTerminalName, resumeSession } from "./lib/terminal";
import { ChatSession, SessionFilter } from "./lib/types";

type RootFilter = SessionFilter | "favorite-chats" | "favorite-projects";
type PromptCastLaunchContext = { sessionKey?: string };

export default function Command({ launchContext }: { launchContext?: PromptCastLaunchContext }) {
  useShortcutStore();
  const { sessions: discoveredSessions, isLoading, error, reload, roots } = useChatSessions();
  const [filter, setFilter] = useState<RootFilter>("all");
  const [selectedSessionKey, setSelectedSessionKey] = useCachedState<string | undefined>(
    "selected-conversation",
    undefined,
  );
  const [favoriteChatKeys, setFavoriteChatKeys] = useCachedState<string[]>("favorite-chat-keys", []);
  const [favoriteProjectPaths, setFavoriteProjectPaths] = useCachedState<string[]>("favorite-project-paths", []);
  const [sessionTitleOverrides, setSessionTitleOverrides] = useCachedState<Record<string, string>>(
    "session-title-overrides",
    {},
  );
  const sessions = useMemo(
    () =>
      discoveredSessions.map((session) => ({
        ...session,
        nativeTitle: session.title,
        title: sessionTitleOverrides[sessionKey(session)] || session.title,
      })),
    [discoveredSessions, sessionTitleOverrides],
  );
  const favoriteChats = useMemo(() => new Set(favoriteChatKeys), [favoriteChatKeys]);
  const favoriteProjects = useMemo(() => new Set(favoriteProjectPaths), [favoriteProjectPaths]);
  const preferredTerminal = usePreferredTerminalApplication();
  const terminalName = preferredTerminalName(preferredTerminal);
  const homeSections = useMemo(
    () => groupHomeSessions(sessions, favoriteChats, favoriteProjects),
    [favoriteChats, favoriteProjects, sessions],
  );
  const historySessions = useMemo(() => sessions.filter((session) => !session.isActive), [sessions]);
  const launchedSession = launchContext?.sessionKey
    ? sessions.find((session) => sessionKey(session) === launchContext.sessionKey)
    : undefined;

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (filter === "all") return true;
        if (filter === "live") return session.isActive;
        if (filter === "favorite-chats") return favoriteChats.has(sessionKey(session));
        if (filter === "favorite-projects") return favoriteProjects.has(session.cwd);
        return session.provider === filter;
      }),
    [favoriteChats, favoriteProjects, filter, sessions],
  );
  const sections = useMemo(() => {
    if (filter === "all") return homeSections;
    if (filter === "favorite-chats") return [{ title: "Favorite Chats", sessions: filteredSessions }];
    if (filter === "favorite-projects") return [{ title: "Favorite Projects", sessions: filteredSessions }];
    return groupSessions(filteredSessions, favoriteChats, favoriteProjects);
  }, [favoriteChats, favoriteProjects, filter, filteredSessions, homeSections]);
  const activeCount = sessions.filter((session) => session.isActive).length;
  const visibleSessions = sections.flatMap((section) => section.sessions);
  const selectedItemId = visibleSessions.some((session) => sessionKey(session) === selectedSessionKey)
    ? selectedSessionKey
    : visibleSessions[0]
      ? sessionKey(visibleSessions[0])
      : filter === "all"
        ? "open-conversation-history"
        : undefined;

  const toggleFavoriteChat = (selectedSession: ChatSession) => {
    const key = sessionKey(selectedSession);
    setFavoriteChatKeys((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  };
  const toggleFavoriteProject = (selectedSession: ChatSession) => {
    const projectPath = selectedSession.cwd;
    setFavoriteProjectPaths((current) =>
      current.includes(projectPath) ? current.filter((value) => value !== projectPath) : [...current, projectPath],
    );
  };
  const renameSession = (selectedSession: ChatSession, title: string) =>
    setSessionTitleOverrides((current) => ({ ...current, [sessionKey(selectedSession)]: title }));
  const resetSessionName = (selectedSession: ChatSession) =>
    setSessionTitleOverrides((current) => {
      const next = { ...current };
      delete next[sessionKey(selectedSession)];
      return next;
    });

  if (launchedSession) {
    return (
      <ConversationWorkspace
        sessions={sessions}
        initialSessionKey={sessionKey(launchedSession)}
        codexRoot={roots.codex}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id && id !== "open-conversation-history") setSelectedSessionKey(id);
      }}
      searchBarPlaceholder={"Search by title, project, path, or ID…"}
      searchBarAccessory={
        <List.Dropdown
          tooltip={"Filter conversations"}
          value={filter}
          onChange={(value) => setFilter(value as RootFilter)}
        >
          <List.Dropdown.Item
            title={`${"Home"} (${homeSections.reduce((total, section) => total + section.sessions.length, 0)})`}
            value="all"
            icon={Icon.House}
          />
          <List.Dropdown.Item title={`${"Live"} (${activeCount})`} value="live" icon={liveIcon} />
          <List.Dropdown.Section title={"Favorites"}>
            <List.Dropdown.Item
              title={`${"Favorite chats"} (${favoriteChatKeys.length})`}
              value="favorite-chats"
              icon={Icon.Star}
            />
            <List.Dropdown.Item
              title={`${"Favorite projects"} (${favoriteProjectPaths.length})`}
              value="favorite-projects"
              icon={Icon.Folder}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={"Provider"}>
            <List.Dropdown.Item title="Claude" value="claude" icon={providerIcon("claude")} />
            <List.Dropdown.Item title="Codex" value="codex" icon={providerIcon("codex")} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredSessions.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : filter === "live" ? Icon.Moon : Icon.Message}
          title={error ? "Could Not Read Local Histories" : emptyTitle(filter)}
          description={
            error?.message ||
            `Claude: ${roots.claude}\nCodex: ${roots.codex}\n${"You can change these paths in Preferences."}`
          }
          actions={
            <ActionPanel>
              <Action title={"Refresh"} icon={Icon.ArrowClockwise} onAction={reload} />
              <ActionPanel.Section title={"Tools"}>
                <Action.Push title={"View Claude and Codex Usage"} icon={Icon.Gauge} target={<UsageDashboard />} />
                <Action.Push title={"Manage MCPs"} icon={Icon.Network} target={<McpManager />} />
                <Action.Push title={"Manage Skills"} icon={Icon.Book} target={<SkillsManager />} />
              </ActionPanel.Section>
              <Action title={"Open Preferences"} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {sections.map((section) => (
            <List.Section key={section.title} title={section.title} subtitle={`${section.sessions.length}`}>
              {section.sessions.map((session) => (
                <SessionItem
                  key={sessionKey(session)}
                  session={session}
                  sessions={sessions}
                  codexRoot={roots.codex}
                  terminalName={terminalName}
                  onRefresh={reload}
                  favoriteChatKeys={favoriteChatKeys}
                  favoriteProjectPaths={favoriteProjectPaths}
                  onToggleFavoriteChat={toggleFavoriteChat}
                  onToggleFavoriteProject={toggleFavoriteProject}
                  onRename={renameSession}
                  onResetName={resetSessionName}
                  hasCustomName={Boolean(sessionTitleOverrides[sessionKey(session)])}
                />
              ))}
            </List.Section>
          ))}
          {filter === "all" ? (
            <List.Section title={"History"} subtitle={`${historySessions.length}`}>
              <List.Item
                id="open-conversation-history"
                icon={Icon.Clock}
                title={"Browse All Conversation History"}
                accessories={[{ text: `${historySessions.length}` }, { icon: Icon.ChevronRight }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={"Open Conversation History"}
                      icon={Icon.Clock}
                      target={
                        <HistoryBrowser
                          historySessions={historySessions}
                          sessions={sessions}
                          codexRoot={roots.codex}
                          terminalName={terminalName}
                          onRefresh={reload}
                          favoriteChatKeys={favoriteChatKeys}
                          favoriteProjectPaths={favoriteProjectPaths}
                          onToggleFavoriteChat={toggleFavoriteChat}
                          onToggleFavoriteProject={toggleFavoriteProject}
                          onRename={renameSession}
                          onResetName={resetSessionName}
                          sessionTitleOverrides={sessionTitleOverrides}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}

function SessionItem({
  session,
  sessions,
  codexRoot,
  terminalName,
  onRefresh,
  favoriteChatKeys,
  favoriteProjectPaths,
  onToggleFavoriteChat,
  onToggleFavoriteProject,
  onRename,
  onResetName,
  hasCustomName,
}: {
  session: ChatSession;
  sessions: ChatSession[];
  codexRoot: string;
  terminalName: string;
  onRefresh: () => void;
  favoriteChatKeys: string[];
  favoriteProjectPaths: string[];
  onToggleFavoriteChat: (session: ChatSession) => void;
  onToggleFavoriteProject: (session: ChatSession) => void;
  onRename: (session: ChatSession, title: string) => void;
  onResetName: (session: ChatSession) => void;
  hasCustomName: boolean;
}) {
  const isFavoriteChat = favoriteChatKeys.includes(sessionKey(session));
  const isFavoriteProject = favoriteProjectPaths.includes(session.cwd);
  return (
    <List.Item
      id={sessionKey(session)}
      icon={providerIcon(session.provider)}
      title={session.title}
      subtitle={session.projectName}
      keywords={[
        session.id,
        session.cwd,
        session.provider,
        providerName(session.provider),
        session.preview,
        session.model || "",
        session.nativeTitle || "",
      ]}
      accessories={[
        ...(isFavoriteChat ? [{ icon: Icon.Star, tooltip: "Favorite chat" }] : []),
        ...(isFavoriteProject ? [{ tag: { value: "Favorite project", color: Color.Yellow }, icon: Icon.Folder }] : []),
        ...sessionAccessories(session),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title={"Open Live Terminal"}
            icon={Icon.Terminal}
            target={
              <ConversationWorkspace
                sessions={sessions}
                initialSessionKey={sessionKey(session)}
                codexRoot={codexRoot}
              />
            }
          />
          <Action.Push
            title={"Rename Chat"}
            icon={Icon.Pencil}
            target={
              <RenameChatForm
                session={session}
                hasCustomName={hasCustomName}
                onRename={(title) => onRename(session, title)}
                onReset={() => onResetName(session)}
              />
            }
            shortcut={shortcut("home.rename")}
          />
          <ActionPanel.Section title={"Tools"}>
            <Action.Push
              title={"View Claude and Codex Usage"}
              icon={Icon.Gauge}
              target={<UsageDashboard />}
              shortcut={shortcut("chat.usage")}
            />
            <Action.Push
              title={"Manage Project MCPs"}
              icon={Icon.Network}
              target={<McpManager workingDirectory={session.cwd} initialProvider={session.provider} />}
              shortcut={shortcut("home.mcp")}
            />
            <Action.Push
              title={"Manage Project Skills"}
              icon={Icon.Book}
              target={<SkillsManager workingDirectory={session.cwd} initialProvider={session.provider} />}
              shortcut={shortcut("home.skills")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={"Favorites"}>
            <Action
              title={isFavoriteChat ? "Remove Chat from Favorites" : "Add Chat to Favorites"}
              icon={Icon.Star}
              onAction={() => onToggleFavoriteChat(session)}
              shortcut={shortcut("home.favorite-chat")}
            />
            <Action
              title={isFavoriteProject ? "Remove Project from Favorites" : "Add Project to Favorites"}
              icon={Icon.Folder}
              onAction={() => onToggleFavoriteProject(session)}
              shortcut={shortcut("home.favorite-project")}
            />
          </ActionPanel.Section>
          <Action.Push
            title={"Configure CLI Startup"}
            icon={Icon.Gear}
            target={<StartupConfiguration session={session} codexRoot={codexRoot} />}
            shortcut={shortcut("home.startup")}
          />
          <Action.Push
            title={`${"Open In"} ${terminalName} · ${"Shared"}`}
            icon={Icon.Terminal}
            target={
              <StartupConfiguration
                session={session}
                codexRoot={codexRoot}
                submitTitle={`${"Open In"} ${terminalName}`}
                onConfigured={() => resumeSession(session)}
              />
            }
            shortcut={shortcut("chat.open-external")}
          />
          <Action
            title={`${"Open Project In"} ${terminalName}`}
            icon={Icon.Folder}
            onAction={() => openProjectInTerminal(session.cwd)}
          />
          <ActionPanel.Section title={"List"}>
            <Action
              title={"Refresh Conversations"}
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={shortcut("common.refresh")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={"Files"}>
            <Action.ShowInFinder title={"Show History in Finder"} path={session.sourcePath} />
            <Action.ShowInFinder title={"Show Project in Finder"} path={session.cwd} />
            <Action.CopyToClipboard title={"Copy Session ID"} content={session.id} />
            <Action.CopyToClipboard title={"Copy History Path"} content={session.sourcePath} />
          </ActionPanel.Section>
          <Action.Push title={"Configure Keyboard Shortcuts"} icon={Icon.Keyboard} target={<ShortcutSettings />} />
          <Action title={"Configure Extension Data Folders"} icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function HistoryBrowser({
  historySessions,
  sessions,
  codexRoot,
  terminalName,
  onRefresh,
  favoriteChatKeys,
  favoriteProjectPaths,
  onToggleFavoriteChat,
  onToggleFavoriteProject,
  onRename,
  onResetName,
  sessionTitleOverrides,
}: {
  historySessions: ChatSession[];
  sessions: ChatSession[];
  codexRoot: string;
  terminalName: string;
  onRefresh: () => void;
  favoriteChatKeys: string[];
  favoriteProjectPaths: string[];
  onToggleFavoriteChat: (session: ChatSession) => void;
  onToggleFavoriteProject: (session: ChatSession) => void;
  onRename: (session: ChatSession, title: string) => void;
  onResetName: (session: ChatSession) => void;
  sessionTitleOverrides: Record<string, string>;
}) {
  const sections = useMemo(() => groupHistorySessions(historySessions), [historySessions]);

  return (
    <List navigationTitle={"Conversation History"} searchBarPlaceholder={"Search all past conversations…"}>
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.sessions.length}`}>
          {section.sessions.map((session) => (
            <SessionItem
              key={sessionKey(session)}
              session={session}
              sessions={sessions}
              codexRoot={codexRoot}
              terminalName={terminalName}
              onRefresh={onRefresh}
              favoriteChatKeys={favoriteChatKeys}
              favoriteProjectPaths={favoriteProjectPaths}
              onToggleFavoriteChat={onToggleFavoriteChat}
              onToggleFavoriteProject={onToggleFavoriteProject}
              onRename={onRename}
              onResetName={onResetName}
              hasCustomName={Boolean(sessionTitleOverrides[sessionKey(session)])}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function RenameChatForm({
  session,
  hasCustomName,
  onRename,
  onReset,
}: {
  session: ChatSession;
  hasCustomName: boolean;
  onRename: (title: string) => void;
  onReset: () => void;
}) {
  const { pop } = useNavigation();

  const submit = async ({ title }: { title: string }) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a name for the chat",
      });
      return;
    }
    onRename(normalizedTitle);
    await showToast({
      style: Toast.Style.Success,
      title: "Chat Renamed",
      message: normalizedTitle,
    });
    pop();
  };

  const reset = async () => {
    onReset();
    await showToast({ style: Toast.Style.Success, title: "Original Name Restored" });
    pop();
  };

  return (
    <Form
      navigationTitle={`${"Rename"} · ${providerName(session.provider)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Save Name"} icon={Icon.Check} onSubmit={submit} />
          {hasCustomName ? <Action title={"Restore Original Name"} icon={Icon.Undo} onAction={reset} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title={"Name"} defaultValue={session.title} autoFocus />
      <Form.Description
        title={"Scope"}
        text={"The alias is stored locally in Raycast and does not modify or lock the original CLI history."}
      />
    </Form>
  );
}

function groupSessions(
  sessions: ChatSession[],
  favoriteChats: Set<string>,
  favoriteProjects: Set<string>,
): Array<{ title: string; sessions: ChatSession[] }> {
  const favoriteChatSessions = sessions.filter((session) => favoriteChats.has(sessionKey(session)));
  const favoriteProjectSessions = sessions.filter(
    (session) => !favoriteChats.has(sessionKey(session)) && favoriteProjects.has(session.cwd),
  );
  const regularSessions = sessions.filter(
    (session) => !favoriteChats.has(sessionKey(session)) && !favoriteProjects.has(session.cwd),
  );
  const active: ChatSession[] = [];
  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const previousWeek: ChatSession[] = [];
  const older: ChatSession[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTimestamp = startOfToday.getTime();

  for (const session of regularSessions) {
    if (session.isActive) active.push(session);
    else if (session.updatedAt >= todayTimestamp) today.push(session);
    else if (session.updatedAt >= todayTimestamp - 86_400_000) yesterday.push(session);
    else if (session.updatedAt >= todayTimestamp - 604_800_000) previousWeek.push(session);
    else older.push(session);
  }

  return [
    { title: "Favorite Chats", sessions: favoriteChatSessions },
    { title: "Favorite Projects", sessions: favoriteProjectSessions },
    { title: "Live", sessions: active },
    { title: "Today", sessions: today },
    { title: "Yesterday", sessions: yesterday },
    { title: "Last 7 Days", sessions: previousWeek },
    { title: "Older", sessions: older },
  ].filter((section) => section.sessions.length > 0);
}

function groupHomeSessions(
  sessions: ChatSession[],
  favoriteChats: Set<string>,
  favoriteProjects: Set<string>,
): Array<{ title: string; sessions: ChatSession[] }> {
  const favoriteChatSessions = sessions.filter((session) => favoriteChats.has(sessionKey(session)));
  const favoriteProjectSessions = uniqueSessionsByProject(
    sessions.filter((session) => !favoriteChats.has(sessionKey(session)) && favoriteProjects.has(session.cwd)),
  );
  const liveSessions = sessions.filter(
    (session) => session.isActive && !favoriteChats.has(sessionKey(session)) && !favoriteProjects.has(session.cwd),
  );

  return [
    { title: "Favorite Chats", sessions: favoriteChatSessions },
    { title: "Favorite Projects", sessions: favoriteProjectSessions },
    { title: "Live", sessions: liveSessions },
  ].filter((section) => section.sessions.length > 0);
}

function groupHistorySessions(sessions: ChatSession[]): Array<{ title: string; sessions: ChatSession[] }> {
  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const previousWeek: ChatSession[] = [];
  const older: ChatSession[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTimestamp = startOfToday.getTime();

  for (const session of sessions) {
    if (session.updatedAt >= todayTimestamp) today.push(session);
    else if (session.updatedAt >= todayTimestamp - 86_400_000) yesterday.push(session);
    else if (session.updatedAt >= todayTimestamp - 604_800_000) previousWeek.push(session);
    else older.push(session);
  }

  return [
    { title: "Today", sessions: today },
    { title: "Yesterday", sessions: yesterday },
    { title: "Last 7 Days", sessions: previousWeek },
    { title: "Older", sessions: older },
  ].filter((section) => section.sessions.length > 0);
}

function uniqueSessionsByProject(sessions: ChatSession[]): ChatSession[] {
  const seen = new Set<string>();
  return sessions.filter((session) => {
    if (seen.has(session.cwd)) return false;
    seen.add(session.cwd);
    return true;
  });
}

function emptyTitle(filter: RootFilter): string {
  if (filter === "favorite-chats") return "No Favorite Chats";
  if (filter === "favorite-projects") return "No Favorite Projects";
  if (filter === "live") return "No Live Conversations";
  if (filter === "claude") return "No Claude History";
  if (filter === "codex") return "No Codex History";
  return "No Conversations Found";
}

function sessionKey(session: ChatSession): string {
  return `${session.provider}:${session.id}`;
}
