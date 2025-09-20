import { LocalStorage } from "@raycast/api";
import { ProjectItem } from "./types";

export async function getProjects(): Promise<ProjectItem[]> {
  const { projects } = await LocalStorage.allItems();
  if (!projects) return [];

  return JSON.parse(projects);
}

export async function saveProjects(projects: ProjectItem[]) {
  await LocalStorage.setItem("projects", JSON.stringify(projects));
}
export async function deleteProject(project: ProjectItem) {
  const projects = await getProjects();
  if (!projects) {
    throw new Error("Projects not exist");
  }

  const filtered = projects.filter((item) => item.path !== project.path);
  await saveProjects(filtered);
}
