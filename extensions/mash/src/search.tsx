import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedState, useExec, usePromise } from "@raycast/utils";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { useMemo, useState } from "react";
import {
  type AgentApp,
  type ReadText,
  claudeOwnedSessions,
  claudeSessionsFolder,
  installedAgentApps,
  isClaudeSessionFile,
  openInAgentApp,
} from "./agentApps";
import { agentIcon } from "./agentIcon";
import {
  type Hit,
  agentName,
  appLink,
  byActivity,
  chatLink,
  findMash,
  hasDesktopApp,
  failures,
  parseChats,
  recentChatsArguments,
  resumeCommand,
  rows,
  type Show,
  searchCommand,
  searchLink,
  type ViewChoice,
  viewChoice,
  stillComing,
  mashEnvironment,
} from "./mash";
import { ChatMessages, read } from "./chatMessages";
import { useStreamSearch } from "./stream";

const readText: ReadText = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
};

/** The Claude app's session files: one per session, under account and organisation folders. */
function claudeSessionFiles(home: string): string[] {
  const children = (folder: string): string[] => {
    try {
      return readdirSync(folder).map((name) => join(folder, name));
    } catch {
      return [];
    }
  };
  return children(claudeSessionsFolder(home))
    .flatMap(children)
    .flatMap(children)
    .filter((file) => isClaudeSessionFile(basename(file)));
}

/** Where a chat opens in its agent's own app, as these results need it. */
interface AgentLinks {
  readonly installed: readonly AgentApp[];
  readonly owned: ReadonlySet<string>;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const { mashPath, subagentMatches = false } = getPreferenceValues<Preferences>();
  const mash = useMemo(() => findMash(mashPath, homedir(), existsSync), [mashPath]);
  // Without the desktop app nothing opens mash:// links, so actions that
  // need one are offered only when it is installed.
  const hasApp = useMemo(() => hasDesktopApp(homedir(), existsSync), []);
  const [typed, setTyped] = useState(props.arguments.query ?? "");
  const query = typed.trim();
  const searching = mash !== undefined && query.length >= 2;
  // Every source at once (this machine by words and by meaning, and your
  // other machines), as one list that fills in as each answers. The choice
  // of chats or messages, and whose history, is kept between launches.
  const [view, setView] = useCachedState<ViewChoice>("view", "chats:all");
  const { show, scope } = viewChoice(view);
  const showing = (next: Show) => setView(`${next}:${scope}` as ViewChoice);
  const live = useStreamSearch(mash, query, scope, searching, subagentMatches);
  // Before anything is typed, the latest chats on this machine, as the
  // desktop panel shows. Listing reads metadata only, so it is quick. A
  // failure is shown in the list, not also as a toast on opening.
  const recent = useExec(mash ?? "mash", recentChatsArguments(), {
    env: mashEnvironment(),
    execute: mash !== undefined,
    parseOutput: read(parseChats),
    onError: () => undefined,
  });

  // Every hook runs before the early return below, as React requires.
  // Mash leaves subagent chats out of both unless the reader asks, in the
  // extension's preferences, for search to include them.
  const hits = searching ? rows(live.hits, show) : (recent.data ?? []);
  const byMessage = searching && show === "messages";
  const isLoading = searching ? !live.done : recent.isLoading;
  const shownError = searching ? live.error : recent.error;
  const coming = searching ? stillComing(live.sources) : "";
  const failed = searching ? failures(live.sources) : "";
  // This machine's agents' apps can open its own chats; another machine's
  // are withheld (see openInAgentApp).
  const installed = useMemo(() => installedAgentApps(homedir(), readText), []);
  const claudeChats = installed.some((app) => app.agent === "claude-code")
    ? hits.filter((hit) => hit.agent === "claude-code").map((hit) => hit.chatId)
    : [];
  const owned = usePromise(
    async (ids: string[]) =>
      ids.length ? claudeOwnedSessions(claudeSessionFiles(homedir()), ids, readText) : new Set<string>(),
    [claudeChats],
  );
  const links: AgentLinks = { installed, owned: owned.data ?? new Set() };

  if (!mash) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={mashPath ? "Mash isn’t at the location you set" : "Mash isn’t installed"}
          description="Install Mash, or set where it is in the Mash extension’s preferences."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="How to Install Mash"
                icon={Icon.Download}
                url="https://getmash.io/installation/"
              />
              <Action title="Set Mash Location" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={typed}
      onSearchTextChange={setTyped}
      throttle
      onSelectionChange={() => live.interact()}
      searchBarAccessory={
        <List.Dropdown
          tooltip="What to list, and whose history"
          value={view}
          onChange={(value) => setView(value as ViewChoice)}
        >
          {(["all", "local"] as const).map((where) => (
            <List.Dropdown.Section key={where} title={where === "all" ? "All Machines" : "This Machine"}>
              <List.Dropdown.Item
                title={`Chats · ${where === "all" ? "All machines" : "This machine"}`}
                value={`chats:${where}`}
                icon={Icon.Bubble}
              />
              <List.Dropdown.Item
                title={`Messages · ${where === "all" ? "All machines" : "This machine"}`}
                value={`messages:${where}`}
                icon={Icon.Text}
              />
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
      searchBarPlaceholder="Search your coding-agent history"
    >
      {shownError && hits.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={searching ? "Mash couldn’t search" : "Mash couldn’t list your chats"}
          description={shownError.message}
          actions={<Trouble retry={searching ? live.retry : recent.revalidate} hasApp={hasApp} />}
        />
      ) : !searching ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search what your agents and you said"
          description="Your latest chats on this machine appear here once Mash has indexed some."
          actions={hasApp ? <ActionPanel>{openApp}</ActionPanel> : undefined}
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={isLoading ? "Searching…" : `No chats mention “${query}”`}
          description={[
            hasApp
              ? "Press ⌘↵ to search every machine and by meaning in Mash."
              : "This searches this machine’s chats by their words. Try other words, or press ⌘↵ to copy a terminal search that also covers your other machines.",
            // Mash leaves these out unless asked; a search may have matched only them.
            subagentMatches ? "" : "Chats your agents started as subagents are left out.",
          ]
            .filter(Boolean)
            .join(" ")}
          actions={
            <ActionPanel>
              {fullSearch(query, hasApp)}
              {subagentMatches ? null : (
                <Action title="Include Subagent Chats…" icon={Icon.Gear} onAction={openExtensionPreferences} />
              )}
              <Action.OpenInBrowser
                title="How to Find a Missing Chat"
                icon={Icon.QuestionMarkCircle}
                url="https://getmash.io/find-missing-chat/"
              />
            </ActionPanel>
          }
        />
      )}
      {/* Grouped by last activity, as the panel groups them; the first
          heading also says which sources are still answering. */}
      {byActivity(hits, new Date()).map((group, index) => (
        <List.Section
          key={group.title ?? "undated"}
          title={group.title}
          subtitle={(index === 0 && coming) || undefined}
        >
          {group.hits.map((hit) => (
            <List.Item
              key={`${hit.machine ?? ""}/${hit.chatId}${byMessage ? `/${hit.messageId}` : ""}`}
              icon={{ value: agentIcon(hit.agent), tooltip: agentName(hit.agent) }}
              title={byMessage ? hit.passage.replace(/\s+/g, " ") || hit.title : hit.title}
              subtitle={projectName(hit.project)}
              accessories={hitAccessories(hit)}
              actions={
                <HitActions hit={hit} mash={mash} hasApp={hasApp} links={links}>
                  {searching ? (
                    <ShowActions
                      show={show}
                      choose={showing}
                      query={query}
                      hasApp={hasApp}
                      subagents={subagentMatches}
                    />
                  ) : null}
                </HitActions>
              }
            />
          ))}
        </List.Section>
      ))}
      {failed ? (
        <List.Section>
          <List.Item
            key="failed"
            icon={Icon.Warning}
            title={failed}
            accessories={[{ text: "↵ to retry" }]}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={live.retry} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

/**
 * A row's accessories: the tag for a match found only by meaning, the machine
 * a chat came from (none for this one) and when it was last active. Each icon
 * keeps its word, and each tooltip says what the value is.
 */
function hitAccessories(hit: Hit): List.Item.Accessory[] {
  return [
    ...(hit.byMeaning
      ? [{ tag: "by meaning", icon: Icon.Stars, tooltip: "Found by meaning, not by its exact words" }]
      : []),
    ...(hit.machine ? [{ icon: Icon.Monitor, text: hit.machine, tooltip: `Machine: ${hit.machine}` }] : []),
    ...(hit.updatedAt ? [{ date: hit.updatedAt, tooltip: `Last active ${hit.updatedAt.toLocaleString()}` }] : []),
  ];
}

/** The last folder of a chat's project, short enough for a list row. */
function projectName(project: string): string | undefined {
  return project ? basename(project) : undefined;
}

/** What to do when Mash fails: its message is above, these are the next steps. */
function Trouble({ retry, hasApp }: { retry: () => void; hasApp: boolean }) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
      <Action.OpenInBrowser
        title="Open Troubleshooting Guide"
        icon={Icon.QuestionMarkCircle}
        url="https://getmash.io/troubleshooting/"
      />
      {hasApp ? openApp : null}
      <Action.OpenInBrowser title="How to Install Mash" icon={Icon.Download} url="https://getmash.io/installation/" />
      <Action title="Set Mash Location" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

/** Mash's main window, named as the desktop panel names it. */
const openApp = (
  <Action.Open title="Open Mash" icon={Icon.AppWindow} target={appLink} shortcut={Keyboard.Shortcut.Common.Open} />
);

/**
 * What a search shows next: ⌘1 and ⌘2 switch between listing chats and
 * messages without the dropdown, then Mash's full search for the same words
 * and, while subagent chats are left out, the way to include them.
 */
function ShowActions({
  show,
  choose,
  query,
  hasApp,
  subagents,
}: {
  show: Show;
  choose: (show: Show) => void;
  query: string;
  hasApp: boolean;
  subagents: boolean;
}) {
  return (
    <ActionPanel.Section title="Show">
      {show === "messages" ? (
        <Action
          title="List Chats"
          icon={Icon.Bubble}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
          onAction={() => choose("chats")}
        />
      ) : (
        <Action
          title="List Messages"
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
          onAction={() => choose("messages")}
        />
      )}
      {fullSearch(query, hasApp)}
      {subagents ? null : (
        <Action title="Include Subagent Chats…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      )}
    </ActionPanel.Section>
  );
}

/**
 * A row's actions, in the panel's order: read the messages here, open the chat
 * in Mash (⌘↵, with the desktop app) or in its agent's own app (⌘O), then what
 * can be copied and, while searching, what to show (`children`).
 */
function HitActions({
  hit,
  mash,
  hasApp,
  links,
  children,
}: {
  hit: Hit;
  mash: string;
  hasApp: boolean;
  links: AgentLinks;
  children?: React.ReactNode;
}) {
  const inAgent = openInAgent(hit, links);
  const open = hasApp ? <Action.Open title="Open Chat in Mash" icon={Icon.AppWindow} target={chatLink(hit)} /> : null;
  return (
    <ActionPanel>
      <Action.Push
        title="Read Messages"
        icon={Icon.Text}
        target={
          <ChatMessages hit={hit} mash={mash}>
            {open}
            {inAgent}
            <CopyActions hit={hit} hasApp={hasApp} />
          </ChatMessages>
        }
      />
      {open}
      {inAgent}
      <CopyActions hit={hit} hasApp={hasApp} />
      {children}
    </ActionPanel>
  );
}

/** The action that opens the chat in its agent's own desktop app, when one is installed that can. */
function openInAgent(hit: Hit, links: AgentLinks) {
  const link = openInAgentApp(hit, links.installed, links.owned);
  return link ? (
    <Action.Open
      title={link.title}
      icon={agentIcon(hit.agent)}
      target={link.url}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  ) : null;
}

/**
 * What can be copied from a chat. A mash:// link opens only in the desktop
 * app, so without it the message ID takes the link's place: `mash view` and
 * an agent's Mash tools read the message by it.
 */
function CopyActions({ hit, hasApp }: { hit: Hit; hasApp: boolean }) {
  const resume = resumeCommand(hit);
  return (
    <ActionPanel.Section title="Copy">
      {resume ? (
        <Action.CopyToClipboard
          title="Copy Resume Command"
          icon={Icon.Terminal}
          content={resume}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      ) : null}
      {hasApp ? (
        <Action.CopyToClipboard
          title="Copy Link"
          icon={Icon.Link}
          content={chatLink(hit)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : (
        <Action.CopyToClipboard
          title="Copy Message ID"
          icon={Icon.Hashtag}
          content={hit.messageId}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      )}
      {hit.passage ? (
        <Action.CopyToClipboard title="Copy Passage" icon={Icon.QuoteBlock} content={hit.passage} />
      ) : null}
    </ActionPanel.Section>
  );
}

/**
 * Mash's full search for the same words, which also reads other machines: in
 * the desktop app when it is installed, else as a command to run.
 */
function fullSearch(query: string, hasApp: boolean) {
  // ⌘↵ belongs to the second action, Open Chat in Mash, so full search takes ⇧⌘F.
  const shortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "f" };
  return hasApp ? (
    <Action.Open title="Search Everywhere" icon={Icon.MagnifyingGlass} target={searchLink(query)} shortcut={shortcut} />
  ) : (
    <Action.CopyToClipboard
      title="Copy Search Command"
      icon={Icon.Terminal}
      content={searchCommand(query)}
      shortcut={shortcut}
    />
  );
}
