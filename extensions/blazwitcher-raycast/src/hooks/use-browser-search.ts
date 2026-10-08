import { useEffect, useMemo, useRef, useState } from "react";
import { Cache } from "@raycast/api";
import { StartupPreviewCache } from "../browser/preview-cache";
import { BrowserService } from "../browser/service";
import type {
  BrowserOptions,
  DataSnapshot,
  SearchPage,
} from "../browser/service-types";
import type { Scope } from "../types";

export function useBrowserSearch(
  options: BrowserOptions,
  query: string,
  scope: Scope,
) {
  const [snapshot, setSnapshot] = useState<DataSnapshot>();
  const [profileId, setProfileId] = useState<string>();
  const [page, setPage] = useState<SearchPage>();
  const [error, setError] = useState<string>();
  const service = useMemo(
    () =>
      new BrowserService(
        setSnapshot,
        undefined,
        new StartupPreviewCache(
          new Cache({ namespace: "startup-preview-v1", capacity: 512 * 1024 }),
        ),
      ),
    [],
  );
  const sequence = useRef(0);
  const loadingMore = useRef<number | undefined>(undefined);

  useEffect(() => {
    void service.configure(options, profileId);
    return () => service.pause();
  }, [service, options, profileId]);

  const request = useMemo(
    () => ({
      requestId: ++sequence.current,
      version: snapshot?.version ?? -1,
      query,
      scope,
      offset: 0,
    }),
    [snapshot?.version, query, scope],
  );
  const current =
    page?.requestId === request.requestId && page.version === request.version
      ? page
      : undefined;

  useEffect(() => {
    let live = true;
    service.cancel(request.requestId);
    setError(undefined);
    const timer = setTimeout(
      () => {
        if (request.version < 0) return;
        void service
          .search(request)
          .then((result) => {
            if (live) setPage(result);
          })
          .catch((error: Error) => {
            if (live && error.message !== "STALE_RESULT")
              setError("搜索失败，请重新打开命令后重试。");
          });
      },
      query ? 80 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [service, request, query]);

  const cancel = () => service.cancel(++sequence.current);
  const loadMore = async () => {
    if (!current || loadingMore.current === request.requestId) return;
    loadingMore.current = request.requestId;
    try {
      const next = await service.search({
        ...request,
        offset: current.results.length,
      });
      setPage((previous) =>
        previous?.requestId === next.requestId &&
        previous.version === next.version
          ? { ...next, results: [...previous.results, ...next.results] }
          : previous,
      );
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "STALE_RESULT")
        setError("加载更多失败，请重新打开命令后重试。");
    } finally {
      if (loadingMore.current === request.requestId)
        loadingMore.current = undefined;
    }
  };
  return {
    service,
    snapshot,
    page: current,
    error,
    cancel,
    loadMore,
    searching: !current && !error,
    selectProfile: (id: string) => {
      if (id !== profileId) {
        cancel();
        setProfileId(id);
      }
    },
  };
}
