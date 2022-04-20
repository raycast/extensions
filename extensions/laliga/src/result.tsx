import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import CompetitionDropdown, {
  competitions,
} from "./components/competition_dropdown";
import { Match } from "./types";
import { getCurrentGameWeek, getMatches } from "./api";

interface Matchday {
  [key: string]: Match[];
}

export default function Fixture() {
  const [matches, setMatches] = useState<Matchday>();
  const [competition, setCompetition] = useState<string>(competitions[0].value);
  const [matchday, setMatchday] = useState<number>(0);

  useEffect(() => {
    setMatchday(0);
    setMatches(undefined);

    getCurrentGameWeek(competition).then((gameweek) => {
      setMatchday(gameweek.week);
    });
  }, [competition]);

  useEffect(() => {
    if (matchday) {
      showToast({
        title: `Getting Matchday ${matchday}`,
        style: Toast.Style.Animated,
      });
      getMatches(competition, matchday).then((data) => {
        setMatches({
          ...matches,
          [`Matchday ${matchday}`]: data,
        });
        showToast({
          title: `Matchday ${matchday} Added`,
          style: Toast.Style.Success,
        });
      });
    }
  }, [matchday]);

  return (
    <List
      throttle
      isLoading={!matches}
      searchBarAccessory={
        <CompetitionDropdown selected={competition} onSelect={setCompetition} />
      }
    >
      {Object.entries(matches || {}).map(([label, results]) => {
        return (
          <List.Section key={label} title={label}>
            {results.map((match) => {
              return (
                <List.Item
                  key={match.id}
                  title={format(new Date(match.date), "eee dd.MM.yyyy HH:mm")}
                  subtitle={
                    match.status === "PreMatch"
                      ? `${match.home_team.nickname} - ${match.away_team.nickname}`
                      : `${match.home_team.nickname} ${match.home_score} - ${match.away_score} ${match.away_team.nickname}`
                  }
                  icon={Icon.Clock}
                  accessories={[
                    { text: `${match.venue.name}, ${match.venue.city}` },
                    { icon: "stadium.svg" },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`https://www.laliga.com/en-GB/match/${match.slug}`}
                      />
                      {matchday > 1 && (
                        <Action
                          title="Load Previous Matchday"
                          icon={Icon.MagnifyingGlass}
                          onAction={() => {
                            setMatchday(matchday - 1);
                          }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
