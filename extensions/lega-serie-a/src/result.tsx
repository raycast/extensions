import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import SeasonDropdown, { seasons } from "./components/season_dropdown";
import { Match, Matchday } from "./types";
import { getMatchday, getMatches } from "./api";

const { language } = getPreferenceValues();

interface FixturesAndResults {
  [key: string]: Match[];
}

export default function Fixture() {
  const [matches, setMatches] = useState<FixturesAndResults>();
  const [season, setSeason] = useState<string>(seasons[0]);
  const [matchday, setMatchday] = useState<Matchday>();

  useEffect(() => {
    if (season) {
      setMatchday(undefined);
      setMatches(undefined);

      getMatchday(season).then((data) => {
        const currentDay = data.find(
          (d) =>
            d.category_status === "LIVE" || d.category_status === "TO BE PLAYED"
        );
        if (currentDay) {
          setMatchday(currentDay);
        } else {
          setMatchday(data.reverse()[0]);
        }
      });
    }
  }, [season]);

  useEffect(() => {
    if (matchday) {
      showToast({
        title: `Getting ${matchday.title}`,
        style: Toast.Style.Animated,
      });
      getMatches(season, matchday.id_category).then((data) => {
        setMatches({
          ...matches,
          [`${matchday.title}`]: data,
        });
        showToast({
          title: `${matchday.title} Added`,
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
        <SeasonDropdown selected={season} onSelect={setSeason} />
      }
    >
      {Object.entries(matches || {}).map(([label, results]) => {
        return (
          <List.Section key={label} title={label}>
            {results.map((match) => {
              let weather;
              try {
                weather = JSON.parse(match.weather);
              } catch (e) {
                // ignore
              }

              const accessories: List.Item.Accessory[] = [
                { text: match.venue_name },
              ];

              if (weather) {
                accessories.push({
                  icon: {
                    source: {
                      light: weather.icon_day.image_day,
                      dark: weather.icon_day.image_night,
                    },
                  },
                  tooltip: weather.icon_description,
                });
              }

              return (
                <List.Item
                  key={match.match_id}
                  title={format(
                    new Date(match.date_time),
                    "dd MMM yyyy - HH:mm"
                  )}
                  subtitle={
                    match.match_day_category_status === "PLAYED"
                      ? `${match.home_team_name} ${match.home_goal} - ${match.away_goal} ${match.away_team_name}`
                      : `${match.home_team_name} - ${match.away_team_name}`
                  }
                  icon={Icon.Clock}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`https://www.legaseriea.it/${language}${match.slug}`}
                      />
                      <Action.OpenInBrowser
                        title="Buy Ticket"
                        icon={Icon.Store}
                        url={match.ticket_url}
                      />
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
      })}
    </List>
  );
}
