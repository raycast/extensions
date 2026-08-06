import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  type Image,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { basename } from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgentSearch, type IndexReport } from "./hooks/useAgentSearch";
import { useOrcaTerminals } from "./hooks/useOrcaTerminals";
import { useSessionContext } from "./hooks/useSessionContext";
import {
  HEADER_GAP,
  fallbackText,
  paneMarkdown,
  renderPane,
  sessionHeader,
} from "./lib/detail";
import { openPath, resolveEditor } from "./lib/editor";
import { effectiveAgent, parseIgnoreList } from "./lib/filter";
import {
  fitWidth,
  padTimeColumn,
  PROJECT_EM,
  relativeTime,
  snippet,
} from "./lib/format";
import { findPaths } from "./lib/links";
import {
  type OrcaTerminal,
  findTerminalForSession,
  focusOrca,
  liveSessionKey,
  openFileInOrca,
  resumeCommand,
  switchTerminal,
} from "./lib/orca";
import { displayPath, setSupportPath } from "./lib/paths";
import { projectTitle } from "./lib/projects";
import { AGENTS, isAgent, type ParsedQuery } from "./lib/query";
import { installRipgrep } from "./lib/ripgrep";
import { activeBackend } from "./lib/search";
import { resolveTerminal, resumeInTerminal } from "./lib/terminal";
import type { Agent, Row, SessionMeta } from "./lib/types";

/**
 * The one search-bar dropdown Raycast allows, so agent and project share it and
 * are mutually exclusive: the collapsed dropdown shows the selected item's
 * title, and a scope it cannot name is a filter the user cannot see. The two
 * still combine by typing `agent:codex` alongside a selected project, since the
 * query token and the dropdown scope both reach `makeFilter`.
 */
type Scope = "all" | `agent:${Agent}` | `project:${string}`;

const AGENT_SCOPE = (agent: Agent): Scope => `agent:${agent}`;
const PROJECT_SCOPE = (path: string): Scope => `project:${path}`;

/**
 * The dropdown's item values are plain strings, and this is the one place that
 * turns one back into a filter. `isAgent` guards the cast: the picker can hand
 * back a value restored from an older version of this list, naming an agent
 * that no longer exists.
 */
function decodeScope(scope: Scope): {
  agentOverride?: Agent;
  projectPath?: string;
} {
  if (scope.startsWith("agent:")) {
    const value = scope.slice("agent:".length);
    return isAgent(value) ? { agentOverride: value } : {};
  }
  if (scope.startsWith("project:"))
    return { projectPath: scope.slice("project:".length) };
  return {};
}

const AGENT_TITLE: Record<Agent, string> = {
  claude: "Claude",
  codex: "Codex",
};

// Brand marks from assets/. Claude's SVG carries its own orange, so it is left
// untinted; the OpenAI mark is monochrome black and would vanish in the dark
// theme, so it is tinted with the theme-adaptive primary text color. Raycast
// has no icon-size prop, so both SVGs are padded via their viewBox to sit a
// little smaller than the row's icon slot.
const AGENT_ICON: Record<Agent, Image.ImageLike> = {
  claude: { source: "claude.svg" },
  codex: { source: "codex.svg", tintColor: Color.PrimaryText },
};

// Raycast cannot badge a list icon, so the live-session dot is composited into
// the mark itself, at its bottom-right corner. A tint would recolor the dot
// along with the mark, so each Codex composite hardcodes the fill the tint
// above would have produced, one file per theme.
const AGENT_ICON_LIVE: Record<Agent, Image.ImageLike> = {
  claude: { source: "claude-live.svg" },
  codex: {
    source: { light: "codex-live-light.svg", dark: "codex-live-dark.svg" },
  },
};

// Where the derived corpus and any installed ripgrep live. Raycast asks that an
// extension keep its files here so that removing the extension removes them
// too, and nothing under `src/lib` may import `@raycast/api` — the unit suite
// runs those modules in plain Node — so the path is injected from the one file
// that has both. Module scope, because it has to be settled before the first
// index refresh or search can read it.
setSupportPath(environment.supportPath);

// Preferences cannot change while a command is running, so reading them once at
// module load keeps the work off every render. The search root is required, so
// Raycast collects it before this ever runs rather than the manifest guessing a
// directory the user does not have; `|| ""` guards the ignore list, which is
// merely defaulted, and an empty one correctly ignores nothing.
const preferences = getPreferenceValues<Preferences>();
const IGNORE = parseIgnoreList(preferences.ignoreList || "");
const SEARCH_ROOT = preferences.searchRoot || "";
// Both dropdowns are required, so Raycast has collected them before this runs
// and where things open is settled for the life of the command.
const TERMINAL = resolveTerminal(preferences.terminalApp);
const EDITOR = resolveEditor(preferences.editorApp);

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [includeOutsideRoot, setIncludeOutsideRoot] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // Resolved once, in an initialiser, rather than per render: it probes the
  // filesystem, and the only thing that can change it while the command is open
  // is the install action, which sets this itself.
  const [needsRipgrep, setNeedsRipgrep] = useState(
    () => activeBackend().kind === "grep",
  );

  const { agentOverride, projectPath } = decodeScope(scope);

  const config = useMemo(
    () => ({
      searchRoot: SEARCH_ROOT,
      ignore: IGNORE,
      includeOutsideRoot,
      agentOverride,
      projectPath,
    }),
    [includeOutsideRoot, agentOverride, projectPath],
  );

  // Written below, once the rows are in hand, and read by the result store when
  // it next builds rows. See `ResultStore.pinned`.
  const pinnedRef = useRef<string | undefined>(undefined);

  const {
    rows,
    projects,
    query,
    isLoading,
    indexing,
    indexReport,
    error,
    truncated,
    freeze,
  } = useAgentSearch(searchText, config, pinnedRef);

  // The selected project needs an item behind it even when it is not in the
  // list: the recency cap can evict it, and narrowing back to the search root
  // can retire it entirely. Pinning it keeps the dropdown showing the scope in
  // force. Dropping it would silently discard a filter the user set, which is
  // worse than a scope that returns nothing.
  const offered =
    projectPath && !projects.some((p) => p.path === projectPath)
      ? [
          {
            path: projectPath,
            title: projectTitle(projectPath),
            keywords: [] as string[],
          },
          ...projects,
        ]
      : projects;

  const orca = useOrcaTerminals(TERMINAL.isOrca);
  // Naming an override the query has already beaten would name a filter that is
  // not applied, so the empty state uses whichever one won.
  const scopeAgent = effectiveAgent(query.agent, config.agentOverride);
  const scopeLabel = projectPath
    ? projectTitle(projectPath)
    : scopeAgent && !query.agent
      ? AGENT_TITLE[scopeAgent]
      : undefined;
  const empty = emptyState({
    error,
    indexing,
    truncated,
    report: indexReport,
    query,
    searchText,
    scopeLabel,
  });

  const rowsRef = useRef<Row[]>(rows);
  rowsRef.current = rows;

  // The row whose transcript is worth reading. Raycast reports no selection on
  // the first frame, and reports a stale one for the frame after a query or
  // scope change replaces the list; with neither resolving to a row on screen,
  // nothing reads its transcript and the pane sits on the flattened fallback.
  // The top row is what Raycast is about to select in both cases.
  const activeKey = rows.some((r) => r.session.key === selected)
    ? selected
    : rows[0]?.session.key;

  // Only with the pane open: a closed pane has nothing to protect, and pinning
  // a row the user cannot see would just misrank the list. Kept in a ref rather
  // than passed down, because what reads it is a flush that happens between
  // renders.
  pinnedRef.current = showDetail ? (activeKey ?? undefined) : undefined;

  // Freezing on the first arrow-down is what guarantees the highlighted row
  // never moves out from under the user while results are still streaming.
  // The id is also tracked, because only the selected row reads its transcript.
  const onSelectionChange = useCallback(
    (id: string | null) => {
      if (id && rowsRef.current[0]?.session.key !== id) freeze();
      setSelected(id);
    },
    [freeze],
  );

  // Failures and truncated sweeps need somewhere that stays visible with rows on
  // screen: a partial sweep otherwise looks identical to a complete one, and the
  // empty view cannot say so while rows exist. A toast, not the window title —
  // the root command's navigation title belongs to Raycast, and rewriting it
  // from state is what the store guidelines rule out.
  //
  // Only the partial sweep truncates, and it ORs the query words, so the advice
  // has to be REPLACE a common word, not add a rare one. `dir:`/`agent:` are
  // stripped by parseQuery and applied after the sweep returns, so they cannot
  // shrink it at all.
  const [statusTitle, statusMessage] = error
    ? ["Search Failed", error]
    : truncated
      ? ["Partial Results", "Replace a common word with a rarer one."]
      : [undefined, undefined];

  // Raised on change rather than on render. Truncation persists across every
  // keystroke of a common-word query, and re-raising it each time would bury
  // the list under a toast the user has already read. The two strings are the
  // dependency rather than an object holding them, which would be a fresh
  // identity every render and so no dependency at all.
  useEffect(() => {
    if (statusTitle)
      showToast({
        style: Toast.Style.Failure,
        title: statusTitle,
        message: statusMessage,
      });
  }, [statusTitle, statusMessage]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={showDetail}
      throttle
      onSearchTextChange={setSearchText}
      onSelectionChange={onSelectionChange}
      searchBarPlaceholder="Search Claude and Codex sessions"
      searchBarAccessory={
        <List.Dropdown
          // The placeholder stays clean, so the query tokens are named here,
          // including the only way to combine an agent with a project.
          tooltip="Filter sessions, or type dir:pixie agent:claude"
          value={scope}
          onChange={(v) => setScope(v as Scope)}
        >
          <List.Dropdown.Item
            title="All Sessions"
            value="all"
            icon={Icon.Layers}
          />
          <List.Dropdown.Section title="Agent">
            {AGENTS.map((agent) => (
              <List.Dropdown.Item
                key={agent}
                title={AGENT_TITLE[agent]}
                value={AGENT_SCOPE(agent)}
                icon={AGENT_ICON[agent]}
              />
            ))}
          </List.Dropdown.Section>
          {offered.length ? (
            <List.Dropdown.Section title="Project">
              {offered.map((p) => (
                <List.Dropdown.Item
                  key={p.path}
                  title={p.title}
                  value={PROJECT_SCOPE(p.path)}
                  icon={Icon.Folder}
                  keywords={p.keywords}
                />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        actions={
          <ActionPanel>
            <Action
              title={
                includeOutsideRoot
                  ? `Limit Search to ${SEARCH_ROOT}`
                  : `Search Outside ${SEARCH_ROOT}`
              }
              icon={Icon.Globe}
              onAction={() => setIncludeOutsideRoot((v) => !v)}
            />
            <SettingsAction />
            {needsRipgrep ? (
              <InstallRipgrepAction
                onInstalled={() => setNeedsRipgrep(false)}
              />
            ) : null}
            {error || indexReport ? (
              <Action.CopyToClipboard
                title="Copy Details"
                content={
                  error ?? (indexReport ? formatIndexReport(indexReport) : "")
                }
              />
            ) : null}
          </ActionPanel>
        }
      />
      {rows.map((row) => (
        <SessionItem
          key={row.session.key}
          row={row}
          words={query.words}
          liveHandle={orca.live.get(liveSessionKey(row.session))}
          terminals={orca.terminals}
          showDetail={showDetail}
          isSelected={row.session.key === activeKey}
          needsRipgrep={needsRipgrep}
          onInstalledRipgrep={() => setNeedsRipgrep(false)}
          onToggleDetail={() => setShowDetail((v) => !v)}
        />
      ))}
    </List>
  );
}

/**
 * Every preference is extension-level, so this lands on the panel holding all
 * four rather than on a per-command one. Offered from the empty view as well as
 * the rows, since the states that most need it (a list the search root has
 * emptied, a search that failed for want of ripgrep) have no rows to offer it
 * from.
 */
function SettingsAction() {
  return (
    <Action
      title="Open Extension Settings"
      icon={Icon.Gear}
      // Not the bare modifier, which Raycast keeps for its own settings window.
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "," },
        Windows: { modifiers: ["ctrl", "shift"], key: "," },
      }}
      onAction={openExtensionPreferences}
    />
  );
}

/**
 * Offered only while the search is running on system grep, which works but is
 * roughly forty times slower on a corpus this size. One click rather than a
 * package manager the user has to go and find: the download is a pinned release
 * checked against a digest compiled into the extension, and a failure anywhere
 * in it leaves grep exactly where it was.
 *
 * `onInstalled` re-reads the backend rather than trusting the install, since the
 * next search resolves it again from disk regardless.
 */
function InstallRipgrepAction({ onInstalled }: { onInstalled: () => void }) {
  return (
    <Action
      title="Install Ripgrep for Faster Search"
      icon={Icon.Download}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Installing Ripgrep…",
        });
        try {
          await installRipgrep();
          toast.style = Toast.Style.Success;
          toast.title = "Ripgrep Installed";
          toast.message = "Searches from here on use it.";
          onInstalled();
        } catch (err) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could Not Install Ripgrep";
          // Named rather than swallowed: a checksum mismatch, an offline
          // machine and an unsupported architecture want different responses,
          // and searching carries on either way.
          toast.message = err instanceof Error ? err.message : String(err);
        }
      }}
    />
  );
}

function formatIndexReport(report: IndexReport): string {
  const verb = report.rebuilt ? "Re-indexed" : "Updated";
  const noun = report.filesIndexed === 1 ? "transcript" : "transcripts";
  const seconds = (report.ms / 1000).toFixed(1);
  return `${verb} ${report.filesIndexed} ${noun} in ${seconds}s, ${report.sessions} sessions indexed`;
}

/**
 * Icon, title and description are decided together because they were previously
 * three independent branch chains over the same state, and two of them drifted
 * into contradicting each other ("Indexing transcripts…" above "No session
 * matched every word", and "No sessions indexed yet" above a successful index
 * report). Each branch below has to name all three, so that cannot recur.
 */
function emptyState(args: {
  error?: string;
  indexing: boolean;
  truncated: boolean;
  report?: IndexReport;
  query: ParsedQuery;
  searchText: string;
  /** The dropdown scope, already resolved to what is actually being applied. */
  scopeLabel?: string;
}): { icon: Icon; title: string; description?: string } {
  const { error, indexing, truncated, report, query, searchText, scopeLabel } =
    args;

  if (error)
    return { icon: Icon.Warning, title: "Search failed", description: error };

  if (indexing) {
    return {
      icon: Icon.Clock,
      title: "Indexing transcripts…",
      description: searchText
        ? "Searching as transcripts are indexed. Results will keep arriving."
        : "Transcripts are indexed when the command opens.",
    };
  }

  if (searchText) {
    const unknown = query.unknownAgents[0];
    if (unknown) {
      return {
        icon: Icon.QuestionMark,
        title: "No matching sessions",
        description: `"${unknown}" is not a known agent. Use agent:claude or agent:codex.`,
      };
    }
    const filters = [
      ...(scopeLabel ? [scopeLabel] : []),
      ...query.dirs.map((d) => `dir:${d}`),
      ...(query.agent ? [`agent:${query.agent}`] : []),
    ];
    if (filters.length && query.words.length === 0) {
      return {
        icon: Icon.MagnifyingGlass,
        title: "No matching sessions",
        description: `No session matched ${filters.join(" ")}.`,
      };
    }
    return {
      icon: Icon.MagnifyingGlass,
      title: "No matching sessions",
      description: filters.length
        ? `No session matched every word under ${filters.join(" ")}.`
        : // The toast already carries the rarity advice when the sweep
          // truncated; repeating it here would be the third copy.
          truncated
          ? undefined
          : "No session matched every word. Try fewer or rarer words.",
    };
  }

  if (report && report.sessions === 0) {
    return {
      icon: Icon.Tray,
      title: "No sessions indexed yet",
      description: formatIndexReport(report),
    };
  }
  // With no query typed, the dropdown scope is the only thing that can empty the
  // list, so name it rather than say "the current filters". A project pinned
  // after its sessions went away lands here, with no other clue as to which
  // filter to change.
  return {
    icon: Icon.Filter,
    title: scopeLabel
      ? `No sessions in ${scopeLabel}`
      : "No sessions match the current filters",
    description: report
      ? formatIndexReport(report)
      : "Transcripts are indexed when the command opens.",
  };
}

function SessionItem({
  row,
  words,
  liveHandle,
  terminals,
  showDetail,
  isSelected,
  needsRipgrep,
  onInstalledRipgrep,
  onToggleDetail,
}: {
  row: Row;
  words: string[];
  liveHandle?: string;
  terminals: OrcaTerminal[];
  showDetail: boolean;
  isSelected: boolean;
  /** True only while the search is falling back to system grep. */
  needsRipgrep: boolean;
  onInstalledRipgrep: () => void;
  onToggleDetail: () => void;
}) {
  const { session, hit } = row;

  const { messages, isLoading } = useSessionContext(
    session,
    hit?.seq,
    words,
    showDetail && isSelected,
  );

  // Rows are rebuilt on every flush, up to twenty times a second while results
  // stream, and every one of them re-renders. Row objects are identity-stable
  // across builds that changed nothing (see `rowsEqual`), so keying on them
  // means each pane's text is assembled once rather than per flush.
  //
  // Rendering is cached apart from marking because only the query moves while
  // the user types. This half embeds images, which costs a filesystem probe per
  // marker, and the messages behind it are identity-stable by design (see
  // `useSessionContext`) — so a keystroke that changes only the query no longer
  // re-runs any of it.
  const rendered = useMemo(
    // An image marker can name its source relative to the project root, so the
    // session's own directory is what resolves it.
    () => (showDetail ? renderPane(messages, { cwd: session.cwd }) : []),
    [showDetail, messages, session.cwd],
  );

  const markdown = useMemo(
    () =>
      showDetail
        ? `${sessionHeader(session)}${HEADER_GAP}${paneMarkdown(
            rendered,
            fallbackText(session, hit),
            // The same words the row's subtitle is centred on, marked here so
            // the hit is findable in a screen of transcript.
            words,
          )}`
        : "",
    [showDetail, rendered, session, hit, words],
  );

  // Found with the pane rather than when the submenu opens. The search probes
  // the filesystem for every path-shaped token, which sounds like something to
  // defer, but it measures at a few milliseconds against the tens the
  // transcript read beside it already costs. Tying it to the messages is also
  // what keeps it honest: the list is built from exactly the window the pane
  // renders, so it cannot name files from a stretch no longer on screen.
  const files = useMemo(
    () =>
      findPaths(messages.map((message) => message.text).join("\n"), {
        cwd: session.cwd,
      }),
    [messages, session.cwd],
  );

  // Kept with the pane open. The pane's header carries the same facts, but it
  // scrolls away with the transcript, and these stay put.
  const accessories: List.Item.Accessory[] = [];
  if (session.project)
    accessories.push({
      // With the pane open the row is too narrow to hold every project name
      // beside a stamp padded to the column width, and it is the stamp that
      // gets clipped. The tooltip carries the whole path either way.
      text: {
        value: showDetail
          ? fitWidth(session.project, PROJECT_EM)
          : session.project,
        color: Color.SecondaryText,
      },
      tooltip: session.cwd,
    });
  accessories.push({
    text: {
      value: padTimeColumn(relativeTime(session.mtimeMs)),
      color: Color.PrimaryText,
    },
    tooltip: new Date(session.mtimeMs).toLocaleString(),
  });

  return (
    <List.Item
      id={session.key}
      icon={(liveHandle ? AGENT_ICON_LIVE : AGENT_ICON)[session.agent]}
      title={session.title || session.id}
      subtitle={!showDetail && hit ? snippet(hit.text, words) : undefined}
      accessories={accessories}
      detail={
        showDetail ? (
          // Markdown only. A List.Item.Detail renders its metadata "in the
          // bottom side", under a markdown area of fixed height, so a table
          // here does not cost the transcript rows. It costs the same share of
          // the pane whether it holds two rows or six, and no arrangement of
          // rows moves that boundary, so what the table held is written into
          // the markdown instead (see `sessionHeader`) and onto the row's
          // accessories.
          <List.Item.Detail
            markdown={markdown}
            // The fallback chunk is on screen while this runs, so the spinner
            // marks it as provisional rather than standing in for it.
            isLoading={isLoading}
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={
              liveHandle
                ? "Focus Session in Orca"
                : `Resume Session in ${TERMINAL.name}`
            }
            icon={liveHandle ? Icon.Eye : Icon.Play}
            onAction={() => focusOrResume(session, terminals, liveHandle)}
          />
          <Action.Open
            title="Open Project Folder"
            target={session.cwd}
            icon={Icon.Folder}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "return" },
              Windows: { modifiers: ["ctrl"], key: "return" },
            }}
          />
          <Action
            title="Open Raw Transcript"
            icon={Icon.Document}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => openFile(session.file)}
          />
          {/* Offered once the pane's read has landed and what it read named a
              file. Naming none is the ordinary case rather than the rare one —
              a screen of design talk names nothing — and an empty submenu is a
              dead end. Not titled for Orca, which takes a file only when it
              belongs to a worktree. */}
          {files.length ? (
            <ActionPanel.Submenu
              title="Open File…"
              icon={Icon.Code}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
            >
              {files.map((file) => (
                <Action
                  key={file}
                  // Relative to the project, which the pane already names, so
                  // the submenu's narrow rows spend their width on the tail
                  // that differs rather than on the prefix every row shares.
                  title={displayPath(file, session.cwd)}
                  icon={Icon.Document}
                  onAction={() => openFile(file)}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
          <Action
            title={showDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            // Bare Tab, which Raycast leaves unbound in a list, so nothing
            // here competes for it. A modifierless key keeps peeking at a row
            // cheap enough to do while scrolling.
            shortcut={{ modifiers: [], key: "tab" }}
            onAction={onToggleDetail}
          />
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={session.id}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Resume Command"
            content={resumeCommand(session)}
          />
          <SettingsAction />
          {needsRipgrep ? (
            <InstallRipgrepAction onInstalled={onInstalledRipgrep} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

/**
 * Focus the Orca pane already running this session, or start it in the chosen
 * terminal.
 *
 * Only Orca can be asked what it is already running, so reattaching applies
 * only when Orca is the resolved terminal — which is never the case on Windows,
 * where Orca does not exist. Everything under that degrades in
 * `resumeInTerminal`, which falls back to the terminal that ships with the OS;
 * only that failing too reaches the clipboard here.
 */
async function focusOrResume(
  session: SessionMeta,
  terminals: OrcaTerminal[],
  liveHandle?: string,
) {
  const command = resumeCommand(session);
  try {
    if (TERMINAL.isOrca) {
      const handle =
        liveHandle ?? (await findTerminalForSession(session, terminals));
      if (handle) {
        await switchTerminal(handle);
        await closeMainWindow();
        return;
      }
    }
    await resumeInTerminal(TERMINAL, session.cwd, command);
    await closeMainWindow();
  } catch (e) {
    await Clipboard.copy(command);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not resume the session",
      message: `${e instanceof Error ? e.message : String(e)}. Resume command copied to clipboard.`,
    });
  }
}

/**
 * Open a file in the app the user chose, or in the Orca worktree holding it.
 *
 * Orca takes only what is inside a worktree, and a transcript lives outside one
 * while a path a transcript names may point anywhere, so the fallback is the
 * common case rather than the error case.
 */
async function openFile(path: string) {
  if (EDITOR.kind === "orca") {
    try {
      await openFileInOrca(path);
      // `orca file open` opens the tab without activating the app, so without
      // this the file lands in a window nobody is looking at. A failure to focus
      // is not a failure to open, so it must not reach the fallback.
      await focusOrca().catch(() => {});
      return;
    } catch {
      // In no worktree, or Orca is not running. Either way the openers below
      // are what can still show the file.
    }
  }
  try {
    await openPath(path, EDITOR);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open ${basename(path)}`,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
