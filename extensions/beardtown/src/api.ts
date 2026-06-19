import { open, showToast, Toast } from "@raycast/api";
import { DEFAULT_PAGE_SIZE, RESPONSE_CACHE_TTL_MS, UUID, responseCache } from "./config";
import type { ApiRecord, ChallengeEntry, ChallengeFilter, PagedResult } from "./types";
import {
  canWatchOnYouTube,
  getFirstRecord,
  getNextPage,
  getNextPageUrl,
  getPerPage,
  getRecords,
  getRecordJsonUrl,
  getResourceUrl,
  getYouTubeUrl,
  parsePageNumber,
  sortEntries,
  toChallengeEntries,
  toTShirtEntries,
  unwrapRecord,
} from "./lib/records";

export class RequestError extends Error {
  status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.name = "RequestError";
    this.status = status;
  }
}

export async function requestJson(url: string): Promise<unknown> {
  const cached = readCachedJson(url);
  if (cached !== null) {
    return cached;
  }

  const response = await fetch(url, {
    headers: {
      "X-API-Token": UUID,
    },
  });

  if (!response.ok) {
    throw new RequestError(response.status);
  }

  const parsed = (await response.json()) as unknown;
  writeCachedJson(url, parsed);
  return parsed;
}

function readCachedJson(url: string): unknown | null {
  const raw = responseCache.get(url);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { at: number; value: unknown };
    if (Date.now() - parsed.at > RESPONSE_CACHE_TTL_MS) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

function writeCachedJson(url: string, value: unknown): void {
  try {
    responseCache.set(url, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Ignore cache write failures and keep request flow working.
  }
}

export async function fetchPaginatedChallenges(
  filter: ChallengeFilter,
  options: { page?: number; url?: string },
): Promise<PagedResult> {
  const pageUrl = new URL(options.url ?? getResourceUrl(filter));

  if (!options.url) {
    pageUrl.searchParams.set("page", String(options.page ?? 1));
    pageUrl.searchParams.set("limit", String(DEFAULT_PAGE_SIZE));
  }

  const payload = await requestJson(pageUrl.toString());
  const records = getRecords(payload);
  const nextUrl = getNextPageUrl(payload, pageUrl.toString());

  return {
    records,
    nextUrl,
    nextPage: nextUrl ? parsePageNumber(nextUrl) : getNextPage(payload),
    pageSize: getPerPage(payload) ?? DEFAULT_PAGE_SIZE,
  };
}

export async function fetchAllEntriesForFilter(filter: ChallengeFilter): Promise<ChallengeEntry[]> {
  let nextUrl: string | null = getResourceUrl(filter);
  let page = 1;
  let startIndex = 0;
  const allEntries: ChallengeEntry[] = [];

  while (nextUrl) {
    const result = await fetchPaginatedChallenges(
      filter,
      nextUrl === getResourceUrl(filter) ? { page } : { url: nextUrl },
    );
    const pageEntries =
      filter === "tshirts"
        ? toTShirtEntries(result.records, startIndex)
        : toChallengeEntries(result.records, filter, startIndex);
    allEntries.push(...pageEntries);

    if (!result.nextUrl && !result.nextPage) {
      break;
    }

    startIndex += result.records.length;
    nextUrl = result.nextUrl;
    page = result.nextPage ?? page + 1;

    if (!nextUrl && result.nextPage) {
      nextUrl = getResourceUrl(filter);
    }
  }

  return sortEntries(allEntries, filter);
}

export async function hydrateChallengeRecords(records: ApiRecord[]): Promise<ApiRecord[]> {
  return Promise.all(
    records.map(async (record) => {
      const jsonUrl = getRecordJsonUrl(record);
      if (!jsonUrl) {
        return record;
      }

      try {
        const payload = await requestJson(jsonUrl);
        const fullRecord = getFirstRecord(payload);
        return fullRecord ? unwrapRecord(fullRecord) : record;
      } catch {
        return record;
      }
    }),
  );
}

export async function openChallengeYouTube(record: ApiRecord): Promise<void> {
  const directUrl = getYouTubeUrl(record);
  if (directUrl) {
    await open(directUrl);
    return;
  }

  const jsonUrl = getRecordJsonUrl(record);
  if (!jsonUrl || !canWatchOnYouTube(record)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No YouTube video found",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Loading YouTube video",
  });

  try {
    const payload = await requestJson(jsonUrl);
    const fullRecord = getFirstRecord(payload);
    const resolvedUrl = fullRecord ? getYouTubeUrl(unwrapRecord(fullRecord)) : null;

    if (!resolvedUrl) {
      toast.style = Toast.Style.Failure;
      toast.title = "No YouTube video found";
      return;
    }

    toast.hide();
    await open(resolvedUrl);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to load YouTube video";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}
