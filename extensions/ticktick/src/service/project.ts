import { getProjectId2Project } from "./osScript";

export interface Project {
  id: string;
  name: string;
}

let projectId2Project: Record<string, Project> = {};

export const initGlobalProjectInfo = async () => {
  projectId2Project = await getProjectId2Project();
};

export const getProjectNameById = (projectId: Project["id"]): string | undefined => {
  return projectId2Project[projectId]?.name;
};
