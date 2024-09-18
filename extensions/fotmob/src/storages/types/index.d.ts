export type Team = {
  id: string;
  leagueId: string;
  name: string;
};

export type League = {
  id: string;
  name: string;
  countryCode: string;
};

export type Player = {
  id: string;
  isCoach: boolean;
  name: string;
};
