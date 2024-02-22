import { List } from "@raycast/api";

import useCachedData from "../hooks/useCachedData";

import ProjectTasks from "./ProjectTasks";

function Project({ projectId }: { projectId: string }) {
  const [data] = useCachedData();

  const project = data?.projects.find((project) => project.id === projectId);

  return (
    <List navigationTitle={project?.name} searchBarPlaceholder="Filter tasks by name, label, or priority">
      <ProjectTasks projectId={projectId} />
    </List>
  );
}

export default Project;
