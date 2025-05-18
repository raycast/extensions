import { LocalStorage } from "@raycast/api";
import { Project, ProjectLink } from "../types";

const PROJECTS_KEY = "projects";
const LINKS_KEY = "project-links";

// Project operations
export async function getProjects(): Promise<Project[]> {
  const data = await LocalStorage.getItem<string>(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function addProject(project: Omit<Project, "id">): Promise<Project> {
  const projects = await getProjects();
  const newProject: Project = {
    ...project,
    id: Date.now().toString(),
  };
  await saveProjects([...projects, newProject]);
  return newProject;
}

export async function updateProject(project: Project): Promise<void> {
  const projects = await getProjects();
  const updatedProjects = projects.map((p) => (p.id === project.id ? project : p));
  await saveProjects(updatedProjects);
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  const filteredProjects = projects.filter((project) => project.id !== id);
  await saveProjects(filteredProjects);

  // Also delete all links associated with this project
  const links = await getLinks();
  const filteredLinks = links.filter((link) => link.projectId !== id);
  await saveLinks(filteredLinks);
}

// Link operations
export async function getLinks(projectId?: string): Promise<ProjectLink[]> {
  const data = await LocalStorage.getItem<string>(LINKS_KEY);
  const links = data ? JSON.parse(data) : [];
  return projectId ? links.filter((link: ProjectLink) => link.projectId === projectId) : links;
}

export async function saveLinks(links: ProjectLink[]): Promise<void> {
  await LocalStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

export async function addLink(link: Omit<ProjectLink, "id">): Promise<ProjectLink> {
  const links = await getLinks();
  const newLink: ProjectLink = {
    ...link,
    id: Date.now().toString(),
  };
  await saveLinks([...links, newLink]);
  return newLink;
}

export async function updateLink(link: ProjectLink): Promise<void> {
  const links = await getLinks();
  const updatedLinks = links.map((l) => (l.id === link.id ? link : l));
  await saveLinks(updatedLinks);
}

export async function deleteLink(id: string): Promise<void> {
  const links = await getLinks();
  const filteredLinks = links.filter((link) => link.id !== id);
  await saveLinks(filteredLinks);
}
