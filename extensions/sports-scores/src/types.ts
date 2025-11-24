export interface League {
  id: string;
  name: string;
  abbreviation: string;
  slug: string;
}

export interface Team {
  id: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  record?: string;
}

export interface Statistic {
  name: string;
  abbreviation: string;
  displayValue: string;
}

export interface Competitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: string;
  team: Team;
  score: string;
  linescores?: { value: number }[];
  statistics?: Statistic[];
  records?: { summary: string }[];
}

export interface Status {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: 'pre' | 'in' | 'post';
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface Broadcast {
  market: string;
  names: string[];
}

export interface Game {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  status: Status;
  competitions: {
    id: string;
    uid: string;
    date: string;
    competitors: Competitor[];
    broadcasts?: Broadcast[];
    venue?: { fullName: string; address?: { city: string; state: string } };
  }[];
  links: { href: string; text: string }[];
}

export interface ScoreboardResponse {
  leagues: League[];
  events: Game[];
}

export interface Leader {
  displayValue: string;
  athlete?: {
    id: string;
    fullName: string;
    displayName: string;
    shortName: string;
    headshot?: { href: string };
    position?: { abbreviation: string };
  };
  team: {
    id: string;
  };
}

export interface Pickcenter {
  provider: { name: string };
  details: string; // e.g. "NY -1.5"
  overUnder: number;
  spread: number;
}

export interface WinProbability {
  tiePercentage: number;
  homeWinPercentage: number;
  secondsLeft: number;
  playId: string;
}

export interface BoxScore {
  teams: {
    team: Team;
    statistics: {
      name: string;
      displayValue: string;
      label: string;
    }[];
  }[];
  players: {
    team: Team;
    statistics: {
      name?: string; // Category name (e.g., "passing", "rushing" for football)
      displayName?: string; // Display name for category
      athletes: {
        athlete: {
          displayName: string;
          headshot?: { href: string };
          position?: { abbreviation: string }; // Available for NBA, MLB, NHL, Soccer
        };
        stats: string[];
      }[];
      names: string[];
      labels: string[];
    }[];
  }[];
}

export interface LeaderCategory {
  name: string; // e.g., "points", "rebounds", "assists"
  displayName: string; // e.g., "Points", "Rebounds", "Assists"
  shortDisplayName?: string; // e.g., "PTS", "REB", "AST"
  abbreviation?: string;
  leaders: {
    displayValue: string;
    value?: number;
    athlete?: { fullName: string; headshot?: { href: string } };
  }[];
}

export interface GameSummary {
  header: {
    id: string;
    competitions: {
      competitors: Competitor[];
    }[];
  };
  boxscore?: BoxScore;
  leaders?: {
    team: { id: string; abbreviation: string };
    leaders: LeaderCategory[];
  }[];
  pickcenter?: Pickcenter[];
  winProbability?: WinProbability[];
}
