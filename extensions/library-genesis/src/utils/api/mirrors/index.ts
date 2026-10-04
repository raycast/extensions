import type { BookEntry } from "@/types";
import { parseContentIntoBooks } from "@/utils/api/mirrors/default";
import { DEFAULT_MIRROR } from "@/utils/constants";

import { fetchLibgenSearchPage, getMirrorTestUrl } from "../request";

export type Parser = (content: string, libgenUrl?: string) => BookEntry[];
export interface Mirror {
  baseUrl: string;
  parse: Parser;
}

// Keep historical aliases: availability varies by network and can change over time.
// Every candidate must pass a search-page check before it can be selected.
export const mirrors: Array<Mirror> = [
  "https://libgen.bz",
  "https://libgen.li",
  "https://libgen.la",
  "https://libgen.gl",
  "https://libgen.vg",
  "https://libgen.gs",
  "https://libgen.pm",
  "https://libgen.lc",
  "https://libgen.wf",
  "https://libgen.click",
  "https://libgen.ee",
  "https://libgen.rocks",
  "https://libgen.space",
  "https://libgen.is",
  "https://libgen.st",
  "https://libgen.rs",
].map((baseUrl) => ({ baseUrl, parse: parseContentIntoBooks }));

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

export const testMirror = async (baseUrl: string, abortSignal?: AbortSignal) => {
  const startTime = Date.now();
  await fetchLibgenSearchPage(getMirrorTestUrl(baseUrl), abortSignal, 10000);
  return { startTime, endTime: Date.now() };
};

export async function mirror(abortSignal?: AbortSignal): Promise<string | null> {
  if (abortSignal?.aborted) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  abortSignal?.addEventListener("abort", abort, { once: true });

  try {
    return await Promise.any(
      mirrors.map(async ({ baseUrl }) => {
        await testMirror(baseUrl, controller.signal);
        return baseUrl;
      }),
    );
  } catch (error) {
    if (!abortSignal?.aborted) console.error(error);
    return null;
  } finally {
    controller.abort();
    abortSignal?.removeEventListener("abort", abort);
  }
}
