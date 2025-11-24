import { List, ActionPanel } from '@raycast/api';
import { useState, useMemo } from 'react';
import React from 'react';
import { getScoreboard, LEAGUES, ScoreboardOptions } from './api/espn';
import GameListItem from './components/GameListItem';
import NavigationActions from './components/NavigationActions';
import { usePromise } from '@raycast/utils';
import { format, getYear, addDays, subDays } from 'date-fns';
import { NFLSeasonType, getCurrentNFLWeek, getCurrentCFBWeek } from './utils/dateHelpers';
import { parseSearchQuery, getSearchHints } from './utils/searchParser';
import { Game, Competitor } from './types';

export default function Command() {
  const [searchText, setSearchText] = useState<string>('');

  // Date navigation state
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyyMMdd'));
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedSeasonType, setSelectedSeasonType] = useState<number>(NFLSeasonType.RegularSeason);
  const [dateMode, setDateMode] = useState<'daily' | 'weekly'>('daily');

  // Parse search query
  const searchResult = useMemo(() => parseSearchQuery(searchText), [searchText]);

  // Determine which leagues to fetch based on search query
  const leaguesToFetch = useMemo(() => {
    if (searchResult.type === 'league' || searchResult.type === 'combined') {
      // User specified a league - only fetch that one
      const [sport, leagueName] = searchResult.league!.split('/');
      return LEAGUES.filter((l) => l.sport === sport && l.league === leagueName);
    }
    // Default: fetch all leagues (for team search or no search)
    return LEAGUES;
  }, [searchResult.type, searchResult.league]);

  // Current season year
  const currentSeason = useMemo(() => {
    return getYear(new Date());
  }, []);

  // Build scoreboard options based on date mode
  // Stringify to create stable key for preventing unnecessary refetches
  const scoreboardOptionsKey = useMemo(() => {
    if (dateMode === 'weekly' && selectedWeek !== null) {
      return `week:${selectedWeek}:${selectedSeasonType}:${currentSeason}`;
    } else if (dateMode === 'daily' && selectedDate) {
      return `date:${selectedDate}`;
    }
    return 'undefined';
  }, [dateMode, selectedDate, selectedWeek, selectedSeasonType, currentSeason]);

  const scoreboardOptions = useMemo<ScoreboardOptions | undefined>(() => {
    if (dateMode === 'weekly' && selectedWeek !== null) {
      // Week-based query for football
      return {
        week: selectedWeek,
        seasonType: selectedSeasonType,
        season: currentSeason,
      };
    } else if (dateMode === 'daily' && selectedDate) {
      // Daily date query
      return {
        date: selectedDate,
      };
    }
    return undefined;
  }, [scoreboardOptionsKey]);

  // Fetch only relevant leagues in parallel
  const { isLoading, data: allLeaguesGames } = usePromise(
    async (options: ScoreboardOptions | undefined, leagues: typeof LEAGUES) => {
      try {
        const results = await Promise.all(
          leagues.map((league) => getScoreboard(league.sport, league.league, undefined, options)),
        );
        return leagues.map((league, i) => ({
          league,
          games: results[i],
        }));
      } catch (err) {
        console.error('Error fetching scoreboard data:', err);
        // Return empty results on error rather than crashing
        return leagues.map((league) => ({
          league,
          games: [],
        }));
      }
    },
    [scoreboardOptions, leaguesToFetch],
  );

  // Navigation callbacks
  const handlePreviousDate = () => {
    if (dateMode === 'weekly' && selectedWeek !== null) {
      // Previous week for football
      setSelectedWeek((prev) => Math.max(1, (prev || 1) - 1));
    } else {
      // Previous day for other sports
      const currentDate = new Date(
        parseInt(selectedDate.substring(0, 4)),
        parseInt(selectedDate.substring(4, 6)) - 1,
        parseInt(selectedDate.substring(6, 8)),
      );
      const previousDate = subDays(currentDate, 1);
      setSelectedDate(format(previousDate, 'yyyyMMdd'));
    }
  };

  const handleNextDate = () => {
    if (dateMode === 'weekly' && selectedWeek !== null) {
      // Next week for football
      const maxWeek = selectedSeasonType === NFLSeasonType.RegularSeason ? 18 : 4;
      setSelectedWeek((prev) => Math.min(maxWeek, (prev || 1) + 1));
    } else {
      // Next day for other sports
      const currentDate = new Date(
        parseInt(selectedDate.substring(0, 4)),
        parseInt(selectedDate.substring(4, 6)) - 1,
        parseInt(selectedDate.substring(6, 8)),
      );
      const nextDate = addDays(currentDate, 1);
      setSelectedDate(format(nextDate, 'yyyyMMdd'));
    }
  };

  const handlePickDate = (date: Date | null) => {
    if (date) {
      setSelectedDate(format(date, 'yyyyMMdd'));
      setDateMode('daily');
      setSelectedWeek(null);
    }
  };

  const handleCurrentPeriod = () => {
    if (dateMode === 'weekly') {
      const isNFL = searchResult.league === 'football/nfl';
      const isCFB = searchResult.league === 'football/college-football';

      if (isNFL) {
        const currentWeek = getCurrentNFLWeek();
        if (currentWeek) {
          setSelectedWeek(currentWeek.week);
          setSelectedSeasonType(currentWeek.seasonType);
          setDateMode('weekly');
        } else {
          setSelectedDate(format(new Date(), 'yyyyMMdd'));
          setDateMode('daily');
          setSelectedWeek(null);
        }
      } else if (isCFB) {
        const currentWeek = getCurrentCFBWeek();
        if (currentWeek) {
          setSelectedWeek(currentWeek.week);
          setSelectedSeasonType(NFLSeasonType.RegularSeason);
          setDateMode('weekly');
        } else {
          setSelectedDate(format(new Date(), 'yyyyMMdd'));
          setDateMode('daily');
          setSelectedWeek(null);
        }
      }
    } else {
      setSelectedDate(format(new Date(), 'yyyyMMdd'));
      setDateMode('daily');
      setSelectedWeek(null);
    }
  };

  const handleJumpToNFLWeek = (week: number, seasonType: number) => {
    setSelectedWeek(week);
    setSelectedSeasonType(seasonType);
    setDateMode('weekly');
  };

  const handleJumpToCFBWeek = (week: number) => {
    setSelectedWeek(week);
    setSelectedSeasonType(NFLSeasonType.RegularSeason);
    setDateMode('weekly');
  };

  // Group and filter games by league
  const gamesByLeague = useMemo(() => {
    if (!allLeaguesGames) return [];

    let leaguesData = allLeaguesGames
      .map(({ league, games }) => {
        // Sort games by time within league
        const sortedGames = [...games].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        return {
          league,
          games: sortedGames,
          count: sortedGames.length,
        };
      })
      .filter((lg) => lg.count > 0); // Only show leagues with games

    // Apply search filter
    if (searchResult.type === 'league') {
      // Show only specific league
      leaguesData = leaguesData.filter(
        (lg) => `${lg.league.sport}/${lg.league.league}` === searchResult.league,
      );
    } else if (searchResult.type === 'team' || searchResult.type === 'combined') {
      // If combined, first filter to specific league
      if (searchResult.type === 'combined') {
        leaguesData = leaguesData.filter(
          (lg) => `${lg.league.sport}/${lg.league.league}` === searchResult.league,
        );
      }

      // Then filter games by team
      leaguesData = leaguesData
        .map((lg) => {
          const filteredGames = lg.games.filter((game) =>
            game.competitions[0].competitors.some(
              (comp: Competitor) =>
                comp.team.displayName.toLowerCase().includes(searchResult.teamQuery || '') ||
                comp.team.abbreviation.toLowerCase().includes(searchResult.teamQuery || ''),
            ),
          );
          return {
            ...lg,
            games: filteredGames,
            count: filteredGames.length,
          };
        })
        .filter((lg) => lg.count > 0);
    }

    return leaguesData;
  }, [allLeaguesGames, searchResult]);

  // Check if we need to fetch team schedule (when team search returns no games)
  const shouldFetchTeamSchedule = useMemo(() => {
    return Boolean(
      (searchResult.type === 'team' || searchResult.type === 'combined') &&
        gamesByLeague.length === 0 &&
        searchResult.teamQuery,
    );
  }, [searchResult, gamesByLeague]);

  // Fetch team schedule using scoreboard API with date ranges
  const { data: teamScheduleData } = usePromise(
    async (shouldFetch: boolean, teamQuery: string, searchType: string) => {
      if (!shouldFetch || !teamQuery) {
        return null;
      }

      // Determine which leagues to search
      let leaguesToSearch = LEAGUES;
      if (searchType === 'combined' && searchResult.league) {
        const [sport, leagueName] = searchResult.league.split('/');
        leaguesToSearch = LEAGUES.filter((l) => l.sport === sport && l.league === leagueName);
      }

      // Fetch recent games (last 7 days)
      const recentDates: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const date = subDays(new Date(), i);
        recentDates.push(format(date, 'yyyyMMdd'));
      }

      // Fetch upcoming games (next 7 days)
      const upcomingDates: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const date = addDays(new Date(), i);
        upcomingDates.push(format(date, 'yyyyMMdd'));
      }

      // Fetch all scoreboards in parallel
      const allDates = [...recentDates, ...upcomingDates];
      const results = await Promise.all(
        leaguesToSearch.flatMap((league) =>
          allDates.map((date) => getScoreboard(league.sport, league.league, undefined, { date })),
        ),
      );

      // Flatten results and filter for the team
      const allGames: { game: Game; league: (typeof LEAGUES)[0] }[] = [];
      let resultIndex = 0;
      for (const league of leaguesToSearch) {
        for (let i = 0; i < allDates.length; i++) {
          const games = results[resultIndex++];
          for (const game of games) {
            const hasTeam = game.competitions[0].competitors.some(
              (comp: Competitor) =>
                comp.team.displayName.toLowerCase().includes(teamQuery.toLowerCase()) ||
                comp.team.abbreviation.toLowerCase() === teamQuery.toLowerCase(),
            );
            if (hasTeam) {
              allGames.push({ game, league });
            }
          }
        }
      }

      if (allGames.length === 0) return null;

      // Find most recent completed game
      const now = new Date();
      const completedGames = allGames.filter(({ game }) => {
        const gameDate = new Date(game.date);
        return gameDate < now && game.status.type.state === 'post';
      });
      completedGames.sort(
        (a, b) => new Date(b.game.date).getTime() - new Date(a.game.date).getTime(),
      );
      const recentGame = completedGames[0] || null;

      // Find next upcoming game
      const upcomingGames = allGames.filter(({ game }) => {
        const gameDate = new Date(game.date);
        return gameDate >= now;
      });
      upcomingGames.sort(
        (a, b) => new Date(a.game.date).getTime() - new Date(b.game.date).getTime(),
      );
      const nextGame = upcomingGames[0] || null;

      if (!recentGame && !nextGame) return null;

      // Extract team name from one of the games
      const teamName =
        recentGame?.game.competitions[0].competitors.find(
          (comp: Competitor) =>
            comp.team.displayName.toLowerCase().includes(teamQuery.toLowerCase()) ||
            comp.team.abbreviation.toLowerCase() === teamQuery.toLowerCase(),
        )?.team.displayName ||
        nextGame?.game.competitions[0].competitors.find(
          (comp: Competitor) =>
            comp.team.displayName.toLowerCase().includes(teamQuery.toLowerCase()) ||
            comp.team.abbreviation.toLowerCase() === teamQuery.toLowerCase(),
        )?.team.displayName ||
        teamQuery;

      return {
        recentGame,
        nextGame,
        teamName,
      };
    },
    [shouldFetchTeamSchedule, searchResult.teamQuery ?? '', searchResult.type],
  );

  // Group games by day for football weekly view
  const gamesByDay = useMemo(() => {
    // Weekly view - group football games by day
    if (dateMode === 'weekly' && selectedWeek !== null) {
      // Only include football leagues
      const footballLeagues = gamesByLeague.filter((lg) => lg.league.sport === 'football');

      // Combine all football games and group by day
      const allFootballGames = footballLeagues.flatMap((lg) => lg.games);

      if (allFootballGames.length === 0) {
        return {};
      }

      return allFootballGames.reduce(
        (acc, game) => {
          const gameDate = new Date(game.date);
          const dayKey = format(gameDate, 'EEEE M/d');
          if (!acc[dayKey]) {
            acc[dayKey] = [];
          }
          acc[dayKey].push(game);
          return acc;
        },
        {} as Record<string, Game[]>,
      );
    }

    // Daily mode or no week selected - return empty (use gamesByLeague instead)
    return {};
  }, [gamesByLeague, dateMode, selectedWeek]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search leagues or teams (e.g., 'NBA', 'Lakers', 'nba:lakers')"
      throttle
    >
      <List.EmptyView
        title="No games found"
        description={getSearchHints(searchText)}
        actions={
          <ActionPanel>
            <NavigationActions
              dateMode={dateMode}
              searchLeague={searchResult.league}
              selectedWeek={selectedWeek}
              selectedSeasonType={selectedSeasonType}
              onPreviousDate={handlePreviousDate}
              onNextDate={handleNextDate}
              onPickDate={handlePickDate}
              onCurrentPeriod={handleCurrentPeriod}
              onJumpToNFLWeek={
                searchResult.league === 'football/nfl' ? handleJumpToNFLWeek : undefined
              }
              onJumpToCFBWeek={
                searchResult.league === 'football/college-football'
                  ? handleJumpToCFBWeek
                  : undefined
              }
            />
          </ActionPanel>
        }
      />

      {/* Team Schedule View - Recent and Next games */}
      {teamScheduleData && (
        <List.Section title={`${teamScheduleData.teamName} - Recent & Upcoming`}>
          {teamScheduleData.recentGame && (
            <GameListItem
              key={teamScheduleData.recentGame.game.id}
              game={teamScheduleData.recentGame.game}
              sport={teamScheduleData.recentGame.league.sport}
              league={teamScheduleData.recentGame.league.league}
              searchLeague={searchResult.league}
              dateMode={dateMode}
              selectedWeek={selectedWeek}
              selectedSeasonType={selectedSeasonType}
              onPreviousDate={handlePreviousDate}
              onNextDate={handleNextDate}
              onPickDate={handlePickDate}
              onCurrentPeriod={handleCurrentPeriod}
              onJumpToNFLWeek={
                searchResult.league === 'football/nfl' ? handleJumpToNFLWeek : undefined
              }
              onJumpToCFBWeek={
                searchResult.league === 'football/college-football'
                  ? handleJumpToCFBWeek
                  : undefined
              }
            />
          )}
          {teamScheduleData.nextGame && (
            <GameListItem
              key={teamScheduleData.nextGame.game.id}
              game={teamScheduleData.nextGame.game}
              sport={teamScheduleData.nextGame.league.sport}
              league={teamScheduleData.nextGame.league.league}
              searchLeague={searchResult.league}
              dateMode={dateMode}
              selectedWeek={selectedWeek}
              selectedSeasonType={selectedSeasonType}
              onPreviousDate={handlePreviousDate}
              onNextDate={handleNextDate}
              onPickDate={handlePickDate}
              onCurrentPeriod={handleCurrentPeriod}
              onJumpToNFLWeek={
                searchResult.league === 'football/nfl' ? handleJumpToNFLWeek : undefined
              }
              onJumpToCFBWeek={
                searchResult.league === 'football/college-football'
                  ? handleJumpToCFBWeek
                  : undefined
              }
            />
          )}
        </List.Section>
      )}

      {/* Football Weekly View - Games grouped by day */}
      {Object.keys(gamesByDay).length > 0 &&
        Object.entries(gamesByDay).map(([day, dayGames]) => {
          // Determine sport/league for these games (all football in weekly view)
          const footballLeague = LEAGUES.find((l) => l.sport === 'football') || LEAGUES[0];
          const games = dayGames as Game[];

          return (
            <List.Section
              key={day}
              title={day}
              subtitle={`${games.length} game${games.length !== 1 ? 's' : ''}`}
            >
              {games.map((game) => (
                <GameListItem
                  key={game.id}
                  game={game}
                  sport={footballLeague.sport}
                  league={footballLeague.league}
                  searchLeague={searchResult.league}
                  dateMode={dateMode}
                  selectedWeek={selectedWeek}
                  selectedSeasonType={selectedSeasonType}
                  onPreviousDate={handlePreviousDate}
                  onNextDate={handleNextDate}
                  onPickDate={handlePickDate}
                  onCurrentPeriod={handleCurrentPeriod}
                  onJumpToNFLWeek={
                    searchResult.league === 'football/nfl' ? handleJumpToNFLWeek : undefined
                  }
                  onJumpToCFBWeek={
                    searchResult.league === 'football/college-football'
                      ? handleJumpToCFBWeek
                      : undefined
                  }
                />
              ))}
            </List.Section>
          );
        })}

      {/* Regular View - All leagues as sections */}
      {Object.keys(gamesByDay).length === 0 &&
        gamesByLeague.map(({ league, games, count }) => (
          <List.Section
            key={`${league.sport}/${league.league}`}
            title={league.name}
            subtitle={`${count} game${count !== 1 ? 's' : ''}`}
          >
            {games.map((game) => (
              <GameListItem
                key={game.id}
                game={game}
                sport={league.sport}
                league={league.league}
                searchLeague={searchResult.league}
                dateMode={dateMode}
                selectedWeek={selectedWeek}
                selectedSeasonType={selectedSeasonType}
                onPreviousDate={handlePreviousDate}
                onNextDate={handleNextDate}
                onPickDate={handlePickDate}
                onCurrentPeriod={handleCurrentPeriod}
                onJumpToNFLWeek={
                  searchResult.league === 'football/nfl' ? handleJumpToNFLWeek : undefined
                }
                onJumpToCFBWeek={
                  searchResult.league === 'football/college-football'
                    ? handleJumpToCFBWeek
                    : undefined
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
