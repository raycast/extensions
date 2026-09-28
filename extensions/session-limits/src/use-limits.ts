import {
  Cache,
  environment,
  getPreferenceValues,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadProviders } from "./core/load";
import type { ProviderState, Settings } from "./core/types";
import { connectClaudeBridge, disconnectClaudeBridge } from "./providers/claude-bridge";

const cache = new Cache({ namespace: "session-limits-v3" });
const settings = getPreferenceValues<Settings>();
const cacheKey = createHash("sha256")
  .update(JSON.stringify([settings, process.env.CODEX_HOME, process.env.CLAUDE_CONFIG_DIR]))
  .digest("hex");
const background = environment.launchType === LaunchType.Background;
const bridgeDirectory = join(environment.supportPath, "claude-bridge");
const REVISION_KEY = "claude-bridge-revision";

async function connectionRevision(): Promise<string> {
  return (await LocalStorage.getItem<string>(REVISION_KEY)) ?? "initial";
}

let cleanup: Promise<void> | undefined;
function removeLegacyConnection(): Promise<void> {
  // Delete only this extension's obsolete connection entries. Never reuse or log their contents.
  return (cleanup ??= (async () => {
    const items = await LocalStorage.allItems();
    const keys = Object.keys(items).filter(
      (key) =>
        key === "claude-access-v1" ||
        key.startsWith("claude-access-v1:") ||
        key === "claude-disconnected" ||
        key === "claude-connection-epoch",
    );
    await Promise.all(keys.map((key) => LocalStorage.removeItem(key)));
  })());
}

interface CachedResult {
  fetchedAt: number;
  providers: ProviderState[];
}
function readCache(): CachedResult | undefined {
  try {
    const value = JSON.parse(cache.get(cacheKey) ?? "null") as CachedResult | null;
    return value && typeof value.fetchedAt === "number" && Array.isArray(value.providers) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function useLimits() {
  const [providers, setProviders] = useState<ProviderState[]>(() => readCache()?.providers ?? []);
  const [isLoading, setLoading] = useState(true);
  const mounted = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);
  const actionInFlight = useRef(false);

  const fetchLimits = useCallback((force: boolean): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const task = (async () => {
      if (mounted.current) setLoading(true);
      try {
        await removeLegacyConnection();
        const cached = readCache();
        if (!force && cached && Date.now() - cached.fetchedAt < 60_000) {
          if (mounted.current) setProviders(cached.providers);
          return;
        }
        const revision = await connectionRevision();
        const next = await loadProviders(
          { ...settings, claudeBridgeDirectory: bridgeDirectory },
          cached?.providers,
        );
        // Do not let an older command restore a reading after connection settings change.
        if ((await connectionRevision()) !== revision) return;
        cache.set(cacheKey, JSON.stringify({ fetchedAt: Date.now(), providers: next }));
        if (mounted.current) setProviders(next);
      } catch {
        if (!background)
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not refresh limits",
            message: "Please try again.",
          });
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();
    inFlight.current = task;
    void task.finally(() => {
      inFlight.current = null;
    });
    return task;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = cache.subscribe((key) => {
      if (key === cacheKey && mounted.current) setProviders(readCache()?.providers ?? []);
    });
    void fetchLimits(false);
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [fetchLimits]);

  useEffect(() => {
    if (background) return;
    const timer = setInterval(() => setProviders((current) => [...current]), 30_000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => fetchLimits(true), [fetchLimits]);
  const changeConnection = useCallback(
    async (id: string, connecting: boolean) => {
      if (id !== "claude" || background || actionInFlight.current) return;
      actionInFlight.current = true;
      if (mounted.current) setLoading(true);
      try {
        if (inFlight.current) await inFlight.current;
        await removeLegacyConnection();
        await LocalStorage.setItem(REVISION_KEY, randomUUID());
        if (connecting) {
          await connectClaudeBridge({
            claudeConfigDir: settings.claudeConfigDir,
            bridgeDirectory,
            assetPath: join(environment.assetsPath, "claude-statusline.cjs"),
            nodePath: process.execPath,
          });
        } else {
          await disconnectClaudeBridge({ claudeConfigDir: settings.claudeConfigDir, bridgeDirectory });
        }
        // Invalidate refreshes that began while the settings update was in progress.
        await LocalStorage.setItem(REVISION_KEY, randomUUID());
        cache.remove(cacheKey);
        await fetchLimits(true);
        await showToast({
          style: Toast.Style.Success,
          title: connecting ? "Claude Code connected" : "Claude Code disconnected",
          message: connecting ? "Use Claude Code, then refresh to see its latest limits." : undefined,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: connecting ? "Could not connect Claude Code" : "Could not disconnect Claude Code",
          message: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        actionInFlight.current = false;
        if (mounted.current) setLoading(false);
      }
    },
    [fetchLimits],
  );
  const connect = useCallback((id: string) => changeConnection(id, true), [changeConnection]);
  const disconnect = useCallback((id: string) => changeConnection(id, false), [changeConnection]);
  return { providers, isLoading, refresh, connect, disconnect };
}
