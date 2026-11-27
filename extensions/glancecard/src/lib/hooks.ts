import { Toast, showToast } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { DEFAULT_OPTIONS, isStale, keptCard, readCard, targetTitle, type CardOptions, type Target } from "./cards";
import { gh } from "./github";

/**
 * A card: the one kept from the last read at once, then read again from GitHub when it is
 * older than half an hour or missing.
 */
export function useCard(target: Target) {
  const key = JSON.stringify(target);
  const kept = useMemo(() => keptCard(target), [key]);
  const { data, isLoading, error, revalidate } = usePromise(
    async (t: Target) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Reading ${targetTitle(t)}`,
        message: kept ? undefined : "The first read of the stars takes longest",
      });
      const card = await readCard(t);
      await toast.hide();
      return card;
    },
    [target],
    { execute: !kept || isStale(kept), failureToastOptions: { title: `Could not read ${targetTitle(target)}` } },
  );
  return { card: data ?? kept, isLoading, error, revalidate };
}

/** How the year, the stars and a repository's sections are drawn: one choice, kept, shared by every view. */
export function useCardOptions() {
  return useCachedState<CardOptions>("card-options", DEFAULT_OPTIONS);
}

export interface MyRepository {
  nameWithOwner: string;
  description: string | null;
  stargazerCount: number;
}

const MY_REPOSITORIES = `
query {
  viewer {
    repositories(first: 100, ownerAffiliations: [OWNER], privacy: PUBLIC, isFork: false, orderBy: { field: STARGAZERS, direction: DESC }) {
      nodes { nameWithOwner description stargazerCount }
    }
  }
}`;

/** The viewer's public repositories that are not forks, most starred first: the ones a card is usually for. */
export function useMyRepositories() {
  return useCachedPromise(
    async () =>
      (await gh().graphql<{ viewer: { repositories: { nodes: MyRepository[] } } }>(MY_REPOSITORIES)).viewer.repositories
        .nodes,
    [],
    { initialData: [] as MyRepository[], keepPreviousData: true },
  );
}
