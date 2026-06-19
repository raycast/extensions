import {
  FIFA_COMPETITION,
  getMatchLiveData,
  getMatches,
  getPlayerName,
  getTeamGoals,
  isUpcomingMatch,
  matchStage,
  resolveCountry,
  teamCode,
  teamName,
  type Goal,
  type Match,
  type Team,
  type TeamReference,
} from "../lib/worldcup";
import { clamp } from "../utils";

type Input = {
  /**
   * Optional country name or FIFA tricode. Examples: "Mexico", "Brazil", "USA".
   */
  country?: string;
  /**
   * Optional player or athlete name. Partial names are accepted, for example "Gimenez".
   */
  player?: string;
  /**
   * Maximum number of team/player rows to return.
   */
  limit?: number;
};

type GoalEvent = {
  matchId: string;
  dateUtc: string;
  stage: string;
  team: TeamReference;
  opponent: TeamReference;
  playerId: string;
  playerName: string;
  minute: string;
};

/**
 * Count FIFA World Cup 2026 goals by country or player using the published match live data.
 */
export default async function tool(input: Input) {
  const matches = await getMatches();
  const country = input.country ? resolveCountry(input.country, matches) : undefined;
  const limit = clamp(input.limit ?? 10, 1, 25);

  if (input.country && !country) {
    return {
      competition: FIFA_COMPETITION,
      query: {
        country: input.country,
        player: input.player,
        limit,
      },
      resolvedCountry: undefined,
      matchesCounted: 0,
      failedMatchDetailRequests: 0,
      totalGoals: 0,
      teams: [],
      players: [],
      note: "The requested country was not found in the currently published FIFA World Cup 2026 schedule.",
    };
  }

  const completedOrLiveMatches = matches.filter((match) => !isUpcomingMatch(match));
  const relevantMatches = country
    ? completedOrLiveMatches.filter((match) => [teamCode(match.Home), teamCode(match.Away)].includes(country.code))
    : completedOrLiveMatches;
  const settled = await Promise.allSettled(
    relevantMatches.map(async (match) => ({
      match,
      liveData: await getMatchLiveData(match),
    })),
  );
  const playerQuery = input.player ? normalize(input.player) : undefined;
  const goals = settled
    .flatMap((result) => {
      if (result.status === "rejected") return [];
      return goalsForMatch(result.value.match, result.value.liveData.HomeTeam, result.value.liveData.AwayTeam);
    })
    .filter((goal) => {
      if (country && goal.team.code !== country.code) return false;
      if (playerQuery && !normalize(goal.playerName).includes(playerQuery)) return false;
      return true;
    });
  const teams = summarizeTeams(goals).slice(0, limit);
  const players = summarizePlayers(goals).slice(0, limit);

  return {
    competition: FIFA_COMPETITION,
    query: {
      country: input.country,
      player: input.player,
      limit,
    },
    resolvedCountry: country,
    matchesCounted: relevantMatches.length,
    failedMatchDetailRequests: settled.filter((result) => result.status === "rejected").length,
    totalGoals: goals.length,
    teams,
    players,
    note: goals.length === 0 ? "No matching goals were found in completed or live FIFA match data." : undefined,
  };
}

function goalsForMatch(match: Match, homeTeam: Team | undefined, awayTeam: Team | undefined): GoalEvent[] {
  const home = homeTeam ?? match.Home ?? undefined;
  const away = awayTeam ?? match.Away ?? undefined;

  return [
    ...goalsForTeam(match, home, away, getTeamGoals(home)),
    ...goalsForTeam(match, away, home, getTeamGoals(away)),
  ];
}

function goalsForTeam(match: Match, team: Team | undefined, opponent: Team | undefined, goals: Goal[]): GoalEvent[] {
  if (!team) return [];

  return goals.map((goal) => ({
    matchId: match.IdMatch,
    dateUtc: match.Date,
    stage: matchStage(match),
    team: {
      code: teamCode(team),
      id: team.IdTeam,
      name: teamName(team),
    },
    opponent: {
      code: teamCode(opponent),
      id: opponent?.IdTeam,
      name: teamName(opponent),
    },
    playerId: goal.IdPlayer,
    playerName: getPlayerName(team, goal.IdPlayer),
    minute: goal.Minute,
  }));
}

function summarizeTeams(goals: GoalEvent[]) {
  return [...groupBy(goals, (goal) => goal.team.code).values()]
    .map((teamGoals) => ({
      country: teamGoals[0].team.name,
      code: teamGoals[0].team.code,
      goals: teamGoals.length,
    }))
    .sort(sortByGoalsThenName);
}

function summarizePlayers(goals: GoalEvent[]) {
  return [...groupBy(goals, (goal) => `${goal.playerId}:${goal.team.code}`).values()]
    .map((playerGoals) => ({
      player: playerGoals[0].playerName,
      country: playerGoals[0].team.name,
      countryCode: playerGoals[0].team.code,
      goals: playerGoals.length,
      goalMinutes: playerGoals.map((goal) => ({
        minute: goal.minute,
        matchId: goal.matchId,
        dateUtc: goal.dateUtc,
        opponent: goal.opponent.name,
      })),
    }))
    .sort(sortByGoalsThenName);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const itemKey = key(item);
    groups.set(itemKey, [...(groups.get(itemKey) ?? []), item]);
  }

  return groups;
}

function sortByGoalsThenName<T extends { goals: number; country?: string; player?: string }>(a: T, b: T): number {
  if (b.goals !== a.goals) return b.goals - a.goals;
  return (a.player ?? a.country ?? "").localeCompare(b.player ?? b.country ?? "");
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}
