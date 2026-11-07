import { Project } from "@makeplane/plane-node-sdk";
import { planeClient, requirePlaneClient } from "./auth";

export async function getProjects({ perPage = 100, nextCursor }: { perPage?: number; nextCursor?: string }) {
  const response = await planeClient?.projectsApi.listProjects({
    slug: planeClient?.workspaceSlug,
    perPage,
    cursor: nextCursor,
  });

  return {
    data: response?.results || [],
    hasMore: !!response?.nextPageResults,
    cursor: response?.nextCursor,
  };
}

export async function getProject({ projectId }: { projectId: string }) {
  const response = await planeClient?.projectsApi.retrieveProject({ slug: planeClient?.workspaceSlug, pk: projectId });
  return response;
}

/** All projects (up to `maxPages` pages of 100). */
export async function getAllProjects({ maxPages = 3 }: { maxPages?: number } = {}): Promise<Project[]> {
  const client = requirePlaneClient();
  const projects: Project[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const response = await client.projectsApi.listProjects({ slug: client.workspaceSlug, perPage: 100, cursor });
    projects.push(...(response.results ?? []));
    if (!response.nextPageResults || !response.nextCursor) break;
    cursor = response.nextCursor;
  }
  return projects;
}

/** Projects the current user is an active member of, excluding archived ones. */
export async function getMemberProjects(): Promise<Project[]> {
  const projects = await getAllProjects();
  return projects.filter((project) => project.isMember !== false && !project.archivedAt);
}

/** Finds a project by identifier (`ENG`), name, or id. Case-insensitive. */
export function matchProject(projects: Project[], query: string): Project | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    projects.find((project) => project.identifier?.toLowerCase() === needle) ??
    projects.find((project) => project.id?.toLowerCase() === needle) ??
    projects.find((project) => project.name?.toLowerCase() === needle)
  );
}
