import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { format, formatISO, getMonth, startOfMonth } from "date-fns";
import groupBy from "lodash.groupby";
import {
  getClubs,
  getLatestPlayedMatchweek,
  getMatches,
  getMatchweek,
  getSeasons,
  getUpcomingMatchweek,
} from "../api";
import Matchday from "./matchday";
import JumpToMatchweek from "./jump_to_matchweek";
import SearchBarCompetition, { competitions } from "./searchbar_competition";
import { Fixture } from "../types";
import { convertISOToLocalTime, isFinished, TOTAL_MATCHWEEKS } from "../utils";

const { filter } = getPreferenceValues();

const epl = competitions[0].value;

const MATCHES_LIMIT = 100;

const year = new Date().getFullYear();

const getMonthName = (monthIndex: number): string =>
  format(new Date(year, monthIndex, 1), "MMMM");

type Direction = "past" | "future";

type MatchRequest =
  | {
      kind: "matchweek";
      competition: string;
      season: string;
      team: string;
      matchweek: number;
      direction: Direction;
    }
  | {
      kind: "month";
      competition: string;
      season: string;
      start: string;
      end: string;
    };

export default function MatchweekList(props: {
  direction: Direction;
  navigationTitle: string;
}) {
  const { direction, navigationTitle } = props;
  const isPast = direction === "past";

  const [competition, setCompetition] = useState<string>(epl);
  const isEPL = useMemo(() => competition === epl, [competition]);

  const [team, setTeam] = useState<string>("");
  const [selectedMatchweek, setSelectedMatchweek] = useState<number>();
  const [month, setMonth] = useState<number>(getMonth(new Date()));

  const { data: seasons = [] } = usePromise(getSeasons);
  const season = useMemo(() => seasons[0]?.seasonId, [seasons]);

  const { data: clubs } = usePromise(
    async (id?: string) => (id ? await getClubs(id) : []),
    [season],
  );

  const { data: landingMatchweek } = usePromise(
    async (id?: string) => {
      if (!id) return undefined;
      return isPast
        ? ((await getLatestPlayedMatchweek(id)) ?? (await getMatchweek()))
        : ((await getUpcomingMatchweek(id)) ?? (await getMatchweek()));
    },
    [season],
  );

  const matchweek = selectedMatchweek ?? landingMatchweek;

  const request = useMemo<MatchRequest | undefined>(() => {
    if (!season) {
      return undefined;
    }

    if (isEPL) {
      return matchweek
        ? {
            kind: "matchweek",
            competition,
            season,
            team,
            matchweek,
            direction,
          }
        : undefined;
    }

    return {
      kind: "month",
      competition,
      season,
      start: formatISO(startOfMonth(new Date(year, month, 1)), {
        representation: "date",
      }),
      end: formatISO(startOfMonth(new Date(year, month + 1, 1)), {
        representation: "date",
      }),
    };
  }, [competition, direction, isEPL, matchweek, month, season, team]);

  const requestKey = request ? JSON.stringify(request) : "";
  const [resolvedRequestKey, setResolvedRequestKey] = useState("");

  const { data, pagination } = usePromise(
    (request?: MatchRequest) =>
      async ({ cursor }: { cursor?: string | number }) => {
        if (!request) {
          return { data: [] as Fixture[], hasMore: false };
        }

        const keep = (match: Fixture) =>
          isPast ? isFinished(match) : !isFinished(match);

        if (request.kind === "month") {
          const page = await getMatches({
            competition: request.competition,
            season: request.season,
            [`kickoff>${request.start}`]: "",
            [`kickoff<${request.end}`]: "",
            _limit: 20,
            _next: cursor as string,
          });

          return {
            data: page.data.filter(keep),
            hasMore: page.hasMore,
            cursor: page.cursor ?? undefined,
          };
        }

        const week = typeof cursor === "number" ? cursor : request.matchweek;

        const page = await getMatches({
          competition: request.competition,
          season: request.season,
          team: request.team,
          matchweek: week,
          _limit: MATCHES_LIMIT,
          _sort: request.direction === "past" ? "kickoff:desc" : "kickoff:asc",
        });

        const next = request.direction === "past" ? week - 1 : week + 1;
        const hasMore =
          request.direction === "past" ? next >= 1 : next <= TOTAL_MATCHWEEKS;

        return { data: page.data.filter(keep), hasMore, cursor: next };
      },
    [request as MatchRequest],
    {
      execute: Boolean(request),
      onData: () => setResolvedRequestKey(requestKey),
      onError: () => setResolvedRequestKey(requestKey),
    },
  );

  const matchday = groupBy(data, (f) =>
    f.kickoff
      ? convertISOToLocalTime(f.kickoff, f.kickoffTimezone, "EEE d MMM yyyy")
      : "Date To Be Confirmed",
  );

  const canGoPrevious = Boolean(
    isEPL &&
    matchweek &&
    landingMatchweek &&
    (isPast ? matchweek > 1 : matchweek > landingMatchweek),
  );

  const canGoNext = Boolean(
    isEPL &&
    matchweek &&
    landingMatchweek &&
    (isPast ? matchweek < landingMatchweek : matchweek < TOTAL_MATCHWEEKS),
  );

  const previousAction = canGoPrevious && matchweek && (
    <Action
      title={`Previous: Matchweek ${matchweek - 1}`}
      icon={Icon.ArrowLeftCircle}
      shortcut={{ modifiers: [], key: "[" }}
      onAction={() => setSelectedMatchweek(matchweek - 1)}
    />
  );

  const nextAction = canGoNext && matchweek && (
    <Action
      title={`Next: Matchweek ${matchweek + 1}`}
      icon={Icon.ArrowRightCircle}
      shortcut={{ modifiers: [], key: "]" }}
      onAction={() => setSelectedMatchweek(matchweek + 1)}
    />
  );

  const actions = isEPL ? (
    <ActionPanel.Section title="Matchweek">
      {isPast ? previousAction : nextAction}
      {isPast ? nextAction : previousAction}
      <Action.Push
        title="Jump to…"
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: [], key: "j" }}
        target={
          <JumpToMatchweek current={matchweek} onJump={setSelectedMatchweek} />
        }
      />
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section title="Month">
      <Action
        title={getMonthName(month + 1)}
        icon={Icon.ArrowRightCircle}
        shortcut={{ modifiers: [], key: "]" }}
        onAction={() => setMonth(month + 1)}
      />
      <Action
        title={getMonthName(month - 1)}
        icon={Icon.ArrowLeftCircle}
        shortcut={{ modifiers: [], key: "[" }}
        onAction={() => setMonth(month - 1)}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      throttle
      isLoading={!request || resolvedRequestKey !== requestKey}
      navigationTitle={
        isEPL
          ? `Matchweek ${matchweek ?? ""} | ${navigationTitle}`
          : `${getMonthName(month)} | ${navigationTitle}`
      }
      pagination={pagination}
      searchBarAccessory={
        <SearchBarCompetition
          type={filter}
          selected={team}
          onSelect={filter === "competition" ? setCompetition : setTeam}
          data={
            filter === "competition"
              ? competitions
              : clubs?.map((c) => ({ title: c.name, value: c.id })) || []
          }
        />
      }
    >
      <List.EmptyView
        icon="premier-league.svg"
        title="No Matches"
        description={
          isEPL
            ? `No matches in Matchweek ${matchweek ?? ""}`
            : `No matches in ${getMonthName(month)}`
        }
        actions={<ActionPanel>{actions}</ActionPanel>}
      />
      {Object.entries(matchday).map(([day, matches]) => {
        return (
          <Matchday
            key={day}
            matchday={day}
            matches={matches}
            actions={actions}
          />
        );
      })}
    </List>
  );
}
