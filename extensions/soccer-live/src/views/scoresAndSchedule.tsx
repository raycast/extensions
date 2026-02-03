import { List, LocalStorage, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import getSchedule from "../utils/getSchedule";
import { addFavoriteTeam, FavoriteTeam } from "../utils/favoriteTeams";
import MatchStatistics from "./matchStatistics";
import { ALL_LEAGUES, getLeagueByCode } from "../utils/leagueConstants";

interface DayItems {
  title: string;
  games: JSX.Element[];
}

export default function ScoresAndSchedule() {
  const [currentLeague, setCurrentLeague] = useState("ENG.1");
  const { scheduleData, scheduleLoading, scheduleRevalidate } = getSchedule(currentLeague);

  useEffect(() => {
    async function loadStoredLeague() {
      const storedValue = await LocalStorage.getItem("soccerScoresLeague");
      if (typeof storedValue === "string") {
        setCurrentLeague(storedValue);
      }
    }
    loadStoredLeague();
  }, []);

  const handleLeagueChange = async (leagueCode: string) => {
    setCurrentLeague(leagueCode);
    await LocalStorage.setItem("soccerScoresLeague", leagueCode);
  };

  const leagueName = getLeagueByCode(currentLeague)?.name || "Premier League";
  const games = scheduleData?.events || [];

  const gameItems: DayItems[] = [];

  games.forEach((game, index) => {
    const gameDate = new Date(game.date);
    const gameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!gameItems.find((sportGameDay) => sportGameDay.title === gameDay)) {
      gameItems.push({
        title: gameDay,
        games: [],
      });
    }

    const sportGameDay = gameItems.find((sportGameDay) => sportGameDay.title === gameDay);

    const gameTime = new Date(game.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const competition = game.competitions?.[0];
    const homeTeam = competition?.competitors?.[1];
    const awayTeam = competition?.competitors?.[0];
    const status = competition?.status;
    const isLive = status?.type?.state === "in";
    const isCompleted = status?.type?.state === "post";
    const isScheduled = status?.type?.state === "pre";

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";
    const clock = status?.displayClock || status?.type?.detail || "";

    const startingSoonInterval = 15 * 60 * 1000;
    const currentDate = new Date();
    const timeUntilGameStarts = gameDate.getTime() - currentDate.getTime();

    if (timeUntilGameStarts <= startingSoonInterval && isScheduled) {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (isLive) {
      const homeScore = homeTeam?.score || "0";
      const awayScore = awayTeam?.score || "0";
      accessoryTitle = `${awayTeam?.team?.abbreviation || "Away"} ${awayScore} - ${homeScore} ${homeTeam?.team?.abbreviation || "Home"}     ${clock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "Live";
    } else if (isCompleted) {
      const homeScore = homeTeam?.score || "0";
      const awayScore = awayTeam?.score || "0";
      accessoryTitle = `${awayTeam?.team?.abbreviation || "Away"} ${awayScore} - ${homeScore} ${homeTeam?.team?.abbreviation || "Home"}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (status?.type?.state === "post" && status?.type?.completed === false) {
      accessoryTitle = "Postponed";
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
      accessoryToolTip = "Postponed";
    }

    sportGameDay?.games.push(
      <List.Item
        key={game.id || index}
        title={game.name}
        subtitle={competition?.venue?.fullName || ""}
        icon={{
          source: homeTeam?.team?.logo || "soccer-field.png",
        }}
        accessories={[
          {
            text: { value: accessoryTitle, color: accessoryColor },
            tooltip: accessoryToolTip,
          },
          { icon: accessoryIcon },
        ]}
        keywords={[
          game.name,
          homeTeam?.team?.displayName || "",
          awayTeam?.team?.displayName || "",
          homeTeam?.team?.abbreviation || "",
          awayTeam?.team?.abbreviation || "",
          leagueName,
        ]}
        actions={
          <ActionPanel>
            {(isLive || isCompleted) && (
              <Action.Push
                title="View Match Statistics"
                icon={Icon.BarChart}
                target={
                  <MatchStatistics
                    gameId={game.id}
                    leagueCode={currentLeague}
                    matchName={game.name}
                    homeScore={homeTeam?.score || "0"}
                    awayScore={awayTeam?.score || "0"}
                  />
                }
              />
            )}
            <Action.OpenInBrowser
              title="View on Espn"
              url={game.links?.[0]?.href || `https://www.espn.com/soccer/scoreboard/_/league/${currentLeague}`}
            />
            {homeTeam?.team && (
              <Action
                title={`Add ${homeTeam.team.displayName} to Favorites`}
                icon={Icon.Star}
                onAction={async () => {
                  const favoriteTeam: FavoriteTeam = {
                    id: homeTeam.team.id,
                    name: homeTeam.team.displayName,
                    leagueCode: currentLeague,
                    leagueName: leagueName,
                    logo: homeTeam.team.logo,
                  };
                  await addFavoriteTeam(favoriteTeam);
                }}
              />
            )}
            {awayTeam?.team && (
              <Action
                title={`Add ${awayTeam.team.displayName} to Favorites`}
                icon={Icon.Star}
                onAction={async () => {
                  const favoriteTeam: FavoriteTeam = {
                    id: awayTeam.team.id,
                    name: awayTeam.team.displayName,
                    leagueCode: currentLeague,
                    leagueName: leagueName,
                    logo: awayTeam.team.logo,
                  };
                  await addFavoriteTeam(favoriteTeam);
                }}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={scheduleRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />,
    );
  });

  gameItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <List
      searchBarPlaceholder="Search for a game or team"
      searchBarAccessory={
        <List.Dropdown tooltip="Select League" onChange={handleLeagueChange} value={currentLeague}>
          {ALL_LEAGUES.map((league) => (
            <List.Dropdown.Item key={league.code} title={league.name} value={league.code} />
          ))}
        </List.Dropdown>
      }
      isLoading={scheduleLoading}
      filtering={true}
    >
      {scheduleLoading ? (
        <List.EmptyView icon="soccer-field.png" title="Loading games..." />
      ) : games.length === 0 ? (
        <List.EmptyView
          icon="soccer-field.png"
          title="No Games Found"
          description="No games scheduled for this league."
        />
      ) : (
        gameItems.map((sportGameDay, index) => (
          <List.Section
            key={index}
            title={sportGameDay.title}
            subtitle={`${sportGameDay.games.length} Game${sportGameDay.games.length !== 1 ? "s" : ""}`}
          >
            {sportGameDay.games}
          </List.Section>
        ))
      )}
    </List>
  );
}
