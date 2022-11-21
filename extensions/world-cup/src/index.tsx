import { useState } from "react";
import { Action, ActionPanel, Icon, List, open, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { format, formatDistanceToNowStrict, isToday, startOfDay } from "date-fns";
import groupBy from "lodash.groupby";
import FilterDropdown from "./FilterDropdown";
import flags from "./flags";
import { Match } from "./types";

const BASE_URL = `https://api.fifa.com/api/v3`;
const LANG = `en`;
const ID_SEASON = `255711`; // world cup qatar 2022
const COUNT = 64; // limit to 64 (all matches)

type Data = {
  [key: string]: Match[];
};

export default function Command() {
  const { isLoading, data, revalidate } = useFetch(
    `${BASE_URL}/calendar/matches?language=${LANG}&count=${COUNT}&idSeason=${ID_SEASON}`
  );
  const [filter, setFilter] = useState("all");

  let matches: Match[] = (data as Data)?.Results || [];

  if (filter === "next") {
    matches = matches.filter((match) => match.MatchStatus !== 0);
  }

  if (filter === "prev") {
    matches = matches.filter((match) => match.MatchStatus === 0);
  }

  const matchesByDay = groupBy(matches, (match: { Date: string }) => startOfDay(new Date(match.Date)));

  const onFilterChange = (value: string) => {
    setFilter(value);
  };

  const getTime = (match: Match): string | null | undefined => {
    const matchDate = new Date(match.Date);

    // not started
    if (match.MatchStatus === 1) {
      if (isToday(matchDate)) {
        return formatDistanceToNowStrict(matchDate, { addSuffix: true });
      } else {
        return format(matchDate, "hh:mm a");
      }
    }

    // finished
    if (match.MatchStatus === 0) {
      return "Finished";
    }

    // in game
    if (match.MatchTime) {
      return match.MatchTime;
    }

    if (match.MatchStatus === 3) {
      return "now";
    }

    return "";
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={<FilterDropdown handleChange={onFilterChange} />}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={revalidate} />
        </ActionPanel>
      }
    >
      {Object.keys(matchesByDay).map((day) => {
        const dayString = format(startOfDay(new Date(day)), "E dd MMM");

        return (
          <List.Section title={dayString} key={dayString}>
            {matchesByDay[day].map((match: Match) => {
              const {
                IdCompetition,
                IdSeason,
                IdStage,
                IdMatch,
                GroupName,
                StageName,
                HomeTeamScore,
                AwayTeamScore,
                MatchStatus,
                Home,
                Away,
              } = match;

              return (
                <List.Item
                  key={IdMatch}
                  id={IdMatch}
                  actions={
                    <ActionPanel>
                      <Action
                        title="See Match on FIFA.com"
                        icon={Icon.SoccerBall}
                        onAction={() =>
                          open(
                            `https://www.fifa.com/fifaplus/es/match-centre/match/${IdCompetition}/${IdSeason}/${IdStage}/${IdMatch}`
                          )
                        }
                      />
                    </ActionPanel>
                  }
                  icon={{
                    source: Icon.Dot,
                    tintColor: MatchStatus === 0 ? Color.Green : MatchStatus === 3 ? Color.Yellow : Color.Red,
                  }}
                  subtitle={getTime(match) || ""}
                  keywords={[Home?.TeamName[0]?.Description || "", Away?.TeamName[0]?.Description || ""]}
                  title={`${flags[Home?.Abbreviation || ""] || ""} ${Home?.Abbreviation || "Unknown"}  vs  ${
                    flags[Away?.Abbreviation || ""] || ""
                  } ${Away?.Abbreviation || "Unknown"}`}
                  accessories={[
                    HomeTeamScore || HomeTeamScore === 0 ? { text: `${HomeTeamScore} : ${AwayTeamScore}` } : {},
                    {
                      text: GroupName[0]?.Description ? GroupName[0]?.Description : StageName[0]?.Description,
                    },
                  ]}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
