import { useEffect, useState } from "react";

import { Cache } from "@raycast/api";

import { descript } from "./client";
import type { DescriptProject } from "./types";

const cache = new Cache({ namespace: "descript-project-details" });

function readCached(id: string): DescriptProject | null {
  const raw = cache.get(id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DescriptProject;
  } catch {
    return null;
  }
}

function writeCached(id: string, detail: DescriptProject): void {
  try {
    cache.set(id, JSON.stringify(detail));
  } catch {
    // Non-fatal — we'll re-fetch next time the project is focused.
  }
}

export type ProjectDetailHookResult = {
  detail: DescriptProject | null;
  isLoading: boolean;
  /** True when `detail` is from the local cache and a refresh is in flight. */
  isStale: boolean;
  error: Error | null;
};

const EMPTY: ProjectDetailHookResult = {
  detail: null,
  isLoading: false,
  isStale: false,
  error: null,
};

/**
 * Fetches a single project's detail on demand, with stale-while-revalidate
 * via Raycast's disk `Cache`. The fetch is aborted if `id` changes mid-flight
 * so rapid selection scrubbing in the list doesn't queue up wasted requests.
 *
 * Pass `undefined` to disable (useful when no row is focused yet).
 */
export function useProjectDetail(id: string | undefined): ProjectDetailHookResult {
  const [state, setState] = useState<ProjectDetailHookResult>(() => {
    if (!id) return EMPTY;
    const cached = readCached(id);
    return {
      detail: cached,
      isLoading: true,
      isStale: Boolean(cached),
      error: null,
    };
  });

  useEffect(() => {
    if (!id) {
      setState(EMPTY);
      return;
    }

    const cached = readCached(id);
    setState({
      detail: cached,
      isLoading: true,
      isStale: Boolean(cached),
      error: null,
    });

    const controller = new AbortController();
    let cancelled = false;

    descript.getProject(id, controller.signal).then(
      (fresh) => {
        if (cancelled) return;
        writeCached(id, fresh);
        setState({ detail: fresh, isLoading: false, isStale: false, error: null });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof Error && error.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      },
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  return state;
}
