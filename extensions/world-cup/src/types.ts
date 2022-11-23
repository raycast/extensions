export type Team = { TeamName: { Description: string }[]; Abbreviation: string; Tactics: string };
export type Stadium = { Name: { Description: string; Locale: string }[] };
export type Officials = { NameShort: { Description: string; Locale: string }[] }[];

export type Match = {
  Date: string;
  MatchTime: string | null;
  IdCompetition: string;
  IdSeason: string;
  IdStage: string;
  IdMatch: string;
  Stadium: Stadium;
  GroupName: { Description: string }[];
  StageName: { Description: string }[];
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  MatchStatus: number;
  Home: Team | null;
  Away: Team | null;
  Officials: Officials;
};
