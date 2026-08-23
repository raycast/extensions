import { Application, Cache, getApplications } from "@raycast/api";
import { existsSync } from "fs";
import { useEffect, useRef, useState } from "react";

// The NewTwos desktop app (apps/desktop). appId comes from its electron-builder
// config; the Windows build has no bundle id, so fall back to the product name.
const BUNDLE_ID = "com.twosballer.mobile";
const APP_NAME = "NewTwos";
const CACHE_KEY = "newtwos-desktop-app-v1";

export type OpenIn = "auto" | "app" | "browser";

// Module-level so every row in a command run shares one entry. Cache get/set
// are synchronous, which is what lets us resolve on the first render.
const cache = new Cache();

function readCache(): Application | null {
  try {
    const raw = cache.get(CACHE_KEY);
    if (!raw) return null;
    const app = JSON.parse(raw) as Application;
    // The app may have been deleted or moved since we cached it. existsSync is
    // sub-millisecond and stops us rendering an action that opens nothing.
    if (!app?.path || !existsSync(app.path)) return null;
    return app;
  } catch {
    return null;
  }
}

function findNewTwos(apps: Application[]): Application | null {
  return (
    apps.find((a) => a.bundleId === BUNDLE_ID || a.windowsAppId?.includes(APP_NAME) || a.name === APP_NAME) ?? null
  );
}

/**
 * Is the NewTwos desktop app installed, and where?
 *
 * `ready` is false only on the very first run, before `getApplications()` has
 * ever resolved. After that the cached answer is read synchronously in the
 * useState initializer, so the first rendered frame is already correct and the
 * action panel never flickers from browser-primary to app-primary.
 *
 * Detection failure is never surfaced to the user — it degrades to "not
 * installed", which just means the browser action stays primary.
 */
export function useDesktopApp(): { app: Application | null; ready: boolean } {
  const cached = useRef(readCache()).current;
  const [state, setState] = useState<{ app: Application | null; ready: boolean }>({
    app: cached,
    ready: cached !== null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // No argument: return every installed app. Deliberately NOT
        // getApplications("twos://") — that is documented for files/folders,
        // and "apps that can open twos:" is exactly the set that also includes
        // stale local dev builds we don't want to launch.
        const found = findNewTwos(await getApplications());
        if (!active) return;
        if (found) cache.set(CACHE_KEY, JSON.stringify(found));
        else cache.remove(CACHE_KEY);
        // Only re-render when the answer actually changed.
        setState((prev) => (prev.app?.path === found?.path && prev.ready ? prev : { app: found, ready: true }));
      } catch {
        if (active) setState({ app: null, ready: true });
      }
    })();
    return () => {
      // getApplications() is a full Spotlight enumeration and can take a few
      // hundred ms — the command may be dismissed before it lands.
      active = false;
    };
  }, []);

  return state;
}

/**
 * Where should an "open" action send the user?
 *
 * Until detection resolves we answer "browser", so the transient state always
 * errs toward the action that works everywhere. An explicit "app" preference is
 * honored even when detection came up empty, since `getApplications()` can miss
 * an app installed outside the usual locations and the setting is the user's
 * escape hatch.
 */
export function resolveOpenTarget(
  pref: OpenIn | undefined,
  app: Application | null,
  ready: boolean,
): "app" | "browser" {
  if (pref === "browser") return "browser";
  if (pref === "app") return "app";
  if (!ready) return "browser";
  return app ? "app" : "browser";
}
