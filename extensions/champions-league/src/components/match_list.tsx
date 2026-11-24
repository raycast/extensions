import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getCurrentSeasonYear, getMatches, getRounds, getTeams } from "../api";
import {
  groupByDay,
  isLive,
  seasonLabel,
  t,
  teamLogo,
  teamName,
} from "../utils";
import MatchItem from "./match_item";
import { Round, Team } from "../types";

type Direction = "past" | "future";

const LIVE_REFRESH_MS = 30_000;

export default function MatchList({ direction }: { direction: Direction }) {
  const { filter } = getPreferenceValues<Preferences>();
  const isPast = direction === "past";
  const [selection, setSelection] = useState<string>("all");

  const { data: seasonYear } = useCachedPromise(getCurrentSeasonYear);
  const { data: teams = [] } = useCachedPromise(
    async (s?: string) => (s ? getTeams(s) : ([] as Team[])),
    [seasonYear],
    {
      execute: filter === "club",
    },
  );
  const { data: rounds = [] } = useCachedPromise(
    async (s?: string) => (s ? getRounds(s) : ([] as Round[])),
    [seasonYear],
    {
      execute: filter === "round",
    },
  );

  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (season: string, selected: string, by: string, past: boolean) =>
      async ({ page }: { page: number }) =>
        getMatches(
          {
            seasonYear: season,
            status: past ? "FINISHED" : ["LIVE", "UPCOMING"],
            order: past ? "DESC" : "ASC",
            teamId: by === "club" && selected !== "all" ? selected : undefined,
            roundId:
              by === "round" && selected !== "all" ? selected : undefined,
          },
          page,
          40,
        ),
    [seasonYear ?? "", selection, filter, isPast],
    { execute: Boolean(seasonYear), keepPreviousData: true },
  );

  const hasLive = useMemo(() => data?.some(isLive) ?? false, [data]);

  useEffect(() => {
    if (!hasLive) return;
    const timer = setInterval(revalidate, LIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [hasLive, revalidate]);

  const live = !isPast ? (data ?? []).filter(isLive) : [];
  const rest = !isPast ? (data ?? []).filter((m) => !isLive(m)) : (data ?? []);

  const refresh = (
    <ActionPanel.Section>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`${isPast ? "Results" : "Fixtures & Live"}${seasonYear ? ` | ${seasonLabel(seasonYear)}` : ""}`}
      searchBarPlaceholder="Search by club"
      searchBarAccessory={
        <List.Dropdown
          tooltip={filter === "club" ? "Filter by Club" : "Filter by Round"}
          onChange={setSelection}
          storeValue
        >
          <List.Dropdown.Item
            title={filter === "club" ? "All Clubs" : "All Rounds"}
            value="all"
          />
          {filter === "club"
            ? teams.map((team) => (
                <List.Dropdown.Item
                  key={team.id}
                  title={teamName(team)}
                  value={team.id}
                  icon={teamLogo(team)}
                />
              ))
            : rounds.map((round) => (
                <List.Dropdown.Item
                  key={round.id}
                  title={t(round.translations, "name", round.metaData.name)}
                  value={round.id}
                />
              ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.SoccerBall}
        title={isPast ? "No results yet" : "No upcoming matches"}
        description={
          isPast
            ? "Completed matches will appear here."
            : "The season may be over — check Results."
        }
      />
      {live.length > 0 && (
        <List.Section title="🔴 Live Now" subtitle="Auto-refreshes every 30s">
          {live.map((match) => (
            <MatchItem key={match.id} match={match} actions={refresh} />
          ))}
        </List.Section>
      )}
      {groupByDay(rest).map(([day, matches]) => (
        <List.Section key={day} title={day}>
          {matches.map((match) => (
            <MatchItem key={match.id} match={match} actions={refresh} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
