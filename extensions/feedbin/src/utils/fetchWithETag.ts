import { Cache } from "@raycast/api";
import fetch, {
  Headers,
  Request,
  RequestInfo,
  RequestInit,
  Response,
} from "node-fetch";

export const etagCache = new Cache({ namespace: "etags" });

interface EtagCacheEntry {
  status: number;
  headers: [string, string][];
  body: string;
}

function storeEtagCacheEntry(url: string, eTagCacheEntry: EtagCacheEntry) {
  const newEtagCached = JSON.stringify(eTagCacheEntry);
  etagCache.set(url, newEtagCached);
}

function getEtagCacheEntry(url: string): EtagCacheEntry | null {
  const previousEtagCached = etagCache.get(url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return previousEtagCached ? (JSON.parse(previousEtagCached) as any) : null;
}

/**
 * Fetches a resource with ETag caching.
 * @param input - The resource to fetch.
 * @param requestInit - The RequestInit object to include in the request. This can contain various properties like method, headers, body, etc.
 * @returns A Promise that resolves to the Response object representing the fetched resource.
 */
export async function fetchWithETag(
  input: RequestInfo,
  { headers, ...restFetchOptions }: RequestInit = {},
): Promise<Response> {
  const url = input instanceof Request ? input.url : input.toString();

  const previousEtagCacheEntry = getEtagCacheEntry(url);
  const previousEntryHeaders = new Headers(previousEtagCacheEntry?.headers);
  const newHeaders = new Headers(headers);

  const previousEtag = previousEntryHeaders.get("ETag");
  const previousLastModified = previousEntryHeaders.get("Last-Modified");
  if (previousEtag) {
    newHeaders.set("If-None-Match", previousEtag);
  }

  if (previousLastModified) {
    newHeaders.set("If-Modified-Since", previousLastModified);
  }

  const res = await fetch(input, {
    headers: newHeaders,
    ...restFetchOptions,
  });

  if (res.status === 304 && previousEtagCacheEntry) {
    return new Response(previousEtagCacheEntry.body, {
      status: previousEtagCacheEntry.status,
      headers: previousEntryHeaders,
    });
  } else {
    const clone = res.clone();
    res.text().then((newData) => {
      if (res.headers.has("ETag")) {
        storeEtagCacheEntry(url, {
          headers: [...res.headers.entries()],
          body: newData,
          status: res.status,
        });
      }
    });

    return clone;
  }
}
