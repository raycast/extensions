import { BrowserExtension, environment } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  RaycastBrowserIconAdapter,
  type BrowserIconAdapter,
} from "../browser/browser-icon-adapter";
import { ChromePageIconAdapter } from "../browser/chrome-page-icon-adapter";
import type { SearchResult } from "../types";

export function useFavicons(
  results: SearchResult[] | undefined,
  version: number,
) {
  const localIcons = useMemo(() => new ChromePageIconAdapter(), []);
  useEffect(
    () => () => {
      void localIcons.dispose().catch(() => {});
    },
    [localIcons],
  );
  const adapter = useMemo<BrowserIconAdapter>(
    () =>
      new RaycastBrowserIconAdapter(
        {
          isAvailable: () => environment.canAccess(BrowserExtension),
          getTabs: () => BrowserExtension.getTabs(),
        },
        localIcons,
      ),
    [localIcons],
  );
  const [loaded, setLoaded] = useState<{
    urls: ReadonlyMap<string, string>;
    version: number;
    icons: ReadonlyMap<string, string>;
  }>();

  useEffect(() => {
    // 搜索过渡期保留已加载图标，真实数据更新由版本号隔离。
    if (!results || version < 0) return;
    const controller = new AbortController();
    // 快速输入期间合并请求，不阻塞文字结果和键盘操作。
    const timer = setTimeout(() => {
      void adapter
        .getIcons(
          results?.map((result) => result.entry) ?? [],
          version,
          controller.signal,
        )
        .then((next) => {
          if (!controller.signal.aborted)
            setLoaded({
              urls: new Map(results?.map(({ entry }) => [entry.id, entry.url])),
              version,
              icons: next,
            });
        })
        .catch(() => {
          if (!controller.signal.aborted) setLoaded(undefined);
        });
    }, 100);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [adapter, results, version]);
  // 同一数据版本内保留匹配页面的图标，避免每次输入都闪回默认图标。
  if (loaded?.version !== version) return undefined;
  return new Map(
    results?.flatMap(({ entry }) => {
      const icon = loaded.icons.get(entry.id);
      return icon && loaded.urls.get(entry.id) === entry.url
        ? [[entry.id, icon] as const]
        : [];
    }),
  );
}
