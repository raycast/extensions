import { ConnectionError, safeConnectionError, type ConnectionConfig } from "./config";
import { discoverCapabilities } from "./discovery";
import { getAvailability, loadProjects, runProjectAction, type Project, type ProjectAction } from "./projects";

/** Only plain, explicitly selected fields may cross Raycast AI's structured-clone boundary. */
export function serializeProject(project: Project) {
  return {
    id: project.id,
    name: project.name,
    lastModified: project.lastModified ?? null,
    duration: project.duration ?? null,
    size: project.size ?? null,
    isFavorite: project.isFavorite ?? null,
    isPinned: project.isPinned ?? null,
    isCloudOnly: project.isCloudOnly ?? null,
  };
}

export async function aiResult<T>(operation: () => Promise<T>) {
  try {
    return { status: "success" as const, data: await operation() };
  } catch (error) {
    const issue = safeConnectionError(error);
    return { status: "error" as const, title: issue.title, message: issue.message, retryAllowed: false };
  }
}

export async function aiListProjects(config: ConnectionConfig, query?: string) {
  if (query !== undefined && typeof query !== "string") {
    throw new ConnectionError("Invalid search", "Provide a text query or omit it to list all projects.");
  }
  const result = await loadProjects(config);
  const search = query?.trim().toLocaleLowerCase() ?? "";
  return {
    projects: result.projects
      .filter((project) => project.name.toLocaleLowerCase().includes(search))
      .map(serializeProject),
    cloudRefreshTimedOut: result.cloudRefreshTimedOut,
    availableOperations: result.available,
  };
}

export async function findAiProject(config: ConnectionConfig, projectId: string): Promise<Project> {
  if (typeof projectId !== "string" || !projectId.trim()) {
    throw new ConnectionError(
      "Project reference required",
      "Use a project ID returned by list-projects. Do not use a name as an ID.",
    );
  }
  const { projects } = await loadProjects(config);
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project)
    throw new ConnectionError(
      "Project not found",
      "List projects again and select an exact project ID. Ask the user when names are ambiguous.",
    );
  return project;
}

export type AiProjectAction = {
  action: ProjectAction;
  projectId: string;
  name?: string;
  enabled?: boolean;
};

export async function aiProjectAction(config: ConnectionConfig, input: AiProjectAction) {
  const project = await findAiProject(config, input.projectId);
  if (input.action === "renameProject" && (typeof input.name !== "string" || !input.name.trim())) {
    throw new ConnectionError("Name required", "Provide a nonempty new project name.");
  }
  if (input.action === "toggleFavorite" || input.action === "togglePin") {
    const current = input.action === "toggleFavorite" ? project.isFavorite : project.isPinned;
    if (typeof input.enabled !== "boolean" || typeof current !== "boolean") {
      throw new ConnectionError(
        "Project status unavailable",
        "The desired and current favorite or pinned status must both be known.",
      );
    }
    // AI expresses the desired state. Repeated requests must not toggle it back.
    if (current === input.enabled) return { changed: false, project: serializeProject(project) };
  }
  if (input.action === "renameProject" && project.name === input.name!.trim()) {
    return { changed: false, project: serializeProject(project) };
  }
  const updated = await runProjectAction(config, input.action, project, input.name);
  return { changed: true, project: serializeProject(updated) };
}

export async function aiConnectionStatus(config: ConnectionConfig) {
  const snapshot = await discoverCapabilities(config);
  return {
    checkedAt: snapshot.checkedAt,
    availableOperations: getAvailability(snapshot.tools),
    discoveredToolCount: snapshot.tools.length,
    note: "Point-in-time connection check for project operations. Text inspection and editing validate their editor schemas when invoked; discovery alone does not verify other workflows.",
  };
}
