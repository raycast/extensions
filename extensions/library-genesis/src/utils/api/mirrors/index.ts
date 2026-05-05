// Copy from libgen library (https://www.npmjs.com/package/libgen), adjusted for RayCast
import fetch from "node-fetch";

import type { BookEntry } from "@/types";
import { parseContentIntoBooks } from "@/utils/api/mirrors/default";
import { DEFAULT_MIRROR } from "@/utils/constants";

export type Parser = (content: string, libgenUrl?: string) => BookEntry[];
export interface Mirror {
  baseUrl: string;
  parse: Parser;
}

export const mirrors: Array<Mirror> = [
  {
    baseUrl: "https://libgen.bz",
    parse: parseContentIntoBooks,
  },
  {
    baseUrl: "https://libgen.li",
    parse: parseContentIntoBooks,
  },
];

export const getMirror = (libgenUrl: string | null): Mirror => {
  const mirror = mirrors.find((value) => {
    return value.baseUrl === libgenUrl;
  });
  return mirror
    ? mirror
    : {
        baseUrl: libgenUrl || DEFAULT_MIRROR.url,
        parse: parseContentIntoBooks,
      };
};

interface MirrorResponse {
  url: string;
  time: number;
  errored: boolean;
}

async function timeConnection(url: string, abortSignal?: AbortSignal): Promise<MirrorResponse> {
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
      errored: false,
    };
    return results;
  } catch (err) {
    // async.map will fail if any of the timeConnections returns an error, but
    // we only care that at least one succeeds; so fail silently
    console.error(err);
  }
  return {
    url: url,
    time: Number.MAX_SAFE_INTEGER,
    errored: true,
  };
}

async function faster(urls: string[], abortSignal?: AbortSignal): Promise<MirrorResponse | Error> {
  const speedTests = urls.map(async (value) => {
    return await timeConnection(value, abortSignal);
  });
  const results = await Promise.all(speedTests);

  const noResponses = results.every((value) => {
    return value.errored;
  });

  if (noResponses) return new Error("Bad response from all mirrors");

  const sorted = (results as Array<MirrorResponse>).sort((a, b) => {
    return a.time - b.time;
  });

  return sorted[0];
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
      return fastest.url.indexOf(value.baseUrl) === 0;
    })[0].baseUrl;
  } catch (err) {
    console.error(err);
  }
  return null;
}
