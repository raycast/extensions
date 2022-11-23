import { useState, Fragment } from "react";
import { Action, ActionPanel, Icon, List, open, Color } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { format, formatDistanceToNowStrict, isToday, startOfDay } from "date-fns";
import groupBy from "lodash.groupby";
import FilterDropdown from "./FilterDropdown";
import flags from "./flags";
import { Match } from "./types";
import { capitalizeFirstLetter } from "./utils";

const BASE_URL = `https://api.fifa.com/api/v3`;
const LOCALE = Intl.DateTimeFormat().resolvedOptions().locale.split("-", 1)[0];
// languages "lt" and "ru" are listed on fifa.com, but did not work when constructing URL
const SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "ar", "ja"];
const LANG = SUPPORTED_LANGUAGES.includes(LOCALE) ? LOCALE : `en`;
const ID_SEASON = `255711`; // world cup qatar 2022
const COUNT = 64; // limit to 64 (all matches)

type Data = {
  [key: string]: Match[];
};

export default function Command() {
  const { isLoading, data, revalidate } = useFetch(
    `${BASE_URL}/calendar/matches?language=en&count=${COUNT}&idSeason=${ID_SEASON}`
  );
  const [filter, setFilter] = useState("all");
  const [showingDetail, setShowingDetail] = useCachedState("showDetails", true);

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
      isShowingDetail={showingDetail}
      isLoading={isLoading}
      searchBarAccessory={<FilterDropdown handleChange={onFilterChange} />}
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
                Stadium,
              } = match;

              const home = `${flags[Home?.Abbreviation || ""] || ""} ${Home?.Abbreviation || "Unknown"}`;
              const away = `${flags[Away?.Abbreviation || ""] || ""} ${Away?.Abbreviation || "Unknown"}`;

              console.log(MatchStatus);

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
                            `https://www.fifa.com/fifaplus/${LANG}/match-centre/match/${IdCompetition}/${IdSeason}/${IdStage}/${IdMatch}`
                          )
                        }
                      />
                      <Action title="Reload" icon={Icon.RotateClockwise} onAction={revalidate} />
                      <Action
                        title="Toggle Detail"
                        icon={Icon.AppWindowSidebarLeft}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={() => setShowingDetail(!showingDetail)}
                      />
                    </ActionPanel>
                  }
                  icon={{
                    source: Icon.Dot,
                    tintColor: MatchStatus === 0 ? Color.Green : MatchStatus === 3 ? Color.Yellow : Color.Red,
                  }}
                  subtitle={MatchStatus !== 0 ? capitalizeFirstLetter(getTime(match)) : ""}
                  keywords={[Home?.TeamName[0]?.Description || "", Away?.TeamName[0]?.Description || ""]}
                  title={`${home}  vs  ${away}`}
                  accessories={[
                    HomeTeamScore || HomeTeamScore === 0 ? { text: `${HomeTeamScore} : ${AwayTeamScore}` } : {},
                    {
                      text: !showingDetail
                        ? GroupName[0]?.Description
                          ? GroupName[0]?.Description
                          : StageName[0]?.Description
                        : "",
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Stage" text={StageName[0]?.Description} />
                          {GroupName[0]?.Description && (
                            <List.Item.Detail.Metadata.Label title="Group" text={GroupName[0]?.Description} />
                          )}
                          <List.Item.Detail.Metadata.Label title="Stadium" text={Stadium.Name[0].Description} />
                          <List.Item.Detail.Metadata.Separator />

                          {home.trim() != "Unknown" && MatchStatus !== 1 && (
                            <Fragment>
                              <List.Item.Detail.Metadata.Label title={home} />
                              {Home?.Tactics && <List.Item.Detail.Metadata.Label title="Tactic" text={Home?.Tactics} />}
                              <List.Item.Detail.Metadata.Separator />
                            </Fragment>
                          )}

                          {away.trim() != "Unknown" && MatchStatus !== 1 && (
                            <Fragment>
                              <List.Item.Detail.Metadata.Label title={away} />
                              {Away?.Tactics && <List.Item.Detail.Metadata.Label title="Tactic" text={Away?.Tactics} />}
                            </Fragment>
                          )}

                          {home.trim() === "Unknown" && away.trim() === "Unknown" && (
                            <List.Item.Detail.Metadata.Label title="TBD" />
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
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
