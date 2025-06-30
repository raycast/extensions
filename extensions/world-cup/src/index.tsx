import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, open, Color, getLocalStorageItem } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { format, formatDistanceToNowStrict, isToday, startOfDay } from "date-fns";
import groupBy from "lodash.groupby";
import FilterDropdown from "./FilterDropdown";
import flags from "./flags";
import { Goal, Match, Player, Team } from "./types";
import { capitalizeFirstLetter } from "./utils";
import fetch from "cross-fetch";

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

type LiveData = {
  HomeTeam: Team;
  AwayTeam: Team;
};

function Goals({ match, side }: { match: Match; side: "home" | "away" }) {
  const { IdCompetition, IdSeason, IdStage, IdMatch } = match;
  const { isLoading, data } = useFetch(`${BASE_URL}/live/football/${IdCompetition}/${IdSeason}/${IdStage}/${IdMatch}`);

  if (!data) return null;

  const team = (data as LiveData)[side === "home" ? "HomeTeam" : "AwayTeam"];
  const goals = team?.Goals?.filter((goal: Goal) => goal.IdTeam === team.IdTeam) || [];

  const getPlayerName = (playerId: string): string => {
    const player = team?.Players?.find((p: Player) => p.IdPlayer === playerId);
    return player?.PlayerName[0]?.Description || playerId;
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      {goals?.map((goal: Goal, i) => {
        return (
          <List.Item.Detail.Metadata.Label
            key={goal.IdGoal || i}
            title=""
            text={`${getPlayerName(goal.IdPlayer)} ${goal.Minute}`}
          />
        );
      })}
    </>
  );
}

export default function Command() {
  const { isLoading, data, revalidate } = useFetch(
    `${BASE_URL}/calendar/matches?language=en&count=${COUNT}&idSeason=${ID_SEASON}`
  );
  const [filter, setFilter] = useCachedState("filter", "all");
  const [showingDetail, setShowingDetail] = useCachedState("showDetails", false);

  const [time, setTime] = useCachedState("time", null);
  const [score, setScore] = useCachedState("score", "");

  const [time2, setTime2] = useCachedState("time", null);
  const [score2, setScore2] = useCachedState("score2", "");

  const [refresh, setRefresh] = useState<number | null>(null);

  let matches: Match[] = (data as Data)?.Results || [];

  const currentMatches = matches.filter((match) => match.MatchStatus === 3);

  const match1 = currentMatches[0];
  const match2 = currentMatches[1];

  useEffect(() => {
    if (!currentMatches.length) return;

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      setRefresh(Date.now());
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [currentMatches]);

  useEffect(() => {
    const fetchCurrentMatch = async (match: Match) => {
      const { IdCompetition, IdSeason, IdStage, IdMatch } = match;
      const res = await fetch(`${BASE_URL}/live/football/${IdCompetition}/${IdSeason}/${IdStage}/${IdMatch}`);
      const data = await res.json();
      setTime(data?.MatchTime || null);
      setScore(`${data?.HomeTeam?.Score} : ${data?.AwayTeam?.Score}`);
    };

    if (match1) {
      fetchCurrentMatch(match1);
    }
  }, [match1, refresh]);

  useEffect(() => {
    const fetchCurrentMatch = async (match: Match) => {
      const { IdCompetition, IdSeason, IdStage, IdMatch } = match;
      const res = await fetch(`${BASE_URL}/live/football/${IdCompetition}/${IdSeason}/${IdStage}/${IdMatch}`);
      const data = await res.json();
      setTime2(data?.MatchTime || null);
      setScore2(`${data?.HomeTeam?.Score} : ${data?.AwayTeam?.Score}`);
    };

    if (match2) {
      fetchCurrentMatch(match2);
    }
  }, [match2, refresh]);

  const getScore = (match: Match) => {
    return match?.IdMatch === match2?.IdMatch ? score2 : score;
  };

  if (filter === "next") {
    matches = matches.filter((match) => match.MatchStatus !== 0);
  }

  if (filter === "prev") {
    matches = matches.filter((match) => match.MatchStatus === 0).reverse();
  }

  const matchesByDay = groupBy(matches, (match: { Date: string }) => startOfDay(new Date(match.Date)));

  const onFilterChange = (value: string) => {
    setFilter(value);
  };

  const getTime = (match: Match): string | null | undefined => {
    const matchDate = new Date(match.Date);

    // not started or starts soon
    if (match.MatchStatus === 1 || match.MatchStatus === 12) {
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

    // live
    if (match.MatchStatus === 3) {
      return (match?.IdMatch === match2?.IdMatch ? time2 : time) || "Now";
    }

    return "";
  };

  return (
    <List
      isShowingDetail={showingDetail}
      isLoading={isLoading}
      searchBarAccessory={<FilterDropdown handleChange={onFilterChange} />}
    >
      <List.EmptyView title="No Matches Found" icon="mascot.gif" />
      {Object.keys(matchesByDay).map((day) => {
        const dayString = format(startOfDay(new Date(day)), "E dd MMM");

        return (
          <List.Section title={dayString} key={dayString}>
            {matchesByDay[day].map((match: Match) => {
              const {
                IdCompetition,
                IdSeason,
                IdStage,
                Attendance,
                IdMatch,
                GroupName,
                StageName,
                HomeTeamScore,
                AwayTeamScore,
                MatchStatus,
                Home,
                Away,
                Stadium,
                Officials,
              } = match;

              const home = `${flags[Home?.Abbreviation || ""] || ""} ${Home?.Abbreviation || "Unknown"}`;
              const away = `${flags[Away?.Abbreviation || ""] || ""} ${Away?.Abbreviation || "Unknown"}`;

              return (
                <List.Item
                  key={IdMatch}
                  id={IdMatch}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Toggle Details"
                        icon={Icon.AppWindowSidebarLeft}
                        onAction={() => setShowingDetail(!showingDetail)}
                      />
                      <Action
                        title="See Match on FIFA.com"
                        icon={Icon.SoccerBall}
                        onAction={() =>
                          open(
                            `https://www.fifa.com/fifaplus/${LANG}/match-centre/match/${IdCompetition}/${IdSeason}/${IdStage}/${IdMatch}`
                          )
                        }
                      />
                      <Action
                        title="Reload"
                        icon={Icon.RotateClockwise}
                        onAction={revalidate}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
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
                    MatchStatus === 3 || MatchStatus === 0
                      ? { text: MatchStatus === 3 ? getScore(match) : `${HomeTeamScore} : ${AwayTeamScore}` }
                      : {},
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
                          {Attendance && <List.Item.Detail.Metadata.Label title="Attendance" text={Attendance} />}

                          {home.trim() != "Unknown" && MatchStatus !== 1 && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title={home} text={HomeTeamScore?.toString()} />
                              <Goals match={match} side="home" />
                              {Home?.Tactics && <List.Item.Detail.Metadata.Label title="Tactic" text={Home?.Tactics} />}
                            </>
                          )}

                          {away.trim() != "Unknown" && MatchStatus !== 1 && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title={away} text={AwayTeamScore?.toString()} />
                              <Goals match={match} side="away" />
                              {Away?.Tactics && <List.Item.Detail.Metadata.Label title="Tactic" text={Away?.Tactics} />}
                            </>
                          )}

                          {Officials.length > 0 && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.TagList title="Officials">
                                {Officials?.map((official, index) => (
                                  <List.Item.Detail.Metadata.TagList.Item
                                    key={index}
                                    text={`${official.NameShort[0].Description}`}
                                  />
                                ))}
                              </List.Item.Detail.Metadata.TagList>
                            </>
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
