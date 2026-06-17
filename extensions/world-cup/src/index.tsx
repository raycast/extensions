import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, open, Color } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { format, formatDistanceToNowStrict, isToday, startOfDay } from "date-fns";
import groupBy from "lodash.groupby";
import FilterDropdown from "./FilterDropdown";
import {
  getMatches,
  getMatchCenterUrl,
  getMatchLiveData,
  getPlayerName,
  getTeamGoals,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  matchScore,
  matchStage,
  matchVenue,
  teamCode,
  teamFlag,
  teamLabel,
  teamName,
  type Goal,
  type Match,
  type Team,
} from "./lib/worldcup";
import { capitalizeFirstLetter } from "./utils";

function Goals({ match, side }: { match: Match; side: "home" | "away" }) {
  const { isLoading, data } = useCachedPromise(getMatchLiveData, [match]);

  if (!data) return null;

  const team = side === "home" ? data.HomeTeam : data.AwayTeam;
  const goals = getTeamGoals(team);

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
            text={`${getPlayerName(team, goal.IdPlayer)} ${goal.Minute}`}
          />
        );
      })}
    </>
  );
}

function countryDetail(team: Team | null): string | undefined {
  if (!team) return undefined;

  const name = teamName(team);
  const code = teamCode(team);
  if (!name || name === "TBD" || name === code) return undefined;

  return `${teamFlag(team)} ${name}${code ? ` (${code})` : ""}`;
}

export default function Command() {
  const { isLoading, data = [], revalidate } = useCachedPromise(getMatches);
  const [filter, setFilter] = useCachedState("filter", "all");
  const [showingDetail, setShowingDetail] = useCachedState("showDetails", false);

  const [time, setTime] = useCachedState<string | null>("time", null);
  const [score, setScore] = useCachedState("score", "");

  const [time2, setTime2] = useCachedState<string | null>("time2", null);
  const [score2, setScore2] = useCachedState("score2", "");

  const [refresh, setRefresh] = useState<number | null>(null);

  let matches: Match[] = data;

  const currentMatches = matches.filter(isLiveMatch);

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
      const data = await getMatchLiveData(match);
      setTime(data?.MatchTime || null);
      setScore(`${data?.HomeTeam?.Score ?? 0} : ${data?.AwayTeam?.Score ?? 0}`);
    };

    if (match1) {
      fetchCurrentMatch(match1);
    }
  }, [match1, refresh]);

  useEffect(() => {
    const fetchCurrentMatch = async (match: Match) => {
      const data = await getMatchLiveData(match);
      setTime2(data?.MatchTime || null);
      setScore2(`${data?.HomeTeam?.Score ?? 0} : ${data?.AwayTeam?.Score ?? 0}`);
    };

    if (match2) {
      fetchCurrentMatch(match2);
    }
  }, [match2, refresh]);

  const getScore = (match: Match) => {
    return match?.IdMatch === match2?.IdMatch ? score2 : score;
  };

  if (filter === "next") {
    matches = matches.filter((match) => !isFinishedMatch(match));
  }

  if (filter === "prev") {
    matches = matches.filter(isFinishedMatch).reverse();
  }

  const matchesByDay = groupBy(matches, (match: { Date: string }) => startOfDay(new Date(match.Date)));

  const onFilterChange = (value: string) => {
    setFilter(value);
  };

  const getTime = (match: Match): string | null | undefined => {
    const matchDate = new Date(match.Date);

    // not started or starts soon
    if (isUpcomingMatch(match)) {
      if (isToday(matchDate)) {
        return formatDistanceToNowStrict(matchDate, { addSuffix: true });
      } else {
        return format(matchDate, "hh:mm a");
      }
    }

    // finished
    if (isFinishedMatch(match)) {
      return "Finished";
    }

    // live
    if (isLiveMatch(match)) {
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
      <List.EmptyView title="No Matches Found" icon={{ source: { light: "logo-dark.png", dark: "logo-light.png" } }} />
      {Object.keys(matchesByDay).map((day) => {
        const dayString = format(startOfDay(new Date(day)), "E dd MMM");

        return (
          <List.Section title={dayString} key={dayString}>
            {matchesByDay[day].map((match: Match) => {
              const { Attendance, IdMatch, StageName, Home, Away, Officials } = match;

              const home = teamLabel(Home);
              const away = teamLabel(Away);
              const homeCountry = countryDetail(Home);
              const awayCountry = countryDetail(Away);
              const score = matchScore(match);

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
                        onAction={() => open(getMatchCenterUrl(match))}
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
                    tintColor: isFinishedMatch(match) ? Color.Green : isLiveMatch(match) ? Color.Yellow : Color.Red,
                  }}
                  subtitle={!isFinishedMatch(match) ? capitalizeFirstLetter(getTime(match)) : ""}
                  keywords={[teamName(Home), teamName(Away)]}
                  title={`${home}  vs  ${away}`}
                  accessories={[
                    isLiveMatch(match) || isFinishedMatch(match)
                      ? { text: isLiveMatch(match) ? getScore(match) : `${score.home ?? 0} : ${score.away ?? 0}` }
                      : {},
                    {
                      text: !showingDetail ? matchStage(match) : "",
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Stage" text={StageName[0]?.Description} />
                          {match.GroupName[0]?.Description && (
                            <List.Item.Detail.Metadata.Label title="Group" text={match.GroupName[0]?.Description} />
                          )}
                          <List.Item.Detail.Metadata.Label title="Stadium" text={matchVenue(match)} />
                          {Attendance && <List.Item.Detail.Metadata.Label title="Attendance" text={Attendance} />}

                          {Home && !isUpcomingMatch(match) && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title={home} text={score.home?.toString()} />
                              <Goals match={match} side="home" />
                              {Home?.Tactics && <List.Item.Detail.Metadata.Label title="Tactic" text={Home?.Tactics} />}
                            </>
                          )}

                          {Away && !isUpcomingMatch(match) && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title={away} text={score.away?.toString()} />
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

                          {(homeCountry || awayCountry) && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title="Countries" />
                              {homeCountry && <List.Item.Detail.Metadata.Label title="" text={homeCountry} />}
                              {awayCountry && <List.Item.Detail.Metadata.Label title="" text={awayCountry} />}
                            </>
                          )}

                          {!Home && !Away && <List.Item.Detail.Metadata.Label title="TBD" />}
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
