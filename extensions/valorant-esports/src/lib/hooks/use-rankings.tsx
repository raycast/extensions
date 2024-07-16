import { useAPI } from "./use-api";
import { useTournaments } from "./use-tournaments";

export function useRankings(leagueId: string) {
  const { tournaments } = useTournaments(leagueId);

  const tournamentId = tournaments?.[0].id;

  const { data, isLoading } = useAPI<TournamentStagesResponse>({
    query: "getStandings",
    params: { tournamentId },
    execute: !!tournamentId,
  });

  return {
    rankings: data?.data?.standings?.[0].stages[0].sections[0].rankings ?? [],
    isLoading,
  };
}

interface TournamentStagesResponse {
  data: {
    standings: StandingsItem[];
  };
}

interface StandingsItem {
  id: string;
  name: string;
  slug: string;
  scores: ScoresItem[];
  split: Split;
  season: Season;
  stages: StagesItem[];
}

interface ScoresItem {
  team: Team;
  position: number;
  points: number;
}

interface Team {
  id: string;
  name: string;
  image: string;
  code: string;
}

interface Split {
  id: string;
}

interface Season {
  id: string;
  name: string;
  slug: string;
  status: string;
  startTime: string;
  endTime: string;
  splits: SplitsItem[];
}

interface SplitsItem {
  id: string;
  name: string;
  slug: string;
  startTime: string;
  endTime: string;
}

interface StagesItem {
  name: string;
  slug: string;
  sections: SectionsItem[];
}

interface SectionsItem {
  id: string;
  name: string;
  type: string;
  columns: ColumnsItem[];
  rankings: RankingsItem[];
}

interface RankingsItem {
  ordinal: number;
  teams: TeamsItem[];
}

interface TeamsItem {
  id: string;
  slug: string;
  name: string;
  code: string;
  image: string;
  record?: Record;
  result: Result | null;
  origin?: Origin;
}

interface Record {
  wins: number;
  ties: number;
  losses: number;
}

interface ColumnsItem {
  cells: CellsItem[];
}

interface CellsItem {
  name: string;
  slug: string;
  matches: MatchesItem[];
}

interface MatchesItem {
  id: string;
  structuralId: string;
  state: string;
  teams: TeamsItem[];
}

interface Result {
  outcome: null;
  gameWins: number;
}

interface Origin {
  structuralId: string;
  type: string;
  slot: number;
}
