import { getGitHubToken } from "./auth";
import { fetchRawFileContent, getGist, listAllGists } from "./github";
import { buildSearchDocuments } from "./search";
import { shouldFetchFullTruncatedContent } from "./preferences";
import { saveCache } from "./storage";
import { CachePayload, GistRecord, SyncMetadata, SyncResult } from "./types";

const INDEX_VERSION = 2;

async function hydrateGistContents(
  token: string,
  gists: GistRecord[],
): Promise<GistRecord[]> {
  return Promise.all(gists.map((gist) => getGist(token, gist.id)));
}

async function hydrateTruncatedContent(
  gists: GistRecord[],
  enabled: boolean,
): Promise<{
  gists: GistRecord[];
  truncatedFilesFetched: number;
  failedFileFetches: number;
}> {
  if (!enabled) {
    return { gists, truncatedFilesFetched: 0, failedFileFetches: 0 };
  }

  let truncatedFilesFetched = 0;
  let failedFileFetches = 0;

  const hydrated = await Promise.all(
    gists.map(async (gist) => {
      const files = await Promise.all(
        gist.files.map(async (file) => {
          if (!file.truncated || !file.rawUrl) {
            return file;
          }

          try {
            const content = await fetchRawFileContent(file.rawUrl);
            truncatedFilesFetched += 1;
            return { ...file, content };
          } catch {
            failedFileFetches += 1;
            return file;
          }
        }),
      );

      return { ...gist, files };
    }),
  );

  return { gists: hydrated, truncatedFilesFetched, failedFileFetches };
}

export async function syncAllGists(): Promise<{
  payload: CachePayload;
  result: SyncResult;
}> {
  const startedAt = Date.now();
  const token = getGitHubToken();
  const fetchFullTruncatedContent = shouldFetchFullTruncatedContent();

  const rawGists = await listAllGists(token);
  const detailedGists = await hydrateGistContents(token, rawGists);
  const hydrated = await hydrateTruncatedContent(
    detailedGists,
    fetchFullTruncatedContent,
  );
  const documents = buildSearchDocuments(hydrated.gists);

  const metadata: SyncMetadata = {
    lastSyncedAt: new Date().toISOString(),
    gistCount: hydrated.gists.length,
    indexVersion: INDEX_VERSION,
  };

  const payload: CachePayload = {
    gists: hydrated.gists,
    documents,
    metadata,
  };

  await saveCache(payload);

  const result: SyncResult = {
    gistCount: hydrated.gists.length,
    fileCount: hydrated.gists.reduce((sum, gist) => sum + gist.files.length, 0),
    truncatedFilesFetched: hydrated.truncatedFilesFetched,
    failedFileFetches: hydrated.failedFileFetches,
    durationMs: Date.now() - startedAt,
    metadata,
  };

  return { payload, result };
}
