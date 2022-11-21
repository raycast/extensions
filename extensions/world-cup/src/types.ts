export type Team = { TeamName: { Description: string }[]; Abbreviation: string };

export type Match = {
  Date: string;
  MatchTime: string | null;
  IdCompetition: string;
  IdSeason: string;
  IdStage: string;
  IdMatch: string;
  GroupName: { Description: string }[];
  StageName: { Description: string }[];
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  MatchStatus: number;
  Home: Team | null;
  Away: Team | null;
};
