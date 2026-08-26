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
  getMatches,
  getMatchweek,
  getSeasons,
  getUpcomingMatchweek,
} from "./api";
import Matchday from "./components/matchday";
import SearchBarCompetition, {
  competitions,
} from "./components/searchbar_competition";
import { Fixture } from "./types";
import { convertISOToLocalTime, getKickoffDate } from "./utils";

const { filter } = getPreferenceValues();

const epl = competitions[0].value;

const TOTAL_MATCHWEEKS = 38;
const MATCHES_LIMIT = 100;

const year = new Date().getFullYear();

const getMonthName = (monthIndex: number): string => {
  const date = new Date(year, monthIndex, 1);
  return format(date, "MMMM");
};

type MatchRequest =
  | {
      kind: "matchweek";
      competition: string;
      season: string;
      team: string;
      matchweek: number;
      withPrevious: boolean;
    }
  | {
      kind: "month";
      competition: string;
      season: string;
      start: string;
      end: string;
    };

const emptyResult = { current: [] as Fixture[], previous: [] as Fixture[] };

const fetchMatches = async (request?: MatchRequest) => {
  if (!request) {
    return emptyResult;
  }

  if (request.kind === "month") {
    const { data } = await getMatches({
      competition: request.competition,
      season: request.season,
      [`kickoff>${request.start}`]: "",
      [`kickoff<${request.end}`]: "",
      _limit: MATCHES_LIMIT,
    });

    return { current: data, previous: [] as Fixture[] };
  }

  const { data: current } = await getMatches({
    competition: request.competition,
    season: request.season,
    team: request.team,
    matchweek: request.matchweek,
    _limit: MATCHES_LIMIT,
  });

  if (!request.withPrevious || request.matchweek <= 1) {
    return { current, previous: [] as Fixture[] };
  }

  const { data: previous } = await getMatches({
    competition: request.competition,
    season: request.season,
    team: request.team,
    matchweek: request.matchweek - 1,
    _limit: MATCHES_LIMIT,
  });

  return { current, previous };
};

export default function EPLMatchday() {
  const [competition, setCompetition] = useState<string>(epl);
  const isEPL = useMemo(() => competition === epl, [competition]);

  const [team, setTeam] = useState<string>("");
  const [selectedMatchweek, setSelectedMatchweek] = useState<number>();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [month, setMonth] = useState<number>(getMonth(new Date()));

  const { data: seasons = [] } = usePromise(getSeasons);
  const season = useMemo(() => seasons[0]?.seasonId, [seasons]);

  const { data: clubs } = usePromise(
    async (id?: string) => (id ? await getClubs(id) : []),
    [season],
  );

  const { data: upcomingMatchweek } = usePromise(
    async (id?: string) =>
      id
        ? ((await getUpcomingMatchweek(id)) ?? (await getMatchweek()))
        : undefined,
    [season],
  );

  const matchweek = selectedMatchweek ?? upcomingMatchweek;
  const isLandingView = selectedMatchweek === undefined;

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
            withPrevious: isLandingView,
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
  }, [competition, isEPL, isLandingView, matchweek, month, season, team]);

  const { isLoading, data } = usePromise(fetchMatches, [request]);

  const { current, previous } = data ?? emptyResult;

  const firstKickoff = current.find((match) => match.kickoff);
  const hasCommenced = firstKickoff
    ? getKickoffDate(firstKickoff.kickoff, firstKickoff.kickoffTimezone) <=
      new Date()
    : false;

  const showPrevious = previous.length > 0 && !hasCommenced;
  const fixtures = showPrevious ? [...previous, ...current] : current;

  const matchday = groupBy(fixtures, (f) =>
    f.kickoff
      ? convertISOToLocalTime(f.kickoff, f.kickoffTimezone, "EEE d MMM yyyy")
      : "Date To Be Confirmed",
  );

  const goToMatchweek = (next: number) => {
    setSelectedMatchweek(next);
    setSelectedItemId(null);
  };

  const onSearchBarSelect = (value: string) => {
    setSelectedItemId(null);
    if (filter === "competition") {
      setCompetition(value);
    } else {
      setTeam(value);
    }
  };

  const actions = isEPL ? (
    <ActionPanel.Section title="Matchweek">
      {matchweek && matchweek < TOTAL_MATCHWEEKS && (
        <Action
          title={`Next Matchweek (${matchweek + 1})`}
          icon={Icon.ArrowRightCircle}
          shortcut={{ modifiers: [], key: "]" }}
          onAction={() => goToMatchweek(matchweek + 1)}
        />
      )}
      {matchweek && matchweek > 1 && (
        <Action
          title={`Previous Matchweek (${matchweek - 1})`}
          icon={Icon.ArrowLeftCircle}
          shortcut={{ modifiers: [], key: "[" }}
          onAction={() => goToMatchweek(matchweek - 1)}
        />
      )}
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section title="Matchweek">
      <Action
        title={getMonthName(month + 1)}
        icon={Icon.ArrowRightCircle}
        shortcut={{ modifiers: [], key: "]" }}
        onAction={() => {
          setSelectedItemId(null);
          setMonth(month + 1);
        }}
      />
      <Action
        title={getMonthName(month - 1)}
        icon={Icon.ArrowLeftCircle}
        shortcut={{ modifiers: [], key: "[" }}
        onAction={() => {
          setSelectedItemId(null);
          setMonth(month - 1);
        }}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      throttle
      isLoading={isLoading || !request}
      navigationTitle={
        isEPL
          ? `Matchweek ${matchweek ?? ""} | Fixtures & Live Matches`
          : `${getMonthName(month)} | Fixtures & Live Matches`
      }
      selectedItemId={selectedItemId ?? current[0]?.matchId}
      onSelectionChange={setSelectedItemId}
      searchBarAccessory={
        <SearchBarCompetition
          type={filter}
          selected={team}
          onSelect={onSearchBarSelect}
          data={
            filter === "competition"
              ? competitions
              : clubs?.map((c) => ({ title: c.name, value: c.id })) || []
          }
        />
      }
    >
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
