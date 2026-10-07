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

type MirrorProbe = {
  controller: AbortController;
  subscribers: number;
  result: Promise<{ startTime: number; endTime: number }>;
};
const activeProbes = new Map<string, MirrorProbe>();

export const testMirror = async (baseUrl: string, abortSignal?: AbortSignal) => {
  abortSignal?.throwIfAborted();
  let probe = activeProbes.get(baseUrl);
  if (!probe) {
    const controller = new AbortController();
    const startTime = Date.now();
    const created: MirrorProbe = {
      controller,
      subscribers: 0,
      result: fetchLibgenSearchPage(getMirrorTestUrl(baseUrl), controller.signal, 10000)
        .then(() => ({ startTime, endTime: Date.now() }))
        .finally(() => {
          if (activeProbes.get(baseUrl) === created) activeProbes.delete(baseUrl);
        }),
    };
    activeProbes.set(baseUrl, created);
    probe = created;
  }
  const shared = probe;
  shared.subscribers++;
  let abort: () => void = () => {};
  try {
    const result = await new Promise<{ startTime: number; endTime: number }>((resolve, reject) => {
      abort = () => reject(new DOMException("The mirror check was cancelled.", "AbortError"));
      abortSignal?.addEventListener("abort", abort, { once: true });
      shared.result.then(resolve, reject);
    });
    abortSignal?.throwIfAborted();
    return result;
  } finally {
    abortSignal?.removeEventListener("abort", abort);
    if (--shared.subscribers === 0) {
      shared.controller.abort();
      if (activeProbes.get(baseUrl) === shared) activeProbes.delete(baseUrl);
    }
  }
};

export async function mirror(abortSignal?: AbortSignal, excludedMirrors: string[] = []): Promise<string | null> {
  if (abortSignal?.aborted) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  abortSignal?.addEventListener("abort", abort, { once: true });

  try {
    return await Promise.any(
      mirrors
        .filter(({ baseUrl }) => !excludedMirrors.includes(baseUrl))
        .map(async ({ baseUrl }) => {
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

export async function getValidatedMirror(cachedMirror?: string, abortSignal?: AbortSignal): Promise<string | null> {
  if (abortSignal?.aborted) return null;
  if (cachedMirror) {
    try {
      await testMirror(cachedMirror, abortSignal);
      return abortSignal?.aborted ? null : cachedMirror;
    } catch {
      if (abortSignal?.aborted) return null;
    }
  }
  return mirror(abortSignal, cachedMirror ? [cachedMirror] : []);
}
