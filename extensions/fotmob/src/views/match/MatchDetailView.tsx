import { useMemo } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import type { MatchDetailData, MatchEvent } from "@/types/match-detail";
import { useFavorite } from "@/hooks/useFavorite";
import { useMatchDetail } from "@/hooks/useMatchDetail";
import { prettyDate } from "@/utils/date";
import { launchSearchCommand } from "@/utils/launcher/launchSearchCommand";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import {
  buildLeagueDetailUrl,
  buildLeagueLogoUrl,
  buildMatchDetailUrl,
  buildTeamDetailUrl,
  buildTeamLogoUrl,
} from "@/utils/url-builder";

interface MatchDetailViewProps {
  matchId: string;
}

function MatchStatusIcon({ status }: { status: MatchDetailData["status"] }) {
  if (status.ongoing) {
    return { source: Icon.PlayFilled, tintColor: Color.Green };
  }
  if (status.finished) {
    return { source: Icon.CheckCircle, tintColor: Color.Blue };
  }
  if (status.cancelled || status.postponed) {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  return { source: Icon.Calendar, tintColor: Color.SecondaryText };
}

function EventIcon({ event }: { event: MatchEvent }) {
  switch (event.type) {
    case "goal":
      return { source: Icon.SoccerBall, tintColor: Color.Green };
    case "card":
      return {
        source: Icon.Minus,
        tintColor: event.cardType === "red" ? Color.Red : Color.Yellow,
      };
    case "substitution":
      return { source: Icon.ArrowUp, tintColor: Color.Blue };
    case "penalty":
      return { source: Icon.CircleFilled, tintColor: Color.Orange };
    case "own_goal":
      return { source: Icon.SoccerBall, tintColor: Color.Red };
    case "var":
      return { source: Icon.Monitor, tintColor: Color.Purple };
    default:
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
}

function StatBar({
  label,
  homeValue,
  awayValue,
  homeTeam,
  awayTeam,
}: {
  label: string;
  homeValue: number;
  awayValue: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const total = homeValue + awayValue;
  const homePercentage = total > 0 ? (homeValue / total) * 100 : 50;

  return (
    <List.Item
      title={label}
      subtitle={`${homeTeam}: ${homeValue} | ${awayTeam}: ${awayValue}`}
      accessories={[
        {
          text: `${homePercentage.toFixed(0)}% - ${(100 - homePercentage).toFixed(0)}%`,
        },
      ]}
    />
  );
}

export default function MatchDetailView({ matchId }: MatchDetailViewProps) {
  const { data, error, isLoading } = useMatchDetail(matchId);
  const favoriteService = useFavorite();

  const matchSummary = useMemo(() => {
    if (!data?.status || !data?.home || !data?.away || !data?.tournament) return null;

    const status = data.status.ongoing
      ? `${data.status.liveTime?.short || "LIVE"}`
      : data.status.finished
        ? data.status.reason?.short || "FT"
        : data.status.cancelled
          ? "CANCELLED"
          : data.status.postponed
            ? "POSTPONED"
            : prettyDate(data.status.utcTime);

    return {
      homeTeam: data.home.name,
      awayTeam: data.away.name,
      homeScore: data.home.score,
      awayScore: data.away.score,
      status,
      tournament: data.tournament.name,
      venue: data.venue?.name,
    };
  }, [data]);

  const matchEvents = useMemo(() => {
    if (!data?.events || !Array.isArray(data.events)) return [];
    return data.events
      .sort((a, b) => a.minute - b.minute)
      .map((event) => ({
        ...event,
        displayMinute: event.minuteExtra ? `${event.minute}+${event.minuteExtra}` : `${event.minute}'`,
      }));
  }, [data?.events]);

  if (isLoading) {
    return <List isLoading={true} navigationTitle="Match Details" />;
  }

  if (error || !data) {
    return (
      <List navigationTitle="Match Details">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Match"
          description="Failed to fetch match details. Please try again later."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} title="View on Fotmob" url={buildMatchDetailUrl(matchId)} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!matchSummary) {
    return (
      <List navigationTitle="Match Details">
        <List.EmptyView
          icon={Icon.SoccerBall}
          title="No Match Data"
          description="Match information is not available."
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Match Details"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Globe} title="View Full Details" url={buildMatchDetailUrl(matchId)} />
          <Action
            icon={Icon.MagnifyingGlass}
            title="Search Leagues"
            onAction={() => {
              launchSearchCommand();
            }}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      {/* Match Summary */}
      <List.Section title="Match Info">
        <List.Item
          icon={MatchStatusIcon({ status: data.status })}
          title={`${matchSummary.homeTeam} ${matchSummary.homeScore} - ${matchSummary.awayScore} ${matchSummary.awayTeam}`}
          subtitle={matchSummary.status}
          accessories={[{ icon: buildTeamLogoUrl(data.home.id) }, { icon: buildTeamLogoUrl(data.away.id) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} title="View Full Match" url={buildMatchDetailUrl(matchId)} />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title={`Copy Match ID (${matchId})`}
                content={matchId}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title="Copy Score"
                content={`${matchSummary.homeTeam} ${matchSummary.homeScore} - ${matchSummary.awayScore} ${matchSummary.awayTeam}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={buildLeagueLogoUrl(data.tournament.leagueId)}
          title="Tournament"
          subtitle={matchSummary.tournament}
          accessories={data.tournament.round ? [{ text: data.tournament.round }] : []}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="View Tournament"
                url={buildLeagueDetailUrl(data.tournament.leagueId)}
              />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title={`Copy League ID (${data.tournament.leagueId})`}
                content={data.tournament.leagueId.toString()}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {favoriteService.leagues.some((league) => league.id === data.tournament.leagueId.toString()) ? (
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove League from Favorites"
                  onAction={async () => {
                    await favoriteService.removeItems("league", data.tournament.leagueId.toString());
                    showToast({
                      style: Toast.Style.Success,
                      title: "Removed from favorites",
                      message: `${data.tournament.name} removed from favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              ) : (
                <Action
                  icon={Icon.Star}
                  title="Add League to Favorites"
                  onAction={async () => {
                    await favoriteService.addItems({
                      type: "league",
                      value: {
                        id: data.tournament.leagueId.toString(),
                        name: data.tournament.name,
                        countryCode: "",
                      },
                    });
                    showToast({
                      style: Toast.Style.Success,
                      title: "Added to favorites",
                      message: `${data.tournament.name} added to favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
              )}
              <Action
                icon={Icon.MagnifyingGlass}
                title="Search Leagues"
                onAction={() => {
                  launchSearchCommand();
                }}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel>
          }
        />

        {matchSummary.venue && (
          <List.Item
            icon={Icon.Building}
            title="Venue"
            subtitle={matchSummary.venue}
            accessories={data.venue?.city ? [{ text: data.venue.city }] : []}
          />
        )}

        {data?.referee && (
          <List.Item
            icon={Icon.Person}
            title="Referee"
            subtitle={data.referee.name}
            accessories={data.referee.country ? [{ text: data.referee.country }] : []}
          />
        )}

        {data?.attendance && (
          <List.Item icon={Icon.TwoPeople} title="Attendance" subtitle={data.attendance.toLocaleString()} />
        )}
      </List.Section>

      {/* Teams */}
      {data?.home && data?.away && (
        <List.Section title="Teams">
          <List.Item
            icon={buildTeamLogoUrl(data.home.id)}
            title={`${data.home.name} (Home)`}
            subtitle={data.home.formation ? `Formation: ${data.home.formation}` : undefined}
            accessories={[{ text: `${data.home.score}` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarRight}
                  title="Show Team Details"
                  onAction={() => {
                    launchTeamCommand(`${data.home.id}`);
                  }}
                />
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="View Team on Fotmob"
                  url={buildTeamDetailUrl(data.home.id)}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={`Copy Team ID (${data.home.id})`}
                  content={data.home.id.toString()}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                {favoriteService.teams.some((team) => team.id === data.home.id.toString()) ? (
                  <Action
                    icon={Icon.StarDisabled}
                    title="Remove from Favorites"
                    onAction={async () => {
                      await favoriteService.removeItems("team", data.home.id.toString());
                      showToast({
                        style: Toast.Style.Success,
                        title: "Removed from favorites",
                        message: `${data.home.name} removed from favorites`,
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                ) : (
                  <Action
                    icon={Icon.Star}
                    title="Add to Favorites"
                    onAction={async () => {
                      await favoriteService.addItems({
                        type: "team",
                        value: {
                          id: data.home.id.toString(),
                          name: data.home.name,
                          leagueId: data.tournament.leagueId.toString(),
                        },
                      });
                      showToast({
                        style: Toast.Style.Success,
                        title: "Added to favorites",
                        message: `${data.home.name} added to favorites`,
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                )}
              </ActionPanel>
            }
          />

          <List.Item
            icon={buildTeamLogoUrl(data.away.id)}
            title={`${data.away.name} (Away)`}
            subtitle={data.away.formation ? `Formation: ${data.away.formation}` : undefined}
            accessories={[{ text: `${data.away.score}` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarRight}
                  title="Show Team Details"
                  onAction={() => {
                    launchTeamCommand(`${data.away.id}`);
                  }}
                />
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="View Team on Fotmob"
                  url={buildTeamDetailUrl(data.away.id)}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={`Copy Team ID (${data.away.id})`}
                  content={data.away.id.toString()}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                {favoriteService.teams.some((team) => team.id === data.away.id.toString()) ? (
                  <Action
                    icon={Icon.StarDisabled}
                    title="Remove from Favorites"
                    onAction={async () => {
                      await favoriteService.removeItems("team", data.away.id.toString());
                      showToast({
                        style: Toast.Style.Success,
                        title: "Removed from favorites",
                        message: `${data.away.name} removed from favorites`,
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                ) : (
                  <Action
                    icon={Icon.Star}
                    title="Add to Favorites"
                    onAction={async () => {
                      await favoriteService.addItems({
                        type: "team",
                        value: {
                          id: data.away.id.toString(),
                          name: data.away.name,
                          leagueId: data.tournament.leagueId.toString(),
                        },
                      });
                      showToast({
                        style: Toast.Style.Success,
                        title: "Added to favorites",
                        message: `${data.away.name} added to favorites`,
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Match Events */}
      {matchEvents.length > 0 && (
        <List.Section title="Match Events">
          {matchEvents.map((event, index) => (
            <List.Item
              key={`${event.id}-${index}`}
              icon={EventIcon({ event })}
              title={`${event.displayMinute} ${event.playerName}`}
              subtitle={
                event.type === "goal" && event.assistPlayerName
                  ? `Goal (Assist: ${event.assistPlayerName})`
                  : event.type === "card"
                    ? `${event.cardType?.toUpperCase()} Card`
                    : event.type === "substitution"
                      ? "Substitution"
                      : event.type === "penalty"
                        ? "Penalty"
                        : event.type === "own_goal"
                          ? "Own Goal"
                          : event.type === "var"
                            ? "VAR"
                            : event.type.charAt(0).toUpperCase() + event.type.slice(1)
              }
              accessories={[
                {
                  text: event.type === "goal" ? "⚽" : event.type === "card" ? "🟨" : "",
                },
              ]}
            />
          ))}
        </List.Section>
      )}

      {/* Match Statistics */}
      {data.stats && (
        <List.Section title="Statistics">
          {data.stats.possession && (
            <StatBar
              label="Possession"
              homeValue={data.stats.possession.home}
              awayValue={data.stats.possession.away}
              homeTeam={data.home.shortName || data.home.name}
              awayTeam={data.away.shortName || data.away.name}
            />
          )}

          {data.stats.shots && (
            <StatBar
              label="Shots"
              homeValue={data.stats.shots.home}
              awayValue={data.stats.shots.away}
              homeTeam={data.home.shortName || data.home.name}
              awayTeam={data.away.shortName || data.away.name}
            />
          )}

          {data.stats.shotsOnTarget && (
            <StatBar
              label="Shots on Target"
              homeValue={data.stats.shotsOnTarget.home}
              awayValue={data.stats.shotsOnTarget.away}
              homeTeam={data.home.shortName || data.home.name}
              awayTeam={data.away.shortName || data.away.name}
            />
          )}

          {data.stats.corners && (
            <StatBar
              label="Corners"
              homeValue={data.stats.corners.home}
              awayValue={data.stats.corners.away}
              homeTeam={data.home.shortName || data.home.name}
              awayTeam={data.away.shortName || data.away.name}
            />
          )}

          {data.stats.fouls && (
            <StatBar
              label="Fouls"
              homeValue={data.stats.fouls.home}
              awayValue={data.stats.fouls.away}
              homeTeam={data.home.shortName || data.home.name}
              awayTeam={data.away.shortName || data.away.name}
            />
          )}

          {data.stats.yellowCards && (
            <List.Item
              icon={{ source: Icon.Minus, tintColor: Color.Yellow }}
              title="Yellow Cards"
              subtitle={`${data.home.shortName || data.home.name}: ${data.stats.yellowCards.home} | ${data.away.shortName || data.away.name}: ${data.stats.yellowCards.away}`}
            />
          )}

          {data.stats.redCards && (
            <List.Item
              icon={{ source: Icon.Minus, tintColor: Color.Red }}
              title="Red Cards"
              subtitle={`${data.home.shortName || data.home.name}: ${data.stats.redCards.home} | ${data.away.shortName || data.away.name}: ${data.stats.redCards.away}`}
            />
          )}

          {data.stats.passes && (
            <StatBar
              label="Passes"
              homeValue={data.stats.passes.home}
              awayValue={data.stats.passes.away}
              homeTeam={data.home.shortName || data.home.name}
              awayTeam={data.away.shortName || data.away.name}
            />
          )}

          {data.stats.passAccuracy && (
            <List.Item
              icon={Icon.CircleFilled}
              title="Pass Accuracy"
              subtitle={`${data.home.shortName || data.home.name}: ${data.stats.passAccuracy.home}% | ${data.away.shortName || data.away.name}: ${data.stats.passAccuracy.away}%`}
            />
          )}
        </List.Section>
      )}

      {/* Additional Info */}
      {(data.weather || data.tournament.season) && (
        <List.Section title="Additional Info">
          {data.tournament.season && (
            <List.Item icon={Icon.Calendar} title="Season" subtitle={data.tournament.season} />
          )}

          {data.weather && (
            <List.Item
              icon={Icon.Cloud}
              title="Weather"
              subtitle={`${data.weather.temperature}°C - ${data.weather.description}`}
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
