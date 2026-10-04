import { getPreferenceValues } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  fetchBootstrap,
  fetchEntry,
  fetchEntryHistory,
  fetchFixtures,
  fetchLive,
  fetchPicks,
  FplError,
} from "./api/fpl";
import { indexBootstrap } from "./lib/bootstrap";
import { provisionalBonus } from "./lib/bonus";

/** Team ID from preferences, or undefined when it is not a positive integer. */
export function getTeamId(): number | undefined {
  const { teamId } = getPreferenceValues<Preferences>();
  const parsed = Number(teamId?.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function useBootstrap() {
  const result = useCachedPromise(fetchBootstrap, [], { keepPreviousData: true });
  const index = useMemo(() => (result.data ? indexBootstrap(result.data) : undefined), [result.data]);
  return { ...result, index };
}

/** A 404 means the Team ID is wrong; the views render their own explanation, so only other errors toast. */
async function toastUnlessNotFound(error: Error) {
  if (error instanceof FplError && error.status === 404) return;
  await showFailureToast(error, { title: "Failed to fetch FPL data" });
}

export function useEntry(entryId: number | undefined) {
  return useCachedPromise(fetchEntry, [entryId ?? 0], {
    execute: entryId != null,
    keepPreviousData: true,
    onError: toastUnlessNotFound,
  });
}

export function useEntryHistory(entryId: number) {
  return useCachedPromise(fetchEntryHistory, [entryId], { onError: toastUnlessNotFound });
}

/** Picks for a given gameweek; falls back to the entry's current event when none is given. */
export function usePicks(entryId: number | undefined, event: number | undefined) {
  return useCachedPromise(fetchPicks, [entryId ?? 0, event ?? 0], {
    execute: entryId != null && event != null,
    keepPreviousData: true,
  });
}

/** The set of player IDs in the user's squad for the current gameweek. */
export function useMySquad(): Set<number> | undefined {
  const teamId = getTeamId();
  const { data: entry } = useEntry(teamId);
  const { data: picks } = usePicks(teamId, entry?.current_event ?? undefined);
  return useMemo(() => (picks ? new Set(picks.picks.map((p) => p.element)) : undefined), [picks]);
}

/** Everything needed to render a squad for one gameweek: bootstrap, entry, picks, live points and fixtures. */
export function useTeam(entryId: number, initialEvent?: number) {
  const { index, isLoading: loadingBootstrap } = useBootstrap();
  const { data: entry, error: entryError, isLoading: loadingEntry } = useEntry(entryId);
  const [selected, setSelected] = useState<number | undefined>(initialEvent);
  const event = selected ?? entry?.current_event ?? undefined;
  const { data: picks, isLoading: loadingPicks } = usePicks(entryId, event);
  const { data: live } = useCachedPromise(fetchLive, [event ?? 0], { execute: event != null, keepPreviousData: true });
  const { data: fixtures } = useCachedPromise(fetchFixtures, [event ?? 0], {
    execute: event != null,
    keepPreviousData: true,
  });

  const bonus = useMemo(() => provisionalBonus(fixtures ?? []), [fixtures]);
  const autoSubsIn = useMemo(() => new Set(picks?.automatic_subs.map((s) => s.element_in) ?? []), [picks]);
  const autoSubsOut = useMemo(() => new Set(picks?.automatic_subs.map((s) => s.element_out) ?? []), [picks]);
  const firstEvent = entry?.started_event ?? 1;
  const currentEvent = entry?.current_event ?? 0;
  return {
    index,
    entry,
    entryError,
    event,
    setEvent: setSelected,
    gameweeks: Array.from({ length: Math.max(0, currentEvent - firstEvent + 1) }, (_, i) => currentEvent - i),
    eventInfo: index?.events.find((e) => e.id === event),
    picks,
    livePoints: new Map(live?.elements.map((e) => [e.id, e.stats]) ?? []),
    fixtures: fixtures ?? [],
    /** Provisional bonus per player for fixtures still in play */
    bonus,
    autoSubsIn,
    autoSubsOut,
    isLoading: loadingBootstrap || loadingEntry || loadingPicks,
  };
}
