import { Detail, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { gitlab } from "./common";
import { ProjectNavMenusList } from "./components/project_nav";
import { getErrorMessage } from "./utils";

export default function ProjectViewRoot(props: LaunchProps<{ arguments: Arguments.ProjectView }>) {
  const projectId = Number.parseInt(props.arguments.projectId, 10);
  const {
    data: project,
    isLoading,
    error,
  } = useCachedPromise((id: number) => gitlab.getProject(id), [projectId], { execute: projectId > 0 });

  if (isLoading && !project) {
    return <Detail isLoading markdown="" />;
  }
  if (error || !project) {
    return <Detail markdown={`## Error\n\n${getErrorMessage(error ?? "Project not found")}`} />;
  }
  return <ProjectNavMenusList project={project} />;
}
