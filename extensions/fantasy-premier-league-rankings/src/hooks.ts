import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
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
import type { Fixture, Pick } from "./api/types";
import { indexBootstrap } from "./lib/bootstrap";
import { provisionalBonus } from "./lib/bonus";

const TEAM_ID_KEY = "teamId";

/** A Team ID typed as a number or pasted as an FPL URL, or undefined when it is not a positive integer. */
export function parseTeamId(value: string | undefined): number | undefined {
  const parsed = Number(value?.match(/entry\/(\d+)/)?.[1] ?? value?.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** Team ID from the preferences, or else the one saved from the Team ID form. */
export async function getTeamId(): Promise<number | undefined> {
  const { userTeamId } = getPreferenceValues<Preferences>();
  return parseTeamId(userTeamId) ?? parseTeamId(await LocalStorage.getItem<string>(TEAM_ID_KEY));
}

export const saveTeamId = (teamId: number) => LocalStorage.setItem(TEAM_ID_KEY, String(teamId));

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
  return useCachedPromise(fetchPicks, [entryId ?? 0, event ?? 0], { execute: entryId != null && event != null });
}

/** The player IDs in the user's squad for the current gameweek, and whether a Team ID is still missing. */
export function useMySquad() {
  const { data: teamId, isLoading, revalidate } = usePromise(getTeamId);
  const { data: entry } = useEntry(teamId);
  const { data: picks } = usePicks(teamId, entry?.current_event ?? undefined);
  const squad = useMemo(() => (picks ? new Set(picks.picks.map((p) => p.element)) : undefined), [picks]);
  return { squad, missingTeamId: !isLoading && !teamId, reloadTeamId: revalidate };
}

/** Everything needed to render a squad for one gameweek: bootstrap, entry, picks, live points and fixtures. */
export function useTeam(entryId: number, initialEvent?: number) {
  const { index, isLoading: loadingBootstrap } = useBootstrap();
  const { data: entry, error: entryError, isLoading: loadingEntry } = useEntry(entryId);
  const [selected, setSelected] = useState<number | undefined>(initialEvent);
  const event = selected ?? entry?.current_event ?? undefined;
  const { data: picks, isLoading: loadingPicks } = usePicks(entryId, event);
  // No keepPreviousData: switching gameweek must never show the previous week's picks, points or fixtures.
  const { data: live, isLoading: loadingLive } = useCachedPromise(fetchLive, [event ?? 0], { execute: event != null });
  const { data: fixtures, isLoading: loadingFixtures } = useCachedPromise(fetchFixtures, [event ?? 0], {
    execute: event != null,
  });

  const bonus = useMemo(() => provisionalBonus(fixtures ?? []), [fixtures]);
  const autoSubsIn = useMemo(() => new Set(picks?.automatic_subs.map((s) => s.element_in) ?? []), [picks]);
  const autoSubsOut = useMemo(() => new Set(picks?.automatic_subs.map((s) => s.element_out) ?? []), [picks]);
  const liveById = new Map(live?.elements.map((e) => [e.id, e]) ?? []);
  const eventInfo = index?.events.find((e) => e.id === event);

  /** A player's fixtures this gameweek: their club's, unless FPL scored them in others because they have moved since. */
  const fixturesOf = (playerId: number): Fixture[] => {
    const club = index?.players.get(playerId)?.team;
    const own = (fixtures ?? []).filter((f) => f.team_h === club || f.team_a === club);
    const scoredIn = liveById.get(playerId)?.fixtures.map((f) => f.fixture) ?? [];
    const moved = scoredIn.some((id) => !own.some((f) => f.id === id));
    return moved ? (fixtures ?? []).filter((f) => scoredIn.includes(f.id)) : own;
  };
  /** Live points for a pick before its multiplier, with provisional bonus, or undefined until its match kicks off. */
  const scored = (pick: Pick): number | undefined => {
    const stats = liveById.get(pick.element)?.stats;
    if (!stats || !fixturesOf(pick.element).some((f) => f.started || f.finished)) return undefined;
    return stats.total_points + (bonus.get(pick.element) ?? 0);
  };
  const history = picks?.entry_history;
  const anyLive = picks?.picks.some((p) => scored(p) != null) ?? false;
  // Multiplier is 0 for the bench unless Bench Boost is active, so summing every pick is correct.
  const liveTotal = (picks?.picks ?? []).reduce((sum, p) => sum + (scored(p) ?? 0) * p.multiplier, 0);

  const firstEvent = entry?.started_event ?? 1;
  const currentEvent = entry?.current_event ?? 0;
  return {
    index,
    entry,
    entryError,
    event,
    setEvent: setSelected,
    gameweeks: Array.from({ length: Math.max(0, currentEvent - firstEvent + 1) }, (_, i) => currentEvent - i),
    eventInfo,
    picks,
    /** FPL's own gameweek points once the gameweek is finished, else the live total less any hit */
    points: history && anyLive && !eventInfo?.finished ? liveTotal - history.event_transfers_cost : history?.points,
    livePoints: new Map(live?.elements.map((e) => [e.id, e.stats]) ?? []),
    fixturesOf,
    scored,
    /** Provisional bonus per player for fixtures still in play */
    bonus,
    autoSubsIn,
    autoSubsOut,
    isLoading: loadingBootstrap || loadingEntry || loadingPicks || loadingLive || loadingFixtures,
  };
}
