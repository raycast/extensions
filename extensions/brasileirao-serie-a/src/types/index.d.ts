interface Team {
  id: number;
  name: string;
  shortName: string;
  venue: string;
  crest: string;
  tla: string;
}

interface Score {
  fullTime: {
    home: number;
    away: number;
  };
}

type Status = "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED";

interface Match {
  id: number;
  utcDate: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  status: Status;
}

interface Matches {
  matches: Match[];
}

interface Teams {
  teams: Team[];
}

interface Table {
  position: number;
  team: Team;
  playedGames: number;
  points: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  previousPosition?: number;
}

type StandingsTypes = "TOTAL";

interface Standing {
  type: StandingsTypes;
  table: Table[];
}

interface Standings {
  standings: Standing[];
}

interface Season {
  currentMatchday: number;
  startDate: string;
  endDate: string;
  previousMatchday: number;
}

interface LeagueInfo {
  currentSeason: Season;
}
