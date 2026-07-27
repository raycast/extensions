/** Data hooks shared by the extension's view commands. */
import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";

import { DEFAULT_CONFIG, authorIgnoredBy, loadConfig, saveConfig, type Config } from "./lib/config";
import { DEMO_VIEWER, demoPullRequests, isDemoMode } from "./lib/demo";
import { checkGhStatus } from "./lib/gh-status";
import { fetchViewer, search } from "./lib/github";
import { clearSamlRefusal, takeSamlRefusal } from "./lib/graphql";
import { loadSeen, markNewSince } from "./lib/seen";
import type { Category } from "./lib/tabs";
import type { PullRequest, Viewer } from "./lib/types";

/**
 * Loads the persisted config and exposes an `update` that writes it back and
 * refreshes every consumer in this view.
 */
export function useConfig() {
  const { data, isLoading, revalidate, mutate } = useCachedPromise(loadConfig, [], {
    initialData: DEFAULT_CONFIG,
    keepPreviousData: true,
  });

  const config = data ?? DEFAULT_CONFIG;

  const update = useCallback(
    async (next: Config) => {
      await mutate(
        saveConfig(next).then(() => next),
        {
          optimisticUpdate: () => next,
          rollbackOnError: true,
          shouldRevalidateAfter: false,
        },
      );
    },
    [mutate],
  );

  return { config, isLoading, update, revalidate };
}

/** Loads the authenticated user, their orgs, and their teams. */
export function useViewer() {
  return useCachedPromise(async () => ((await isDemoMode()) ? DEMO_VIEWER : fetchViewer()), [], {
    keepPreviousData: true,
  });
}

/** Reports whether the GitHub CLI is installed, authenticated, and reachable. */
export function useGhStatus() {
  return useCachedPromise(checkGhStatus, [], { keepPreviousData: true });
}

/**
 * Fetches one category's pull requests: runs its GitHub search, drops ignored
 * authors, applies the category's client-side post-filter, flags PRs with
 * activity newer than the last look, and sorts by most recent activity.
 */
export async function fetchCategory(
  category: Category,
  viewerLogin: string,
  ignoredAuthors: string[],
  limit?: number,
): Promise<PullRequest[]> {
  // Screenshot mode: fabricated data, never reaching GitHub. Dev-only.
  if (await isDemoMode()) {
    return demoPullRequests(category.id);
  }

  // A previous refusal shouldn't be attributed to this fetch.
  clearSamlRefusal();
  const result = await search(category.query, viewerLogin, limit, ignoredAuthors);
  const seen = await loadSeen();

  const filtered = result.prs
    .filter((pr) => !authorIgnoredBy(ignoredAuthors, pr.author))
    .filter((pr) => (category.post ? category.post(pr) : true));

  return markNewSince(filtered, seen).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

/**
 * Keeps one category's results in the cache, so switching back to a category
 * paints instantly while a fresh fetch runs.
 *
 * The query and ignore list are passed as arguments rather than closed over,
 * because useCachedPromise keys its cache on the serialized argument list.
 */
export type CategoryResult = {
  prs: PullRequest[];
  /** When this result came back from GitHub (ISO 8601), for the "updated" label. */
  fetchedAt?: string;
  /**
   * Set when GitHub refused an organization on SAML grounds. The results are
   * still valid — they're just missing that org — so this rides alongside them
   * rather than replacing them with an error.
   */
  saml?: { message: string; ssoHeader?: string };
};

export function useCategoryPRs(category: Category | undefined, viewer: Viewer | undefined, config: Config) {
  return useCachedPromise(
    async (query: string, ignored: string, login: string): Promise<CategoryResult> => {
      if (!category || !query || !login) return { prs: [] };
      const prs = await fetchCategory({ ...category, query }, login, ignored ? ignored.split(",") : []);
      return { prs, saml: takeSamlRefusal(), fetchedAt: new Date().toISOString() };
    },
    [category?.query ?? "", config.ignoredAuthors.join(","), viewer?.login ?? ""],
    {
      execute: Boolean(category && viewer),
      keepPreviousData: true,
      initialData: { prs: [] } as CategoryResult,
    },
  );
}
