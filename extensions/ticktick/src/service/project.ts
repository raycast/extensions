import { getProjects as getProjectsFromApp } from "./osScript";

export interface Project {
  id: string;
  name: string;
}

const projectId2Project: Record<string, Project> = {};
let projects: Project[] = [];

export const initGlobalProjectInfo = async () => {
  projects = await getProjectsFromApp();
  projects.forEach((project) => {
    projectId2Project[project.id] = project;
  });
};

export const getProjectNameById = (projectId: Project["id"]): string | undefined => {
  return projectId2Project[projectId]?.name;
};

export const getProjects = () => {
  return projects;
};
