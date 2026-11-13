/**
 * React state around the shared read path.
 *
 * The ordering and the memory reasoning live in loadApplications.ts; this hook only turns its
 * callbacks into rendered state, so the search command paints from disk and then updates each
 * instance as it settles.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UNKNOWN_REACHABILITY, type Reachability } from "../lib/argocd/probe";
import type { AppSummary } from "../lib/argocd/types";
import type { ArgoInstance } from "../lib/config/instances";
import { loadApplications, type LoadedInstance } from "./loadApplications";

export interface InstanceState {
  instance: ArgoInstance;
  apps: AppSummary[];
  ageSeconds: number | undefined;
  loading: boolean;
  error: Error | undefined;
  reachability: Reachability;
}

export interface UseApplicationsResult {
  states: InstanceState[];
  apps: AppSummary[];
  loading: boolean;
  refresh: (instanceId?: string) => void;
}

function initialState(instance: ArgoInstance): InstanceState {
  return {
    instance,
    apps: [],
    ageSeconds: undefined,
    loading: true,
    error: undefined,
    reachability: UNKNOWN_REACHABILITY,
  };
}

function fromLoaded(loaded: LoadedInstance, loading: boolean): InstanceState {
  return {
    instance: loaded.instance,
    apps: loaded.apps,
    ageSeconds: loaded.ageSeconds,
    loading,
    error: loaded.error,
    reachability: loaded.reachability,
  };
}

export function useApplications(instances: ArgoInstance[]): UseApplicationsResult {
  const [states, setStates] = useState<InstanceState[]>([]);
  const [generation, setGeneration] = useState(0);
  const forced = useRef<string | "all" | undefined>(undefined);

  useEffect(() => {
    const controllers = instances.map(() => new AbortController());
    let cancelled = false;
    const force = forced.current;
    forced.current = undefined;

    setStates(instances.map(initialState));

    const patch = (loaded: LoadedInstance, loading: boolean) => {
      setStates((current) =>
        current.map((state) => (state.instance.id === loaded.instance.id ? fromLoaded(loaded, loading) : state)),
      );
    };

    void loadApplications(instances, {
      force,
      signals: controllers.map((controller) => controller.signal),
      cancelled: () => cancelled,
      onCached: (loaded) => patch(loaded, true),
      onSettled: (loaded) => patch(loaded, false),
    });

    return () => {
      cancelled = true;
      for (const controller of controllers) {
        controller.abort();
      }
    };
  }, [instances, generation]);

  const refresh = useCallback((instanceId?: string) => {
    forced.current = instanceId ?? "all";
    setGeneration((value) => value + 1);
  }, []);

  const apps = useMemo(() => states.flatMap((state) => state.apps), [states]);
  const loading = states.some((state) => state.loading);

  return { states, apps, loading, refresh };
}
