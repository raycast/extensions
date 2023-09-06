import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import groupBy from "lodash.groupby";
import SeasonDropdown from "./components/season_dropdown";
import { FixturesAndResults } from "./types";
import { getMatches } from "./api";

interface Fixtures {
  [key: string]: FixturesAndResults[];
}

export default function Fixture() {
  const [fixtures, setFixtures] = useState<Fixtures>();
  const [season, setSeason] = useState<string>("");
  const [matchday, setMatchday] = useState<number>(0);

  useEffect(() => {
    showToast({
      title: matchday
        ? `Getting Matchday ${matchday}`
        : "Getting Latest Matchday",
      style: Toast.Style.Animated,
    });
    getMatches(season).then((data) => {
      setFixtures({
        ...fixtures,
        [`Matchday ${matchday}`]: data,
      });
      showToast({
        title: "Matchday Added",
        style: Toast.Style.Success,
      });
    });
  }, [matchday, season]);

  return (
    <List
      throttle
      isLoading={!fixtures}
      searchBarAccessory={
        <SeasonDropdown selected={season} onSelect={setSeason} />
      }
    >
      {Object.entries(fixtures || {}).map(([matchday, results]) => {
        const days: Fixtures = groupBy(results, "day");

        return Object.entries(days).map(([day, matches]) => {
          return (
            <List.Section key={day} title={day}>
              {matches.map((match) => {
                let icon: Image.ImageLike;
                if (match.title.includes("-")) {
                  icon = { source: Icon.CheckCircle, tintColor: Color.Green };
                } else {
                  icon = Icon.Clock;
                }

                // const accessories: List.Item.Accessory[] = [
                //   { text: match.venue.name },
                //   { icon: "stadium.svg" },
                // ];

                return (
                  <List.Item
                    key={match.url}
                    title={match.title}
                    // subtitle={
                    //   match.status === "PreMatch"
                    //     ? `${match.home_team.nickname} - ${match.away_team.nickname}`
                    //     : `${match.home_team.nickname} ${match.home_score} - ${match.away_score} ${match.away_team.nickname}`
                    // }
                    icon={icon}
                    // accessories={accessories}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser url={match.url} />
                        {/* {matchday > 1 && (
                          <Action
                            title="Load Previous Matchday"
                            icon={Icon.MagnifyingGlass}
                            onAction={() => {
                              setMatchday(matchday - 1);
                            }}
                          />
                        )} */}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        });
      })}
    </List>
  );
}
