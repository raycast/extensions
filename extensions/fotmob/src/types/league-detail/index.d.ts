// League table team entry
export type LeagueTableTeam = {
  id: number;
  name: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoresFor: number;
  scoresAgainst: number;
  goalDifference: number;
  points: number;
  qualColor?: string;
  idx: number;
  deduction?: number;
  ongoing?: boolean;
  form?: string[];
};

// League table data structure
export type LeagueTable = {
  tableId: number;
  leagueId: number;
  legend: Array<{
    title: string;
    color: string;
    indices: number[];
  }>;
  composite: boolean;
  tables: Array<{
    tableName: string;
    tableRows: LeagueTableTeam[];
  }>;
};

// Overall league detail response
export type LeagueDetailData = {
  details: {
    id: number;
    name: string;
    country: string;
    leagueColorHex: string;
  };
  table?: LeagueTable[];
  overview?: {
    season: string;
    selectedSeason: string;
    table: LeagueTable;
  };
};

// Simplified table for display
export type DisplayableTable = {
  tableName: string;
  teams: LeagueTableTeam[];
  legend?: Array<{
    title: string;
    color: string;
    indices: number[];
  }>;
};
