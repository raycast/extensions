export interface Tournament {
  id: string;
  name: string;
  slug: string;
  image: string;
  tier: string;
  gameId: string;
  game: Game;
}

export interface Matche {
  id: string;
  name: string;
  slug: string;
  image: string;
  tier: string;
  scheduledAt: string;
  numberOfGames: string;
  teamA: Team;
  teamB: Team;
  teamAScore: string;
  teamBScore: string;
  status: string;
  gameId: string;
  game: Game;
  leagueId: string;
  league: League;
}

export interface League {
  id: string;
  name: string;
  slug: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  icon: string;
  fantasy: boolean;
}
