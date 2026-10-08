import { BrowserExtension, environment } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { BrowserEntry } from "../types";
import { readPagePreview, type PagePreview } from "../browser/page-content";

const client = {
  isAvailable: () => environment.canAccess(BrowserExtension),
  getTabs: () => BrowserExtension.getTabs(),
  getContent: (options: { tabId: number; format: "markdown" }) =>
    BrowserExtension.getContent(options),
};
interface CachedPreview {
  value: PagePreview;
  at: number;
}

export function usePagePreview(
  entry: BrowserEntry | undefined,
  version: number,
  enabled: boolean,
): PagePreview & { isLoading: boolean; refresh: () => void } {
  const cache = useRef(new Map<string, CachedPreview>());
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    revision: number;
    value: PagePreview;
  }>();
  const key = JSON.stringify([
    version,
    entry?.id,
    entry?.tabId,
    entry?.url,
    entry?.source,
    entry?.incognito,
  ]);
  useEffect(() => {
    if (!enabled || !entry) {
      setLoaded(undefined);
      return;
    }
    const previous = cache.current.get(key);
    if (previous && Date.now() - previous.at < 30_000) {
      setLoaded({ key, revision, value: previous.value });
      return;
    }
    setLoaded(undefined);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void readPagePreview(entry, client, controller.signal).then((value) => {
        if (controller.signal.aborted) return;
        // 只缓存成功的有限正文，不持久化，不让失败状态阻止重试。
        if (value.markdown) {
          cache.current.delete(key);
          cache.current.set(key, { value, at: Date.now() });
          while (cache.current.size > 10)
            cache.current.delete(cache.current.keys().next().value!);
        }
        setLoaded({ key, revision, value });
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [entry, key, enabled, revision]);
  const value =
    enabled && loaded?.key === key && loaded.revision === revision
      ? loaded.value
      : undefined;
  return {
    ...value,
    isLoading: Boolean(enabled && entry && !value),
    refresh: () => {
      cache.current.delete(key);
      setRevision((previous) => previous + 1);
    },
  };
}
