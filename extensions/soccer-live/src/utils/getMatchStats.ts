import { useFetch } from "@raycast/utils";

interface Statistic {
  name: string;
  displayName: string;
  displayValue: string;
}

interface Team {
  id: string;
  displayName: string;
  abbreviation: string;
  logo: string;
}

interface BoxscoreTeam {
  team: Team;
  statistics: Statistic[];
  score?: string;
}

interface Boxscore {
  teams: BoxscoreTeam[];
}

interface Leader {
  team: Team;
  leaders: Array<{
    leaders: Array<{
      athlete: {
        id: string;
        shortName: string;
        headshot?: { href: string };
      };
      displayValue: string;
    }>;
  }>;
}

interface ScoringPlay {
  id: string;
  type: {
    id: string;
    text: string;
  };
  text: string;
  shortText: string;
  period: {
    number: number;
  };
  clock: {
    displayValue: string;
  };
  scoringPlay: boolean;
  team: {
    id: string;
    abbreviation: string;
  };
  athletesInvolved: Array<{
    athlete: {
      id: string;
      shortName: string;
      displayName: string;
    };
    type: {
      id: string;
      text: string;
    };
  }>;
}

interface Plays {
  scoring: ScoringPlay[];
}

interface Competitor {
  team: Team;
  score: string;
}

interface Participant {
  athlete: {
    id: string;
    displayName: string;
    shortName?: string;
  };
}

interface Detail {
  clock: {
    displayValue: string;
  };
  team: {
    id: string;
    displayName: string;
    abbreviation?: string;
  };
  participants?: Participant[];
  scoringPlay?: boolean;
  text?: string;
  type?: { id?: string; text?: string };
}

interface HeaderCompetition {
  details?: Detail[];
}

interface Header {
  competitions: HeaderCompetition[];
}

interface Competition {
  competitors: Competitor[];
  scoringPlays?: ScoringPlay[];
}

/** Roster entry: starter or reserve with athlete info */
interface RosterEntry {
  athlete?: {
    id?: string;
    displayName?: string;
    shortName?: string;
    position?: { abbreviation?: string; displayName?: string };
    jersey?: string;
  };
  starter?: boolean;
  position?: { abbreviation?: string; displayName?: string };
  jersey?: string;
  /** Formation position order (e.g. "1" for GK, "2"-"11" for field players) */
  formationPlace?: string;
}

/** Team roster: starters and reserves (also used when API returns "roster" key) */
interface TeamRoster {
  team?: { id?: string; displayName?: string; abbreviation?: string };
  roster?: RosterEntry[];
  coaches?: Array<{ displayName?: string; shortName?: string }>;
  homeAway?: "home" | "away";
}

/** Team roster in summary: has homeAway and roster array (ESPN uses "rosters" key) */
interface SummaryRoster {
  homeAway?: "home" | "away";
  team?: { id?: string; displayName?: string; abbreviation?: string };
  roster?: RosterEntry[];
  coaches?: Array<{ displayName?: string; shortName?: string }>;
}

interface MatchSummary {
  boxscore: Boxscore;
  leaders: Leader[];
  plays?: Plays;
  competitions?: Competition[];
  scoringPlays?: ScoringPlay[];
  header?: Header;
  /** Lineup data when available (ESPN key is "rosters"; starters + reserves) */
  roster?: TeamRoster[];
  rosters?: SummaryRoster[];
}

export default function getMatchStats(gameId: string, leagueCode: string) {
  const {
    isLoading: statsLoading,
    data: statsData,
    revalidate: statsRevalidate,
  } = useFetch<MatchSummary>(
    `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/summary?event=${gameId}`,
  );

  return { statsData, statsLoading, statsRevalidate };
}
