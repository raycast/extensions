import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLinksPage, PAGE_SIZE } from "./links-page";
import { FetchLinksParams, Link } from "./types";

type State = {
  key: string;
  links: Link[];
  total: number;
  nextOffset: number | null;
  isLoading: boolean;
  error?: Error;
};

type LinkChange = Partial<Pick<Link, "title" | "summary" | "read_at" | "updated_at">> | null;

export function useLinks(read: FetchLinksParams["read"], search: string) {
  const key = JSON.stringify([read, search]);
  const empty: State = { key, links: [], total: 0, nextOffset: 0, isLoading: true };
  const [state, setState] = useState<State>(empty);
  const latest = useRef(state);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const query = useRef({ key, read, search });
  query.current = { key, read, search };
  const generation = useRef(0);
  const mutations = useRef(Promise.resolve());
  const pendingMutations = useRef(0);
  const [isMutating, setIsMutating] = useState(false);

  // Keep queued mutations in sync even before React renders their state changes.
  const updateState = useCallback((next: State) => {
    latest.current = next;
    setState(next);
  }, []);

  const load = useCallback(
    async (reset: boolean) => {
      if (!mounted.current) return;
      if (
        !reset &&
        (pendingMutations.current || request.current || latest.current.nextOffset === null || latest.current.error)
      )
        return;
      if (reset) generation.current += 1;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const current = query.current;
      const offset = reset ? 0 : (latest.current.nextOffset ?? 0);
      updateState({
        key: current.key,
        links: reset ? [] : latest.current.links,
        total: reset ? 0 : latest.current.total,
        nextOffset: offset,
        isLoading: true,
      });
      try {
        // An explicit refresh or a new query must read after already-started writes.
        await mutations.current;
        if (controller.signal.aborted || query.current.key !== current.key) return;
        const page = await fetchLinksPage({ read: current.read, search: current.search, offset }, controller.signal);
        if (controller.signal.aborted || query.current.key !== current.key) return;
        updateState({
          key: current.key,
          links: [
            ...new Map([...(reset ? [] : latest.current.links), ...page.links].map((link) => [link.id, link])).values(),
          ],
          total: page.total,
          nextOffset: page.nextOffset,
          isLoading: false,
        });
      } catch (error) {
        if (controller.signal.aborted || query.current.key !== current.key) return;
        updateState({ ...latest.current, isLoading: false, error: error as Error });
      } finally {
        if (request.current === controller) request.current = null;
      }
    },
    [updateState],
  );

  /** Apply a confirmed update (or null for deletion) without discarding loaded pages. */
  const mutateLink = useCallback(
    (id: string, operation: (link: Link) => Promise<LinkChange>): Promise<boolean> => {
      const current = query.current;
      const currentGeneration = generation.current;
      pendingMutations.current += 1;
      if (mounted.current) setIsMutating(true);
      const mutation = mutations.current.then(async () => {
        if (!mounted.current || generation.current !== currentGeneration || query.current.key !== current.key)
          return false;
        const link = latest.current.links.find((item) => item.id === id);
        if (!link) return false;
        // A pending page may contain the old row or use an offset invalidated by deletion.
        request.current?.abort();
        request.current = null;
        updateState({ ...latest.current, isLoading: false });
        const change = await operation(link);
        if (!mounted.current || generation.current !== currentGeneration || query.current.key !== current.key)
          return true;
        const updated = change === null ? null : { ...link, ...change };
        const remove =
          !updated ||
          (current.read === "unread" && Boolean(updated.read_at)) ||
          (current.read === "read" && !updated.read_at);
        const previous = latest.current;
        // Full-text membership depends on server-side content. Retain edited rows until
        // Refresh, and overlap one row on the next page in case this edit stops matching.
        const searchMayChange =
          Boolean(current.search.trim()) && change !== null && ("title" in change || "summary" in change);
        updateState({
          ...previous,
          links: remove
            ? previous.links.filter((item) => item.id !== id)
            : previous.links.map((item) => (item.id === id ? updated! : item)),
          total: remove ? Math.max(0, previous.total - 1) : previous.total,
          nextOffset:
            previous.nextOffset === null
              ? null
              : Math.max(0, previous.nextOffset - (remove || searchMayChange ? 1 : 0)),
        });
        return true;
      });
      // A failed write must not prevent subsequent queued actions or an explicit refresh.
      mutations.current = mutation.then(
        () => {},
        () => {},
      );
      return mutation.finally(() => {
        pendingMutations.current -= 1;
        if (mounted.current) setIsMutating(pendingMutations.current > 0);
      });
    },
    [updateState],
  );

  useEffect(() => {
    mounted.current = true;
    void load(true);
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, [key, load]);

  // Never render results belonging to a previous search or read filter.
  const current = state.key === key ? state : empty;
  return {
    ...current,
    mutateLink,
    revalidate: () => load(true),
    pagination: {
      pageSize: PAGE_SIZE,
      hasMore: !isMutating && !current.error && current.nextOffset !== null,
      onLoadMore: () => void load(false),
    },
  };
}
