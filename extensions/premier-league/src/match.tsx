import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { format, formatISO, getMonth, startOfMonth } from "date-fns";
import groupBy from "lodash.groupby";
import { getMatches, getSeasons, getClubs, getMatchweek } from "./api";
import Matchday from "./components/matchday";
import SearchBarCompetition, {
  competitions,
} from "./components/searchbar_competition";
import { convertISOToLocalTime } from "./utils";

const { filter } = getPreferenceValues();

const epl = competitions[0].value;

const getMonthName = (monthIndex: number): string => {
  const date = new Date(year, monthIndex, 1);
  return format(date, "MMMM");
};

const year = new Date().getFullYear();

export default function EPLMatchday() {
  const [competition, setCompetition] = useState<string>(epl);
  const isEPL = useMemo(() => competition === epl, [competition]);

  const [team, setTeam] = useState<string>("");

  const [matchweek, setMatchweek] = useState<number>(0);
  const [month, setMonth] = useState<number>(getMonth(new Date()));

  useEffect(() => {
    getMatchweek().then(setMatchweek);
  }, []);

  const { data: seasons = [] } = usePromise(getSeasons);

  const season = useMemo(() => seasons[0]?.seasonId, [seasons]);

  const { data: clubs } = usePromise(getClubs, [season]);

  const props = useMemo(() => {
    if (isEPL) {
      return {
        competition,
        team,
        season,
        matchweek,
      };
    }

    const start = formatISO(startOfMonth(new Date(year, month, 1)), {
      representation: "date",
    });
    const end = formatISO(startOfMonth(new Date(year, month + 1, 1)), {
      representation: "date",
    });

    return {
      competition,
      season,
      [`kickoff>${start}`]: "",
      [`kickoff<${end}`]: "",
      _limit: 20,
    };
  }, [competition, team, season, matchweek, month]);

  const { isLoading, data, pagination } = usePromise(
    (props) =>
      async ({ cursor: _next }) => {
        return await getMatches({
          ...props,
          _next,
        });
      },
    [props],
  );

  const matchday = groupBy(data, (f) =>
    f.kickoff
      ? convertISOToLocalTime(f.kickoff, f.kickoffTimezone, "EEE d MMM yyyy")
      : "Date To Be Confirmed",
  );

  const actions = isEPL ? (
    <ActionPanel.Section title="Matchweek">
      {matchweek > 1 && (
        <Action
          title={`Matchweek ${matchweek - 1}`}
          icon={Icon.ArrowLeftCircle}
          onAction={() => {
            setMatchweek(matchweek - 1);
          }}
        />
      )}
      {matchweek < 38 && (
        <Action
          title={`Matchweek ${matchweek + 1}`}
          icon={Icon.ArrowRightCircle}
          onAction={() => {
            setMatchweek(matchweek + 1);
          }}
        />
      )}
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section title="Matchweek">
      <Action
        title={getMonthName(month - 1)}
        icon={Icon.ArrowLeftCircle}
        onAction={() => {
          setMonth(month - 1);
        }}
      />
      <Action
        title={getMonthName(month + 1)}
        icon={Icon.ArrowRightCircle}
        onAction={() => {
          setMonth(month + 1);
        }}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      navigationTitle={
        isEPL
          ? `Matchweek ${matchweek} | Fixtures & Live Matches`
          : `${getMonthName(month)} | Fixtures & Live Matches`
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
