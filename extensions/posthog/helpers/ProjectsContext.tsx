import { ReactNode, createContext, useContext, useState } from "react";
import { usePostHogClient } from "./usePostHogClient";
import { List } from "@raycast/api";
import ErrorHandler from "../src/error-handler";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: Project[];
};

type Project = {
  id: number;
  name: string;
};

type ProjectContextType = { projects: Project[]; selectedId: string | null; setSelectedId: (id: string) => void };

export const ProjectsContext = createContext<ProjectContextType>({
  projects: [],
  selectedId: null,
  setSelectedId: () => null,
});

export function WithProjects({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = usePostHogClient<SearchResult>("projects");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!data && isLoading) {
    return <List isLoading={true}></List>;
  }

  return (
    <ErrorHandler error={error}>
      <ProjectsContext.Provider
        value={{ projects: data?.results || [], selectedId, setSelectedId: (id) => setSelectedId(id) }}
      >
        {children}
      </ProjectsContext.Provider>
    </ErrorHandler>
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
