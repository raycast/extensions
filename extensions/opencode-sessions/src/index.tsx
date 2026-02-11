import { Icon, List } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";

import { ProjectDropdown } from "./components/ProjectDropdown";
import { SessionListItem } from "./components/SessionListItem";
import { useSessions } from "./hooks/useSessions";
import { groupSessionsByTime } from "./utils";

export default function ListSessions() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const { sessions, projects, isLoading, storageError, mutate } = useSessions();

  // Only show projects that have at least one session
  const projectsWithSessions = useMemo(() => {
    const projectIDs = new Set(sessions.map((s) => s.session.projectID));

    return projects.filter((p) => projectIDs.has(p.id));
  }, [sessions, projects]);

  // Fall back to "all" if the stored project ID no longer exists (e.g. after deletion)
  const validProject = useMemo(() => {
    if (selectedProject === "all") {
      return "all";
    }

    return projectsWithSessions.some((p) => p.id === selectedProject) ? selectedProject : "all";
  }, [selectedProject, projectsWithSessions]);

  const handleProjectChange = useCallback((projectID: string) => {
    setSelectedProject(projectID);
  }, []);

  const filtered = useMemo(
    () => (validProject === "all" ? sessions : sessions.filter((s) => s.session.projectID === validProject)),
    [sessions, validProject],
  );

  const grouped = useMemo(() => groupSessionsByTime(filtered), [filtered]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions..."
      filtering
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
              <SessionListItem key={session.id} session={session} project={project} mutate={mutate} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
