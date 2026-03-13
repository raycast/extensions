import { buildSearchDocuments } from "./search";
import { CachePayload } from "./types";

export function removeGistFromCachePayload(
  payload: CachePayload,
  gistId: string,
): CachePayload {
  const gists = payload.gists.filter((gist) => gist.id !== gistId);

  return {
    gists,
    documents: buildSearchDocuments(gists),
    metadata: {
      ...payload.metadata,
      gistCount: gists.length,
    },
  };
}
