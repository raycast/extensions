import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "./api/projects";
import ResultItem from "./components/ResultItem";

export default function Command() {
  const { data: projects, isLoading } = useCachedPromise(getProjects, [], { execute: true });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {projects &&
        projects.map((project) => (
          <ResultItem key={project.id} id={project.id} title={project.name} result={project} type={"project"} />
        ))}

      {!projects && <List.EmptyView title="No Projects" description="No projects found" />}
    </List>
  );
}
