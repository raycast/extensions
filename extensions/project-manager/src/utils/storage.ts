import { LocalStorage } from "@raycast/api";

export type EditorType = "cursor" | "vscode" | "zed" | "webstorm" | "sublime";

export interface Project {
  id: string;
  name: string;
  path: string;
  terminal: "ghostty" | "iterm" | "terminal";
  editor: EditorType;
  workspaceFile?: string; // Chemin optionnel vers un fichier .workspace
  claudeCodeCommand: string; // Commande pour lancer Claude Code (ex: "cc", "claude code")
}

const STORAGE_KEY = "projects";

export async function getProjects(): Promise<Project[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) {
    return [];
  }
  return JSON.parse(data);
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export async function addProject(project: Omit<Project, "id">): Promise<void> {
  const projects = await getProjects();
  const newProject: Project = {
    ...project,
    id: Date.now().toString(),
  };
  projects.push(newProject);
  await saveProjects(projects);
}

export async function updateProject(id: string, updates: Partial<Omit<Project, "id">>): Promise<void> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error("Project not found");
  }
  projects[index] = { ...projects[index], ...updates };
  await saveProjects(projects);
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  const filtered = projects.filter((p) => p.id !== id);
  await saveProjects(filtered);
}
