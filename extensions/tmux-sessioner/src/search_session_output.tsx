import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { captureAllPanes, focusPane, type PaneContent } from "./utils/paneUtils";
import { openSessionInTerminal, switchToSession } from "./utils/sessionUtils";
import { checkTerminalSetup } from "./utils/terminalUtils";
import { SelectTerminalApp } from "./SelectTerminalApp";
import { getTerminalCapabilities, type OpenTarget, type TerminalCapabilities } from "./utils/terminalLaunchUtils";

interface Match {
  pane: PaneContent;
  lineIndex: number;
  line: string;
}

interface SessionMatches {
  sessionName: string;
  matches: Match[];
  total: number;
}

const MIN_QUERY_LENGTH = 2;
const MAX_MATCHES_PER_SESSION = 100;
const CONTEXT_LINES = 8;

function contextMarkdown(match: Match): string {
  const { lines } = match.pane;
  const start = Math.max(0, match.lineIndex - CONTEXT_LINES);
  const end = Math.min(lines.length, match.lineIndex + CONTEXT_LINES + 1);
  const snippet = lines
    .slice(start, end)
    .map((line, offset) => `${start + offset === match.lineIndex ? "▶ " : "  "}${line}`)
    .join("\n");

  return `\`\`\`\n${snippet}\n\`\`\``;
}

export default function Command() {
  const [panes, setPanes] = useState<PaneContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);
  const [terminalCapabilities, setTerminalCapabilities] = useState<TerminalCapabilities | null>(null);
  const [searchText, setSearchText] = useState("");

  const loadPanes = useCallback(async () => {
    setIsLoading(true);

    try {
      setPanes(await captureAllPanes());
    } catch (e) {
      console.error(`exec error: ${e}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read tmux sessions 😢",
        message: e instanceof Error ? e.message : String(e),
      });
    }

    setIsLoading(false);
  }, []);

  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      // Searching never needs the terminal; only switching/opening does
      await checkTerminalSetup(setIsTerminalSetup);
      setTerminalCapabilities(await getTerminalCapabilities());
      await loadPanes();
    })();
  }, []);

  useEffect(() => {
    if (isTerminalSetup) {
      (async () => setTerminalCapabilities(await getTerminalCapabilities()))();
    }
  }, [isTerminalSetup]);

  const requireTerminal = (action: () => void) => {
    if (isTerminalSetup) {
      action();
      return;
    }

    push(<SelectTerminalApp setIsTerminalSetup={setIsTerminalSetup} />);
  };

  const query = searchText.trim().toLowerCase();

  const results = useMemo<SessionMatches[]>(() => {
    if (query.length < MIN_QUERY_LENGTH) {
      return [];
    }

    const bySession = new Map<string, { matches: Match[]; seen: Set<string>; total: number }>();

    // Most-recently-active panes first, so when the same line exists in several
    // panes of a session the dedup keeps the newest occurrence
    const orderedPanes = [...panes].sort((a, b) => b.windowActivity - a.windowActivity);

    for (const pane of orderedPanes) {
      // Walk newest lines first so the most recent occurrence wins
      for (let lineIndex = pane.lines.length - 1; lineIndex >= 0; lineIndex--) {
        const line = pane.lines[lineIndex];

        if (!line.toLowerCase().includes(query)) {
          continue;
        }

        const group = bySession.get(pane.sessionName) ?? { matches: [], seen: new Set<string>(), total: 0 };
        group.total += 1;

        // Repeated prompts/commands would drown the results; keep one per distinct line
        if (!group.seen.has(line) && group.matches.length < MAX_MATCHES_PER_SESSION) {
          group.seen.add(line);
          group.matches.push({ pane, lineIndex, line });
        }

        bySession.set(pane.sessionName, group);
      }
    }

    return [...bySession.entries()]
      .map(([sessionName, group]) => ({ sessionName, matches: group.matches, total: group.total }))
      .sort((a, b) => a.sessionName.localeCompare(b.sessionName));
  }, [panes, query]);

  const hasResults = results.length > 0;

  const focusMatch = async (match: Match) => {
    try {
      await focusPane(match.pane.paneId);
    } catch (e) {
      console.error(`exec error: ${e}`);
    }
  };

  const switchToMatch = async (match: Match) => {
    await focusMatch(match);
    switchToSession(match.pane.sessionName, setIsLoading);
  };

  const openMatch = async (match: Match, target: OpenTarget) => {
    await focusMatch(match);
    await openSessionInTerminal(match.pane.sessionName, target, setIsLoading);
  };

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search commands and output across all tmux sessions…"
      isShowingDetail={hasResults}
      throttle
    >
      {!hasResults && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query.length < MIN_QUERY_LENGTH ? "Search Session Output" : "No Matches"}
          description={
            query.length < MIN_QUERY_LENGTH
              ? `Type at least ${MIN_QUERY_LENGTH} characters to search the scrollback of ${panes.length} ${panes.length === 1 ? "pane" : "panes"}`
              : "Nothing in any session's scrollback matches your search"
          }
        />
      )}
      {results.map((group) => (
        <List.Section
          key={group.sessionName}
          title={group.sessionName}
          subtitle={
            group.total > group.matches.length
              ? `${group.matches.length} distinct of ${group.total} matches`
              : `${group.total} ${group.total === 1 ? "match" : "matches"}`
          }
        >
          {group.matches.map((match) => {
            return (
              <List.Item
                key={`${match.pane.paneId}:${match.lineIndex}`}
                icon={Icon.Terminal}
                title={match.line.trim()}
                accessories={[{ tag: `window ${match.pane.windowIndex}`, tooltip: "tmux window index" }]}
                detail={<List.Item.Detail markdown={contextMarkdown(match)} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Switch to Session"
                        icon={Icon.ArrowRight}
                        onAction={() => requireTerminal(() => switchToMatch(match))}
                      />
                      {terminalCapabilities?.supportsTab && (
                        <Action
                          title="Open in New Tab"
                          icon={Icon.PlusSquare}
                          onAction={() => requireTerminal(() => openMatch(match, "tab"))}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                        />
                      )}
                      {terminalCapabilities?.supportsWindow && (
                        <Action
                          title="Open in New Window"
                          icon={Icon.NewDocument}
                          onAction={() => requireTerminal(() => openMatch(match, "window"))}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Line"
                        content={match.line.trim()}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action
                        title="Reload Scrollback"
                        icon={Icon.ArrowClockwise}
                        onAction={loadPanes}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
