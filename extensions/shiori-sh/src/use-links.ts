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

export function useLinks(read: FetchLinksParams["read"], search: string) {
  const key = JSON.stringify([read, search]);
  const empty: State = { key, links: [], total: 0, nextOffset: 0, isLoading: true };
  const [state, setState] = useState<State>(empty);
  const latest = useRef(state);
  latest.current = state;
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const query = useRef({ key, read, search });
  query.current = { key, read, search };

  const load = useCallback(async (reset: boolean) => {
    if (!mounted.current) return;
    if (!reset && (request.current || latest.current.nextOffset === null || latest.current.error)) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = query.current;
    const offset = reset ? 0 : (latest.current.nextOffset ?? 0);
    setState((previous) => ({
      key: current.key,
      links: reset ? [] : previous.links,
      total: reset ? 0 : previous.total,
      nextOffset: offset,
      isLoading: true,
    }));
    try {
      const page = await fetchLinksPage({ read: current.read, search: current.search, offset }, controller.signal);
      if (controller.signal.aborted || query.current.key !== current.key) return;
      setState((previous) => ({
        key: current.key,
        links: [...new Map([...(reset ? [] : previous.links), ...page.links].map((link) => [link.id, link])).values()],
        total: page.total,
        nextOffset: page.nextOffset,
        isLoading: false,
      }));
    } catch (error) {
      if (controller.signal.aborted || query.current.key !== current.key) return;
      setState((previous) => ({ ...previous, isLoading: false, error: error as Error }));
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, []);

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
    revalidate: () => load(true),
    pagination: {
      pageSize: PAGE_SIZE,
      hasMore: !current.error && current.nextOffset !== null,
      onLoadMore: () => void load(false),
    },
  };
}
