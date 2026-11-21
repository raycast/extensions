import { useEffect, useRef, useState } from "react";
import type { Page } from "../lib/explorer-api";
export function useResource<T>(key: string, request: (signal: AbortSignal) => Promise<T>) {
  const loader = useRef(request);
  loader.current = request;
  const [state, setState] = useState<{ key: string; data?: T; error?: string; loading: boolean }>({
    key,
    loading: true,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, loading: true });
    loader
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, error: error instanceof Error ? error.message : "Could not load data.", loading: false });
      });
    return () => controller.abort();
  }, [key, revision]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: state.key === key ? state.loading : true,
    refresh: () => setRevision((n) => n + 1),
  };
}
export function usePaged<T extends { id: string }>(
  key: string,
  request: (next: string | undefined, signal: AbortSignal, onProgress: (page: Page<T>) => void) => Promise<Page<T>>,
) {
  const loader = useRef(request);
  loader.current = request;
  const active = useRef<{ key: string; controller: AbortController; busy: boolean; seen: Set<string> } | undefined>(
    undefined,
  );
  const [state, setState] = useState<{ key: string; items: T[]; next?: string; error?: string; loading: boolean }>({
    key,
    items: [],
    loading: true,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const session = { key, controller: new AbortController(), busy: true, seen: new Set<string>() };
    active.current = session;
    setState({ key, items: [], loading: true });
    loader
      .current(undefined, session.controller.signal, (page) => {
        if (!session.controller.signal.aborted)
          setState({ key, items: page.items, next: page.next_page || undefined, loading: true });
      })
      .then((page) => {
        if (!session.controller.signal.aborted)
          setState({ key, items: page.items, next: page.next_page || undefined, loading: false });
      })
      .catch((error) => {
        if (!session.controller.signal.aborted)
          setState((s) => ({ ...s, error: String(error.message || error), loading: false }));
      })
      .finally(() => {
        session.busy = false;
      });
    return () => session.controller.abort();
  }, [key, revision]);
  async function loadMore() {
    const session = active.current;
    if (!session || session.key !== key || session.busy || !state.next || session.controller.signal.aborted) return;
    if (session.seen.has(state.next)) {
      setState((s) => ({ ...s, error: "Repeated pagination cursor. Refresh to try again.", next: undefined }));
      return;
    }
    const next = state.next;
    session.busy = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const page = await loader.current(next, session.controller.signal, (page) => {
        if (!session.controller.signal.aborted)
          setState((s) => ({
            key,
            items: [...new Map([...s.items, ...page.items].map((item) => [item.id, item])).values()],
            next: page.next_page || undefined,
            loading: true,
          }));
      });
      if (!session.controller.signal.aborted) {
        session.seen.add(next);
        setState((s) => ({
          key,
          items: [...new Map([...s.items, ...page.items].map((item) => [item.id, item])).values()],
          next: page.next_page || undefined,
          loading: false,
        }));
      }
    } catch (error) {
      if (!session.controller.signal.aborted)
        setState((s) => ({
          ...s,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load next page.",
        }));
    } finally {
      session.busy = false;
    }
  }
  return {
    items: state.key === key ? state.items : [],
    next: state.key === key ? state.next : undefined,
    error: state.key === key ? state.error : undefined,
    loading: state.key === key ? state.loading : true,
    loadMore,
    refresh: () => setRevision((n) => n + 1),
  };
}
