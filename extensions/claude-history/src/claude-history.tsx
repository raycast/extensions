import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import {
  discoverAllSessions,
  discoverProjects,
  searchHistory,
} from "./lib/claude-data.js";
import { useFavourites } from "./lib/favourites.js";
import { parseSessionExchanges } from "./lib/session-parser.js";
import { DETAIL_PREVIEW_EXCHANGES } from "./lib/constants.js";
import {
  exchangesToMarkdown,
  relativeTime,
  truncate,
} from "./lib/formatters.js";
import { openInFinder, openInVSCode } from "./lib/actions.js";
import type { SessionSummary } from "./lib/types.js";
import SessionListItem from "./components/SessionListItem.js";
import ProjectListItem from "./components/ProjectListItem.js";

type ViewMode = "sessions" | "favourites" | "projects" | "search";

export default function ClaudeSessions() {
  const [viewMode, setViewMode] = useState<ViewMode>("sessions");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isSearchMode = viewMode === "search";
  const isProjectsMode = viewMode === "projects";
  const isSessionsMode = viewMode === "sessions" || viewMode === "favourites";

  return (
    <List
      isLoading={false}
      isShowingDetail={isSessionsMode}
      filtering={false}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      throttle
      searchBarPlaceholder={
        isSearchMode
          ? "Search prompts..."
          : isProjectsMode
            ? "Filter projects..."
            : "Filter sessions..."
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          onChange={(val) => {
            setViewMode(val as ViewMode);
            setSearchText("");
          }}
        >
          <List.Dropdown.Item
            title="Sessions"
            value="sessions"
            icon={Icon.List}
          />
          <List.Dropdown.Item
            title="Favourites"
            value="favourites"
            icon={Icon.Star}
          />
          <List.Dropdown.Item
            title="Projects"
            value="projects"
            icon={Icon.Folder}
          />
          <List.Dropdown.Item
            title="Search History"
            value="search"
            icon={Icon.MagnifyingGlass}
          />
        </List.Dropdown>
      }
    >
      {isSessionsMode && (
        <SessionsView
          viewMode={viewMode}
          selectedId={selectedId}
          filterText={searchText}
        />
      )}
      {isProjectsMode && <ProjectsView filterText={searchText} />}
      {isSearchMode && <SearchView query={searchText} />}
    </List>
  );
}

// --- Sessions View ---

function SessionsView({
  viewMode,
  selectedId,
  filterText,
}: {
  viewMode: ViewMode;
  selectedId: string | null;
  filterText: string;
}) {
  const sessions = useMemo(() => discoverAllSessions(), []);
  const { isFavourite, toggleFavourite } = useFavourites();

  // Load detail markdown only for the selected session
  const selectedSession = useMemo(
    () => sessions.find((s) => s.filePath === selectedId),
    [sessions, selectedId],
  );

  const { data: selectedExchanges } = useCachedPromise(
    (fp) => parseSessionExchanges(fp, DETAIL_PREVIEW_EXCHANGES),
    [selectedSession?.filePath ?? ""],
    { execute: !!selectedSession?.filePath },
  );

  const selectedMarkdown = selectedExchanges
    ? exchangesToMarkdown(selectedExchanges)
    : undefined;

  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (viewMode === "favourites") {
      list = list.filter((s) => isFavourite(s.sessionId));
    }
    if (filterText) {
      const lower = filterText.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstPrompt.toLowerCase().includes(lower) ||
          s.projectDisplayName.toLowerCase().includes(lower) ||
          (s.gitBranch && s.gitBranch.toLowerCase().includes(lower)),
      );
    }
    return list;
  }, [sessions, viewMode, isFavourite, filterText]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, SessionSummary[]>();
    for (const session of filteredSessions) {
      const key = session.projectDisplayName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(session);
    }
    return map;
  }, [filteredSessions]);

  if (filteredSessions.length === 0) {
    return (
      <List.EmptyView
        title={
          viewMode === "favourites" ? "No Favourites" : "No Sessions Found"
        }
        description={
          viewMode === "favourites"
            ? "Press Cmd+F on a session to add it to favourites"
            : filterText
              ? `No sessions matching "${filterText}"`
              : "No Claude Code sessions found in ~/.claude/"
        }
        icon={viewMode === "favourites" ? Icon.Star : Icon.MagnifyingGlass}
      />
    );
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([projectName, projectSessions]) => (
        <List.Section
          key={projectName}
          title={projectName}
          subtitle={`${projectSessions.length} sessions`}
        >
          {projectSessions.map((session) => (
            <SessionListItem
              key={session.filePath}
              session={session}
              isFavourite={isFavourite(session.sessionId)}
              onToggleFavourite={() => toggleFavourite(session.sessionId)}
              detailMarkdown={
                session.filePath === selectedId ? selectedMarkdown : undefined
              }
            />
          ))}
        </List.Section>
      ))}
    </>
  );
}

// --- Projects View ---

function ProjectsView({ filterText }: { filterText: string }) {
  const allProjects = useMemo(() => discoverProjects(), []);

  const projects = useMemo(() => {
    if (!filterText) return allProjects;
    const lower = filterText.toLowerCase();
    return allProjects.filter(
      (p) =>
        p.displayName.toLowerCase().includes(lower) ||
        p.decodedPath.toLowerCase().includes(lower),
    );
  }, [allProjects, filterText]);

  if (projects.length === 0) {
    return (
      <List.EmptyView
        title="No Projects Found"
        description={
          filterText
            ? `No projects matching "${filterText}"`
            : "No Claude Code projects found in ~/.claude/"
        }
        icon={Icon.Folder}
      />
    );
  }

  return (
    <>
      {projects.map((project) => (
        <ProjectListItem key={project.encodedPath} project={project} />
      ))}
    </>
  );
}

// --- Search View ---

function SearchView({ query }: { query: string }) {
  const results = useMemo(() => searchHistory(query), [query]);

  if (query.length === 0) {
    return (
      <List.EmptyView
        title="Search Your Claude History"
        description="Start typing to search across all your Claude Code prompts"
        icon={Icon.MagnifyingGlass}
      />
    );
  }

  if (results.length === 0) {
    return (
      <List.EmptyView
        title="No Results"
        description={`No prompts matching "${query}"`}
        icon={Icon.XMarkCircle}
      />
    );
  }

  return (
    <>
      {results.map((entry, idx) => {
        const date = new Date(entry.timestamp);
        const projectName = entry.project.split("/").pop() ?? entry.project;

        return (
          <List.Item
            key={`${entry.sessionId ?? ""}-${entry.timestamp}-${idx}`}
            title={truncate(entry.display, 100)}
            subtitle={projectName}
            accessories={[
              { text: relativeTime(date), tooltip: date.toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                {entry.sessionId && (
                  <Action
                    title="Copy Resume Command"
                    icon={Icon.Terminal}
                    onAction={async () => {
                      const cmd = `cd ${entry.project} && claude -r ${entry.sessionId}`;
                      await Clipboard.copy(cmd);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Resume command copied",
                      });
                    }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Prompt"
                  content={entry.display}
                />
                <Action
                  title="Open Project in Finder"
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={() => openInFinder(entry.project)}
                />
                <Action
                  title="Open Project in VS Code"
                  icon={Icon.Code}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  onAction={() => openInVSCode(entry.project)}
                />
                {entry.sessionId && (
                  <Action.CopyToClipboard
                    title="Copy Session Id"
                    content={entry.sessionId}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </>
  );
}
