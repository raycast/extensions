import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import {
  fetchEnvironments,
  fetchFlag,
  fetchFlagStatus,
  fetchFlagTags,
  fetchMe,
  fetchProjects,
  fetchSegments,
} from "../api/endpoints";
import { LDEnvironment, LDFlag, LDSegment } from "../types";

/** Project environments keyed by environment key (names, colors, criticality). */
export function useEnvironments(projectKey: string, enabled = true) {
  const { data, isLoading } = useCachedPromise(fetchEnvironments, [projectKey], {
    execute: enabled,
    failureToastOptions: { title: "Error fetching environments" },
  });
  const byKey = useMemo(() => {
    const map: Record<string, LDEnvironment> = {};
    for (const env of data ?? []) map[env.key] = env;
    return map;
  }, [data]);
  return { environments: data ?? [], environmentsByKey: byKey, isLoading };
}

export function useProjects() {
  return useCachedPromise(fetchProjects, [], { failureToastOptions: { title: "Error fetching projects" } });
}

export function useFlagStatus(projectKey: string, flagKey: string) {
  const { data, isLoading } = useCachedPromise(fetchFlagStatus, [projectKey, flagKey], {
    // Status is informational; don't toast if the token lacks access to it.
    onError: () => undefined,
  });
  return { statuses: data?.environments ?? {}, isLoading };
}

export function useFlagTags() {
  const { data } = useCachedPromise(fetchFlagTags, [], { onError: () => undefined });
  return data ?? [];
}

/** The caller's member record, used for the "My Flags" filter. */
export function useMe() {
  const { data, isLoading } = useCachedPromise(fetchMe, [], { onError: () => undefined });
  return { me: data, isLoading };
}

/** Segment key → name for one environment. Only fetched when `enabled`. */
export function useSegmentNames(projectKey: string, environmentKey: string, enabled: boolean) {
  const { data } = useCachedPromise(fetchSegments, [projectKey, environmentKey], {
    execute: enabled,
    onError: () => undefined,
  });
  return useMemo(() => {
    const map: Record<string, string> = {};
    for (const segment of (data ?? []) as LDSegment[]) map[segment.key] = segment.name;
    return map;
  }, [data]);
}

async function fetchFlagsByKey(projectKey: string, keys: string[]): Promise<Record<string, LDFlag>> {
  const results = await Promise.allSettled(keys.map((key) => fetchFlag(projectKey, key)));
  const map: Record<string, LDFlag> = {};
  results.forEach((result, i) => {
    if (result.status === "fulfilled") map[keys[i]] = result.value;
  });
  return map;
}

/** Resolve prerequisite flag keys to full flags so we can show their names and variation names. */
export function usePrerequisiteFlags(projectKey: string, keys: string[]) {
  const sortedKeys = useMemo(() => [...new Set(keys)].sort(), [keys.join("|")]);
  const { data } = useCachedPromise(fetchFlagsByKey, [projectKey, sortedKeys], {
    execute: sortedKeys.length > 0,
    onError: () => undefined,
  });
  return data ?? {};
}
