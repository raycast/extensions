import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef } from "react";
import { getBrowserWindows } from "./browsers/client";
import { getBrowserById } from "./browsers/registry";
import { createBrowserSnapshot, type BrowserSnapshot } from "./browsers/snapshot";
import type { BrowserConfig } from "./browsers/types";

/** Seed navigation once; every later request discovers live native windows. */
export function useBrowserSnapshot(browser: BrowserConfig, initialSnapshot?: BrowserSnapshot) {
  const candidate = createBrowserSnapshot(browser, initialSnapshot);
  const snapshot =
    !initialSnapshot || candidate.key === initialSnapshot.key ? candidate : createBrowserSnapshot(browser);
  const initial = useRef<BrowserSnapshot | undefined>(snapshot);
  const load = useCallback((browserId: string, key: string) => {
    const config = getBrowserById(browserId);
    if (!config) throw new Error(`Unsupported browser: ${browserId}`);
    const seed = initial.current;
    initial.current = undefined;
    return getBrowserWindows(config, seed?.key === key ? seed.nativeWindows : undefined);
  }, []);

  return useCachedPromise(load, [browser.id, snapshot.key], {
    initialData: snapshot.windows,
    keepPreviousData: false,
  });
}
