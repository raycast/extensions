/**
 * The one read path, shared by the search command and the menu bar.
 *
 * Order of operations is the whole point:
 *   1. every instance's cache is read from disk, so a caller can paint before any network call;
 *   2. every instance is probed concurrently with a short timeout, so a VPN that is down is
 *      known in well under a second;
 *   3. the reachable instances whose cache is stale are listed **one at a time**.
 *
 * Step 3 is sequential because a Raycast command gets a 100 MB JS heap and streaming one list
 * of 2053 applications still peaks around 35 MB. Sequential keeps that peak flat as instances
 * are added; concurrent grows it linearly.
 *
 * An instance that fails at any step keeps its cached applications and carries the reason, so
 * one broken or unreachable instance never empties a list.
 *
 * It lives here rather than inside the hook because the menu bar command needs exactly the same
 * behaviour with none of the React, and two copies of this would drift.
 */

import { UnreachableError } from "../lib/argocd/errors";
import { UNKNOWN_REACHABILITY, isProbeStale, type Reachability } from "../lib/argocd/probe";
import type { AppSummary } from "../lib/argocd/types";
import type { ArgoInstance } from "../lib/config/instances";
import { makeCache, makeClient, probe } from "./deps";
import { readPreferences } from "./preferences";
import { loadReachability, saveReachability } from "./storage";

export interface LoadedInstance {
  instance: ArgoInstance;
  apps: AppSummary[];
  ageSeconds: number | undefined;
  reachability: Reachability;
  error: Error | undefined;
}

export interface LoadOptions {
  /** "all", or one instance id, to refresh regardless of the cache age. */
  force?: string | "all" | undefined;
  /** Called once per instance with what the disk held, before anything is fetched. */
  onCached?: (loaded: LoadedInstance) => void;
  /** Called each time an instance settles, whether it refreshed, failed or was fresh enough. */
  onSettled?: (loaded: LoadedInstance) => void;
  /** Aborts the in-flight list request for each instance, by index. */
  signals?: (AbortSignal | undefined)[];
  /** Checked between steps so a caller that went away stops the work. */
  cancelled?: () => boolean;
}

export async function loadApplications(
  instances: ArgoInstance[],
  options: LoadOptions = {},
): Promise<LoadedInstance[]> {
  const { cacheTtlSeconds } = readPreferences();
  const cache = makeCache();
  const cancelled = options.cancelled ?? (() => false);

  const storedReachability = await loadReachability();
  if (cancelled()) {
    return [];
  }

  // Step 1: what the disk holds.
  const loaded: LoadedInstance[] = await Promise.all(
    instances.map(async (instance) => {
      const entry = await cache.read(instance.id);
      const state: LoadedInstance = {
        instance,
        apps: entry?.apps ?? [],
        ageSeconds: entry ? cache.ageSeconds(entry) : undefined,
        reachability: storedReachability[instance.id] ?? UNKNOWN_REACHABILITY,
        error: undefined,
      };
      options.onCached?.(state);
      return state;
    }),
  );
  if (cancelled()) {
    return loaded;
  }

  const stale = new Map<string, boolean>();
  for (const state of loaded) {
    const entry = state.ageSeconds === undefined ? undefined : { ageSeconds: state.ageSeconds };
    stale.set(
      state.instance.id,
      options.force === "all" ||
        options.force === state.instance.id ||
        entry === undefined ||
        entry.ageSeconds >= cacheTtlSeconds,
    );
  }

  // Step 2: probe everything at once. Cheap, and it decides what is worth querying.
  const targets: number[] = [];
  await Promise.all(
    loaded.map(async (state, index) => {
      if (!stale.get(state.instance.id)) {
        options.onSettled?.(state);
        return;
      }

      const known = storedReachability[state.instance.id] ?? UNKNOWN_REACHABILITY;
      const reachability =
        options.force !== undefined || isProbeStale(known, Date.now()) ? await probe(state.instance) : known;
      if (cancelled()) {
        return;
      }
      storedReachability[state.instance.id] = reachability;
      state.reachability = reachability;

      if (reachability.state === "unreachable") {
        state.error = new UnreachableError(state.instance.name, reachability.reason);
        options.onSettled?.(state);
        return;
      }
      targets.push(index);
    }),
  );

  // Step 3: one list at a time, so only one response is ever in flight and on the heap.
  for (const index of targets.sort((a, b) => a - b)) {
    if (cancelled()) {
      return loaded;
    }
    const state = loaded[index] as LoadedInstance;
    try {
      const result = await makeClient(state.instance).listApplications(options.signals?.[index]);
      if (cancelled()) {
        return loaded;
      }
      await cache.write(state.instance.id, result.apps);
      state.apps = result.apps;
      state.ageSeconds = 0;
      state.error = undefined;
    } catch (error) {
      if (cancelled()) {
        return loaded;
      }
      // The cached applications stay: a stale list beats an empty one.
      state.error = error as Error;
    }
    options.onSettled?.(state);
  }

  if (!cancelled()) {
    await saveReachability(storedReachability);
  }
  return loaded;
}
