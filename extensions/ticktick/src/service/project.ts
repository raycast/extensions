import { getProjects as getProjectsFromApp } from "./osScript";
import { LocalStorage } from "@raycast/api";

export interface Project {
  id: string;
  name: string;
}

let projects: Project[] = [];
let projectId2Project: Record<string, Project> = {};
(async () => {
  try {
    const [projectsJson, projectId2ProjectJson] = await Promise.all([
      LocalStorage.getItem("projects"),
      LocalStorage.getItem("projectId2Project"),
    ]);
    if (typeof projectsJson === "string" && typeof projectId2ProjectJson === "string") {
      projects = JSON.parse(projectsJson);
      projectId2Project = JSON.parse(projectId2ProjectJson);
    }
  } catch (error) {
    // error
  }
})();

export const initGlobalProjectInfo = async () => {
  projects = await getProjectsFromApp();
  projects.forEach((project) => {
    projectId2Project[project.id] = project;
  });
  LocalStorage.setItem("projects", JSON.stringify(projects));
  LocalStorage.setItem("projectId2Project", JSON.stringify(projectId2Project));
};

export const getProjectNameById = (projectId: Project["id"]): string | undefined => {
  return projectId2Project[projectId]?.name;
};

export const getProjects = () => {
  return projects;
};
