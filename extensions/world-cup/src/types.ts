export type Team = {
  IdTeam: string;
  TeamName: { Description: string }[];
  Abbreviation: string;
  Tactics: string;
  Goals?: Goal[];
  Players?: Player[];
};

export type Stadium = {
  Name: { Description: string; Locale: string }[];
};

export type Officials = {
  NameShort: { Description: string; Locale: string }[];
}[];

export type Match = {
  Date: string;
  MatchTime: string | null;
  IdCompetition: string;
  IdSeason: string;
  IdStage: string;
  Attendance: string | null;
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

export type Goal = {
  Type: number;
  IdPlayer: string;
  Minute: string;
  IdAssistPlayer: string;
  Period: number;
  IdGoal: string | null;
  IdTeam: string;
};

export type Player = {
  IdPlayer: string;
  IdTeam: string;
  PlayerName: { Locale: string; Description: string }[];
};
