import { Tag, togglProject } from "@/api";
import { Project } from "@doist/todoist-api-typescript";
export const tagFiltering = (
  tag: Tag,
  selectProject: string | undefined,
  projects: Project[],
  togglProjects: togglProject[],
) => {
  if (selectProject === undefined) return true;
  const currentProject = projects?.find((data) => data.id === selectProject);
  const togglProjectId = currentProject?.name.includes("@")
    ? currentProject?.name.slice(currentProject?.name.indexOf("@") + 1)
    : null;
  const currentTogglProject = togglProjects?.find((data) => data.id === Number(togglProjectId));
  const filterJudge = togglProjectId ? tag.workspace_id === currentTogglProject?.workspace_id : true;
  return filterJudge;
};
