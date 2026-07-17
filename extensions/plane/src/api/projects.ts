import { planeClient } from "./auth";

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
