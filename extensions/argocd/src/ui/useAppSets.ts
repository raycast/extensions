/**
 * The ApplicationSets read path.
 *
 * Two sources, merged, because neither is sufficient on its own.
 *
 * GET /api/v1/applicationsets is the better source when it works: only it carries
 * status.conditions, and only it knows about an ApplicationSet that has generated nothing. But
 * it returns only ApplicationSets whose namespace the server has enabled for ApplicationSets,
 * which is a switch separate from the one enabling applications in any namespace, and it
 * filters silently. On a server where it is off, the endpoint answers 200 with an empty list
 * while thousands of ApplicationSets exist, and no error is available to report.
 *
 * So the applications cache is the second source: every generated application carries an
 * ownerReference naming its parent, so the parents can be reconstructed with no extra request
 * and no extra permission. The API's answer wins wherever it has one.
 *
 * ApplicationSets are held in memory for the life of the command rather than written to disk:
 * there are an order of magnitude fewer of them than applications, and the derived half comes
 * from a cache that is already on disk.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { deriveAppSets, mergeAppSets, type AppSetSummary } from "../lib/argocd/appset";
import { UnreachableError } from "../lib/argocd/errors";
import { UNKNOWN_REACHABILITY, isProbeStale, type Reachability } from "../lib/argocd/probe";
import type { ArgoInstance } from "../lib/config/instances";
import { makeCache, makeClient, probe } from "./deps";
import { loadReachability, saveReachability } from "./storage";

export interface AppSetInstanceState {
  instance: ArgoInstance;
  appSets: AppSetSummary[];
  /** How many of them the API returned, as opposed to reconstructed from the applications. */
  fromApi: number;
  loading: boolean;
  error: Error | undefined;
  reachability: Reachability;
}

export interface UseAppSetsResult {
  states: AppSetInstanceState[];
  appSets: AppSetSummary[];
  loading: boolean;
  refresh: () => void;
}

export function useAppSets(instances: ArgoInstance[]): UseAppSetsResult {
  const [states, setStates] = useState<AppSetInstanceState[]>([]);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const controllers = instances.map(() => new AbortController());
    let cancelled = false;

    const patchInstance = (instanceId: string, changes: Partial<AppSetInstanceState>) => {
      setStates((current) =>
        current.map((state) => (state.instance.id === instanceId ? { ...state, ...changes } : state)),
      );
    };

    async function run() {
      const stored = await loadReachability();
      if (cancelled) {
        return;
      }
      setStates(
        instances.map((instance) => ({
          instance,
          appSets: [],
          fromApi: 0,
          loading: true,
          error: undefined,
          reachability: stored[instance.id] ?? UNKNOWN_REACHABILITY,
        })),
      );

      // The derived half comes from the applications cache the other command fills, so it
      // renders before any ApplicationSet request has been made.
      const cache = makeCache();
      const derivedByInstance = new Map<string, AppSetSummary[]>();
      await Promise.all(
        instances.map(async (instance) => {
          const entry = await cache.read(instance.id);
          derivedByInstance.set(instance.id, deriveAppSets(entry?.apps ?? []));
        }),
      );
      if (cancelled) {
        return;
      }
      for (const instance of instances) {
        const derived = derivedByInstance.get(instance.id) ?? [];
        setStates((current) =>
          current.map((state) =>
            state.instance.id === instance.id ? { ...state, appSets: derived } : state,
          ),
        );
      }

      // Probed together, then listed one at a time: same 100 MB heap constraint as the
      // applications hook, and an ApplicationSet list is small but not guaranteed to be.
      const targets: { instance: ArgoInstance; index: number }[] = [];
      await Promise.all(
        instances.map(async (instance, index) => {
          const known = stored[instance.id] ?? UNKNOWN_REACHABILITY;
          const reachability = isProbeStale(known, Date.now()) ? await probe(instance) : known;
          if (cancelled) {
            return;
          }
          stored[instance.id] = reachability;
          patchInstance(instance.id, { reachability });

          if (reachability.state === "unreachable") {
            patchInstance(instance.id, {
              loading: false,
              error: new UnreachableError(instance.name, reachability.reason),
            });
            return;
          }
          targets.push({ instance, index });
        }),
      );

      for (const { instance, index } of targets) {
        if (cancelled) {
          return;
        }
        const derived = derivedByInstance.get(instance.id) ?? [];
        try {
          const result = await makeClient(instance).listApplicationSets(controllers[index]?.signal);
          if (cancelled) {
            return;
          }
          patchInstance(instance.id, {
            appSets: mergeAppSets(result.appSets, derived),
            fromApi: result.appSets.length,
            loading: false,
            error: undefined,
          });
        } catch (error) {
          if (cancelled) {
            return;
          }
          // The derived entries stay on screen: they are the useful half of the answer.
          patchInstance(instance.id, { appSets: derived, loading: false, error: error as Error });
        }
      }

      if (!cancelled) {
        await saveReachability(stored);
      }
    }

    void run();

    return () => {
      cancelled = true;
      for (const controller of controllers) {
        controller.abort();
      }
    };
  }, [instances, generation]);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);
  const appSets = useMemo(() => states.flatMap((state) => state.appSets), [states]);
  const loading = states.some((state) => state.loading);

  return { states, appSets, loading, refresh };
}
