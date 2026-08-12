import { Icon, List } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";

import { ProjectDropdown } from "./components/ProjectDropdown";
import { SessionListItem } from "./components/SessionListItem";
import { OpenSession, useContentSearch, useOpenSessions, useSessions } from "./hooks/useSessions";
import { SessionWithProject } from "./types";
import { groupSessionsByTime } from "./utils";

function getLiveness(openSessions: OpenSession[], sessionId: string): OpenSession["liveness"] | undefined {
  return openSessions.find((o) => o.id === sessionId)?.liveness;
}

function sortByLiveness(sessions: SessionWithProject[], openSessions: OpenSession[]): SessionWithProject[] {
  return [...sessions].sort((a, b) => {
    const aLive = getLiveness(openSessions, a.session.id);
    const bLive = getLiveness(openSessions, b.session.id);
    const livenessOrder = (l: typeof aLive) => (l === "active" ? 0 : l === "open" ? 1 : 2);
    const diff = livenessOrder(aLive) - livenessOrder(bLive);
    return diff !== 0 ? diff : b.session.time.updated - a.session.time.updated;
  });
}

export default function SearchSessions() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const { sessions, projects, isLoading: sessionsLoading, storageError, mutate } = useSessions();
  const { data: rawOpen } = useOpenSessions();
  const openSessions: OpenSession[] = Array.isArray(rawOpen) ? rawOpen : [];

  const isSearching = searchText.length >= 3;
  const { data: searchResults = [], isLoading: searchLoading } = useContentSearch(searchText);

  const handleProjectChange = useCallback((projectID: string) => {
    setSelectedProject(projectID);
  }, []);

  // Only show projects that have at least one session
  const projectsWithSessions = useMemo(() => {
    const projectIDs = new Set(sessions.map((s) => s.session.projectID));
    return projects.filter((p) => projectIDs.has(p.id));
  }, [sessions, projects]);

  // Fall back to "all" if stored project no longer exists
  const validProject = useMemo(() => {
    if (selectedProject === "all") return "all";
    return projectsWithSessions.some((p) => p.id === selectedProject) ? selectedProject : "all";
  }, [selectedProject, projectsWithSessions]);

  // Build project lookup for search results
  const projectMap = useMemo(() => {
    const map = new Map<string, (typeof projects)[0]>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const isLoading = isSearching ? searchLoading : sessionsLoading;

  if (isSearching) {
    // Search mode: flat results sorted by relevance (already sorted by searchSessions)
    const searchSessionsWithProjects: SessionWithProject[] = searchResults
      .map((session) => ({
        session,
        project: projectMap.get(session.projectID),
      }))
      .filter(({ session }) => validProject === "all" || session.projectID === validProject);

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search sessions by title or content..."
        filtering={false}
        onSearchTextChange={setSearchText}
        throttle
        searchBarAccessory={<ProjectDropdown projects={projectsWithSessions} onProjectChange={handleProjectChange} />}
      >
        {searchSessionsWithProjects.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No Matches"
            description="Try a different search term (min 3 characters)."
            icon={Icon.MagnifyingGlass}
          />
        ) : (
          searchSessionsWithProjects.map(({ session, project }) => (
            <SessionListItem
              key={session.id}
              session={session}
              project={project}
              liveness={getLiveness(openSessions, session.id)}
              mutate={mutate}
            />
          ))
        )}
      </List>
    );
  }

  // Default mode: time-grouped, liveness-sorted
  const filtered = validProject === "all" ? sessions : sessions.filter((s) => s.session.projectID === validProject);
  const sorted = sortByLiveness(filtered, openSessions);
  const grouped = groupSessionsByTime(sorted);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions by title or content..."
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={<ProjectDropdown projects={projectsWithSessions} onProjectChange={handleProjectChange} />}
    >
      {storageError ? (
        <List.EmptyView title="Storage Error" description={storageError} icon={Icon.ExclamationMark} />
      ) : filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Sessions Found"
          description={
            selectedProject === "all"
              ? "No OpenCode sessions found. Start a session with opencode to see it here."
              : "No sessions found for this project."
          }
          icon={Icon.Terminal}
        />
      ) : (
        grouped.map(([section, items]) => (
          <List.Section key={section} title={section}>
            {items.map(({ session, project }) => (
              <SessionListItem
                key={session.id}
                session={session}
                project={project}
                liveness={getLiveness(openSessions, session.id)}
                mutate={mutate}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
