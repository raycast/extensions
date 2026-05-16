import { List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ReactNode, createContext, useContext, useState } from "react";

import { listProjects, Project } from "../src/api/projects";

type ProjectContextType = {
  projects: Project[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
};

export const ProjectsContext = createContext<ProjectContextType>({
  projects: [],
  selectedId: null,
  setSelectedId: () => null,
});

export function WithProjects({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useCachedPromise(async () => (await listProjects()).results, [], {
    keepPreviousData: true,
    onError: (e) => showFailureToast(e, { title: "Couldn't load PostHog projects" }),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Check your API key and data region" description={error.message} />
      </List>
    );
  }

  if (!data && isLoading) return <List isLoading={true} />;

  return (
    <ProjectsContext.Provider value={{ projects: data ?? [], selectedId, setSelectedId }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function ProjectSelector() {
  const { projects, setSelectedId } = useContext(ProjectsContext);

  return (
    <List.Dropdown tooltip="Filter Project" onChange={setSelectedId} storeValue>
      <List.Dropdown.Section>
        {projects.map((project) => (
          <List.Dropdown.Item key={project.id} title={project.name} value={project.id.toString()} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
