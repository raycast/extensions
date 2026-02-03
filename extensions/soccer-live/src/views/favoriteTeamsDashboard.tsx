import { List, LocalStorage, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { getFavoriteTeams } from "../utils/favoriteTeams";
import getSchedule from "../utils/getSchedule";
import TeamStandingsView from "./favoriteTeamStandings";
import TeamNewsView from "./favoriteTeamNews";
import MatchStatistics from "./matchStatistics";

interface FavoriteTeam {
  id: string;
  name: string;
  leagueCode: string;
  leagueName: string;
  logo?: string;
}

interface Game {
  id: string;
  name: string;
  date: string;
  competitions: Array<{
    competitors: Array<{
      team: {
        id: string;
        displayName: string;
        abbreviation: string;
        logo: string;
      };
      score: string;
    }>;
    status: {
      type: {
        state: string;
        detail?: string;
      };
      displayClock?: string;
    };
  }>;
  links: { href: string }[];
}

export default function FavoriteTeamsDashboard() {
  const [favoriteTeams, setFavoriteTeams] = useState<Awaited<ReturnType<typeof getFavoriteTeams>>>([]);
  const [selectedView, setSelectedView] = useState("Upcoming Games");

  // Helper function to get date range for past games (last 7 days)
  const pastDateRange = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Format dates as YYYYMMDD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    };

    return `${formatDate(sevenDaysAgo)}-${formatDate(today)}`;
  }, []);

  // Helper function to get date range for future games (next 14 days)
  const futureDateRange = useMemo(() => {
    const today = new Date();
    const fourteenDaysAhead = new Date();
    fourteenDaysAhead.setDate(today.getDate() + 14);

    // Format dates as YYYYMMDD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    };

    return `${formatDate(today)}-${formatDate(fourteenDaysAhead)}`;
  }, []);

  // Call all hooks at top level BEFORE any conditional returns - fetch schedules for all leagues
  // Fetch both current games and recent past games - expanded to support more leagues
  const engSchedule = getSchedule("ENG.1");
  const espSchedule = getSchedule("ESP.1");
  const gerSchedule = getSchedule("GER.1");
  const itaSchedule = getSchedule("ITA.1");
  const fraSchedule = getSchedule("FRA.1");
  const nedSchedule = getSchedule("NED.1");
  const porSchedule = getSchedule("POR.1");
  const belSchedule = getSchedule("BEL.1");
  const scoSchedule = getSchedule("SCO.1");
  const turSchedule = getSchedule("TUR.1");
  const uefaChampionsSchedule = getSchedule("uefa.champions");
  const uefaEuropaSchedule = getSchedule("uefa.europa");
  const uefaEuroSchedule = getSchedule("uefa.euro");
  const fifaWorldSchedule = getSchedule("fifa.world");
  const africaCupSchedule = getSchedule("africa.cup");

  // Fetch recent past games (last 7 days) and future games (next 14 days) for each league
  interface ScheduleResponse {
    events: Game[];
  }

  // Past games (last 7 days) - with error handling to prevent crashes
  const engRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const espRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ESP.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const gerRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/GER.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const itaRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ITA.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const fraRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/FRA.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const nedRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/NED.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const porRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/POR.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const belRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/BEL.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const scoRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/SCO.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const turRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/TUR.1/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const uefaChampionsRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const uefaEuropaRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const uefaEuroRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.euro/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const fifaWorldRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const africaCupRecentSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/africa.cup/scoreboard?dates=${pastDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );

  // Future games (next 14 days) - with error handling to prevent crashes
  const engFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const espFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ESP.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const gerFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/GER.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const itaFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ITA.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const fraFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/FRA.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const nedFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/NED.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const porFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/POR.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const belFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/BEL.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const scoFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/SCO.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const turFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/TUR.1/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const uefaChampionsFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const uefaEuropaFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const uefaEuroFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.euro/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const fifaWorldFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );
  const africaCupFutureSchedule = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/africa.cup/scoreboard?dates=${futureDateRange}`,
    { onError: () => {}, keepPreviousData: true },
  );

  useEffect(() => {
    async function loadFavoriteTeams() {
      const teams = await getFavoriteTeams();
      setFavoriteTeams(teams);
    }
    loadFavoriteTeams();
  }, []);

  const handleViewChange = async (view: string) => {
    setSelectedView(view);
    await LocalStorage.setItem("favoriteTeamsView", view);
  };

  useEffect(() => {
    async function loadStoredView() {
      const storedValue = await LocalStorage.getItem("favoriteTeamsView");
      if (typeof storedValue === "string") {
        setSelectedView(storedValue);
      }
    }
    loadStoredView();
  }, []);

  if (favoriteTeams.length === 0) {
    return (
      <List
        searchBarAccessory={
          <List.Dropdown tooltip="View Type" onChange={handleViewChange} value={selectedView}>
            <List.Dropdown.Item title="Upcoming Games" value="Upcoming Games" />
            <List.Dropdown.Item title="Recent Games" value="Recent Games" />
            <List.Dropdown.Item title="Standings" value="Standings" />
            <List.Dropdown.Item title="News" value="News" />
          </List.Dropdown>
        }
      >
        <List.EmptyView
          icon="soccer-field.png"
          title="No Favorite Teams"
          description="Add teams to your favorites from the Standings view to see them here."
        />
      </List>
    );
  }

  const schedulesByLeague: Record<string, ReturnType<typeof getSchedule>> = {
    "ENG.1": engSchedule,
    "ESP.1": espSchedule,
    "GER.1": gerSchedule,
    "ITA.1": itaSchedule,
    "FRA.1": fraSchedule,
    "NED.1": nedSchedule,
    "POR.1": porSchedule,
    "BEL.1": belSchedule,
    "SCO.1": scoSchedule,
    "TUR.1": turSchedule,
    "uefa.champions": uefaChampionsSchedule,
    "uefa.europa": uefaEuropaSchedule,
    "uefa.euro": uefaEuroSchedule,
    "fifa.world": fifaWorldSchedule,
    "africa.cup": africaCupSchedule,
  };

  const recentSchedulesByLeague: Record<string, ReturnType<typeof useFetch<ScheduleResponse>>> = {
    "ENG.1": engRecentSchedule,
    "ESP.1": espRecentSchedule,
    "GER.1": gerRecentSchedule,
    "ITA.1": itaRecentSchedule,
    "FRA.1": fraRecentSchedule,
    "NED.1": nedRecentSchedule,
    "POR.1": porRecentSchedule,
    "BEL.1": belRecentSchedule,
    "SCO.1": scoRecentSchedule,
    "TUR.1": turRecentSchedule,
    "uefa.champions": uefaChampionsRecentSchedule,
    "uefa.europa": uefaEuropaRecentSchedule,
    "uefa.euro": uefaEuroRecentSchedule,
    "fifa.world": fifaWorldRecentSchedule,
    "africa.cup": africaCupRecentSchedule,
  };

  const futureSchedulesByLeague: Record<string, ReturnType<typeof useFetch<ScheduleResponse>>> = {
    "ENG.1": engFutureSchedule,
    "ESP.1": espFutureSchedule,
    "GER.1": gerFutureSchedule,
    "ITA.1": itaFutureSchedule,
    "FRA.1": fraFutureSchedule,
    "NED.1": nedFutureSchedule,
    "POR.1": porFutureSchedule,
    "BEL.1": belFutureSchedule,
    "SCO.1": scoFutureSchedule,
    "TUR.1": turFutureSchedule,
    "uefa.champions": uefaChampionsFutureSchedule,
    "uefa.europa": uefaEuropaFutureSchedule,
    "uefa.euro": uefaEuroFutureSchedule,
    "fifa.world": fifaWorldFutureSchedule,
    "africa.cup": africaCupFutureSchedule,
  };

  const allGames: Array<Game & { team: FavoriteTeam }> = [];
  const gameIds = new Set<string>(); // Track games to avoid duplicates

  favoriteTeams.forEach((team) => {
    // Get games from current schedule (today's games)
    const scheduleData = schedulesByLeague[team.leagueCode]?.scheduleData;
    if (scheduleData?.events) {
      scheduleData.events.forEach((game) => {
        const isTeamInGame = game.competitions?.[0]?.competitors?.some((comp) => comp.team.id === team.id);
        if (isTeamInGame && !gameIds.has(game.id)) {
          allGames.push({ ...game, team });
          gameIds.add(game.id);
        }
      });
    }

    // Get games from recent past schedule (last 7 days)
    const recentSchedule = recentSchedulesByLeague[team.leagueCode];
    const recentScheduleData = recentSchedule?.error ? null : recentSchedule?.data;
    if (recentScheduleData?.events) {
      recentScheduleData.events.forEach((game) => {
        const isTeamInGame = game.competitions?.[0]?.competitors?.some((comp) => comp.team.id === team.id);
        if (isTeamInGame && !gameIds.has(game.id)) {
          allGames.push({ ...game, team });
          gameIds.add(game.id);
        }
      });
    }

    // Get games from future schedule (next 14 days) - important for upcoming games
    const futureSchedule = futureSchedulesByLeague[team.leagueCode];
    const futureScheduleData = futureSchedule?.error ? null : futureSchedule?.data;
    if (futureScheduleData?.events) {
      futureScheduleData.events.forEach((game) => {
        const isTeamInGame = game.competitions?.[0]?.competitors?.some((comp) => comp.team.id === team.id);
        if (isTeamInGame && !gameIds.has(game.id)) {
          allGames.push({ ...game, team });
          gameIds.add(game.id);
        }
      });
    }
  });

  // Sort games by date
  allGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const now = new Date();
  // Filter games by status: upcoming (pre or in), recent (post/completed)
  const upcomingGames = allGames.filter((game) => {
    const status = game.competitions?.[0]?.status?.type?.state;
    return status === "pre" || status === "in" || new Date(game.date) > now;
  });
  const recentGames = allGames
    .filter((game) => {
      const status = game.competitions?.[0]?.status?.type?.state;
      return status === "post" || (new Date(game.date) <= now && status !== "pre" && status !== "in");
    })
    .reverse();

  const renderGameItem = (game: Game & { team: FavoriteTeam }, isUpcoming: boolean, isLastGame: boolean = false) => {
    const competition = game.competitions?.[0];
    const homeTeam = competition?.competitors?.[1];
    const awayTeam = competition?.competitors?.[0];
    const status = competition?.status;
    const isLive = status?.type?.state === "in";
    const gameDate = new Date(game.date);
    const gameTime = gameDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const gameDay = gameDate.toLocaleDateString([], { dateStyle: "medium" });

    const homeScore = homeTeam?.score || "0";
    const awayScore = awayTeam?.score || "0";
    const clock = status?.displayClock || status?.type?.detail || "";

    // Determine if favorite team won, lost, or drew
    const favoriteTeamId = game.team.id;
    const favoriteTeamCompetitor = competition?.competitors?.find((c) => c.team.id === favoriteTeamId);
    const opponentCompetitor = competition?.competitors?.find((c) => c.team.id !== favoriteTeamId);
    const favoriteScore = parseInt(favoriteTeamCompetitor?.score || "0");
    const opponentScore = parseInt(opponentCompetitor?.score || "0");
    let resultColor = Color.SecondaryText;
    let resultIcon: Icon | undefined;
    if (!isUpcoming && !isLive) {
      if (favoriteScore > opponentScore) {
        resultColor = Color.Green;
        resultIcon = Icon.CheckCircle;
      } else if (favoriteScore < opponentScore) {
        resultColor = Color.Red;
        resultIcon = Icon.XMarkCircle;
      } else {
        resultColor = Color.Orange;
        resultIcon = Icon.Minus;
      }
    }

    return (
      <List.Item
        key={`${game.id}-${game.team.id}`}
        title={isLastGame ? `⭐ ${game.name}` : game.name}
        subtitle={
          isLastGame
            ? `Last Game • ${game.team.leagueName} • ${gameDay} ${gameTime}`
            : `${game.team.leagueName} • ${gameDay} ${gameTime}`
        }
        icon={{
          source: homeTeam?.team?.logo || "soccer-field.png",
        }}
        accessories={[
          {
            text: isLive
              ? `LIVE: ${awayTeam?.team?.abbreviation} ${awayScore} - ${homeScore} ${homeTeam?.team?.abbreviation} ${clock}`
              : isUpcoming
                ? `Scheduled: ${gameTime}`
                : `Final: ${awayTeam?.team?.abbreviation} ${awayScore} - ${homeScore} ${homeTeam?.team?.abbreviation}`,
            color: isLive ? Color.Green : isLastGame ? resultColor : Color.SecondaryText,
          },
          ...(isLive ? [{ icon: { source: Icon.Livestream, tintColor: Color.Green } }] : []),
          ...(isLastGame && resultIcon ? [{ icon: { source: resultIcon, tintColor: resultColor } }] : []),
        ]}
        actions={
          <ActionPanel>
            {!isUpcoming && (
              <Action.Push
                title="View Match Statistics"
                icon={Icon.BarChart}
                target={
                  <MatchStatistics
                    gameId={game.id}
                    leagueCode={game.team.leagueCode}
                    matchName={game.name}
                    homeScore={homeScore}
                    awayScore={awayScore}
                  />
                }
              />
            )}
            <Action.OpenInBrowser
              title="View on Espn"
              url={game.links?.[0]?.href || `https://www.espn.com/soccer/scoreboard/_/league/${game.team.leagueCode}`}
            />
          </ActionPanel>
        }
      />
    );
  };

  const dropdown = (
    <List.Dropdown tooltip="View Type" onChange={handleViewChange} value={selectedView}>
      <List.Dropdown.Item title="Upcoming Games" value="Upcoming Games" />
      <List.Dropdown.Item title="Recent Games" value="Recent Games" />
      <List.Dropdown.Item title="Standings" value="Standings" />
      <List.Dropdown.Item title="News" value="News" />
    </List.Dropdown>
  );

  if (selectedView === "Upcoming Games") {
    return (
      <List searchBarPlaceholder="Search for a game" searchBarAccessory={dropdown} filtering={true}>
        {favoriteTeams.map((team) => {
          const teamUpcomingGames = upcomingGames.filter((g) => g.team.id === team.id);
          return (
            <List.Section key={team.id} title={`${team.name} (${team.leagueName})`}>
              {teamUpcomingGames.length > 0 ? (
                teamUpcomingGames.map((game) => renderGameItem(game, true))
              ) : (
                <List.Item
                  title="No Upcoming Games"
                  icon="soccer-field.png"
                  subtitle="No scheduled games for this team"
                />
              )}
            </List.Section>
          );
        })}
      </List>
    );
  }

  if (selectedView === "Recent Games") {
    return (
      <List searchBarPlaceholder="Search for a game" searchBarAccessory={dropdown} filtering={true}>
        {favoriteTeams.map((team) => {
          const teamRecentGames = recentGames.filter((g) => g.team.id === team.id);
          if (teamRecentGames.length === 0) {
            return (
              <List.Section key={team.id} title={`${team.name} (${team.leagueName})`}>
                <List.Item title="No Recent Games" icon="soccer-field.png" subtitle="No recent games for this team" />
              </List.Section>
            );
          }

          // Get the most recent game (first in the reversed array)
          const lastGame = teamRecentGames[0];
          const otherRecentGames = teamRecentGames.slice(1);

          return (
            <List.Section key={team.id} title={`${team.name} (${team.leagueName})`}>
              {/* Show last game first with highlighting */}
              {renderGameItem(lastGame, false, true)}

              {/* Show rest of recent games */}
              {otherRecentGames.map((game) => renderGameItem(game, false, false))}
            </List.Section>
          );
        })}
      </List>
    );
  }

  if (selectedView === "Standings") {
    return <TeamStandingsView favoriteTeams={favoriteTeams} setFavoriteTeams={setFavoriteTeams} dropdown={dropdown} />;
  }

  // News view
  return <TeamNewsView favoriteTeams={favoriteTeams} dropdown={dropdown} />;
}
