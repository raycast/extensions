import { createGist, deleteGist } from "./github";
import { getGitHubToken } from "./auth";
import { removeGistFromCachePayload } from "./cache-payload";
import { loadCache, saveCache } from "./storage";
import { buildSearchDocuments } from "./search";
import { CreateGistInput, GistRecord } from "./types";

export async function appendCreatedGistToCache(
  input: CreateGistInput,
): Promise<GistRecord> {
  const token = getGitHubToken();
  const gist = await createGist(token, input);
  const existing = await loadCache();

  if (existing) {
    const gists = [
      gist,
      ...existing.gists.filter((item) => item.id !== gist.id),
    ];
    await saveCache({
      gists,
      documents: buildSearchDocuments(gists),
      metadata: {
        ...existing.metadata,
        gistCount: gists.length,
      },
    });
  }

  return gist;
}

export async function deleteGistFromCache(gistId: string): Promise<void> {
  const token = getGitHubToken();
  await deleteGist(token, gistId);

  const existing = await loadCache();
  if (!existing) {
    return;
  }

  await saveCache(removeGistFromCachePayload(existing, gistId));
}
