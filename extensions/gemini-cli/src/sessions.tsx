import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getProjects, getSessions } from "./lib/data";
import { SessionActions } from "./components/SessionActions";

export default function Command() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const { data: projects = [], isLoading: isLoadingProjects } = usePromise(getProjects, []);

  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    revalidate: revalidateSessions,
  } = usePromise(
    async (projects) => {
      if (projects.length === 0) return [];
      return getSessions(projects);
    },
    [projects],
  );

  const filteredSessions = sessions.filter((session) => {
    if (selectedProjectId === "all") return true;
    return session.projectId === selectedProjectId;
  });

  return (
    <List
      isLoading={isLoadingProjects || isLoadingSessions}
      searchBarPlaceholder="Search sessions..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Project"
          storeValue={true}
          onChange={(newValue) => setSelectedProjectId(newValue)}
        >
          <List.Dropdown.Item title="All Projects" value="all" />
          {projects.map((project) => (
            <List.Dropdown.Item key={project.id} title={project.name} value={project.id} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredSessions.map((session) => (
        <List.Item
          key={session.id}
          title={session.title.length > 80 ? session.title.substring(0, 80) + "..." : session.title}
          subtitle={session.projectName}
          accessories={[
            { icon: Icon.Message, text: session.messageCount.toString(), tooltip: "Messages" },
            { date: new Date(session.lastUpdated), tooltip: "Last Updated" },
          ]}
          actions={
            <SessionActions
              session={session}
              mutate={async () => {
                await revalidateSessions();
              }}
            />
          }
        />
      ))}
      {filteredSessions.length === 0 && !isLoadingProjects && !isLoadingSessions && (
        <List.EmptyView
          title="No Sessions Found"
          description="Try selecting a different project or running Gemini CLI to create a session."
        />
      )}
    </List>
  );
}
