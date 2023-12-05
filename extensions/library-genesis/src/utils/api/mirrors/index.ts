// Copy from libgen library (https://www.npmjs.com/package/libgen), adjusted for RayCast
import fetch from "node-fetch";

import type { BookEntry } from "@/types";

export interface Mirror {
  baseUrl: string;
  parse?: (content: string, libgenUrl?: string) => BookEntry[];
}

const mirrors: Array<Mirror> = [
  {
    baseUrl: "https://libgen.is",
  },
  {
    baseUrl: "https://libgen.rs",
  },
];

async function timeConnection(url: string, abortSignal?: AbortSignal): Promise<{ url: string; time: number } | false> {
  const start = Date.now();

  try {
    const abortController = new AbortController();
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        abortController.abort();
      });
    }
    const timeout = setTimeout(() => {
      abortController.abort();
    }, 4000);
    await fetch(url, {
      method: "HEAD",
      signal: abortController.signal,
    });
    clearTimeout(timeout);

    const results = {
      url: url,
      time: Date.now() - start,
    };
    return results;
  } catch (err) {
    // async.map will fail if any of the timeConnections returns an error, but
    // we only care that at least one succeeds; so fail silently
    console.error(err);
  }
  return false;
}

// @param {Array} urls Can be an array of request objects or URL strings
// @param {Function] callback
async function faster(urls: string[], abortSignal?: AbortSignal) {
  const speedTests = urls.map(async (value) => {
    return await timeConnection(value, abortSignal);
  });
  const results = await Promise.all(speedTests);

  const noResponses = results.every((value) => {
    return !value;
  });

  if (noResponses) return new Error("Bad response from all mirrors");

  const sorted = (results as Array<{ url: string; time: number }>).sort((a, b) => {
    return a.time - b.time;
  });

  return sorted[0].url;
}

export async function mirror(abortSignal?: AbortSignal): Promise<string | null> {
  const urls = mirrors.map((value) => {
    return `${value.baseUrl}/json.php?ids=1&fields=*`;
  });

  try {
    const fastest = await faster(urls, abortSignal);
    if (fastest instanceof Error) {
      throw fastest;
    }
    return mirrors.filter((value) => {
      return fastest.indexOf(value.baseUrl) === 0;
    })[0].baseUrl;
  } catch (err) {
    console.error(err);
  }
  return null;
}
