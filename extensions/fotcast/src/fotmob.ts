import type { Image } from "@raycast/api";

export type Team = {
  id: number;
  name: string;
  longName: string;
  shortName?: string;
  score: number;
};

export type MatchStatus = {
  utcTime: string;
  started: boolean;
  finished: boolean;
  cancelled: boolean;
  ongoing?: boolean;
  awarded?: boolean;
  scoreStr?: string;
  aggregatedStr?: string;
  liveTime?: {
    short: string;
    long: string;
    maxTime: number;
    addedTime: number;
  };
  reason?: { short: string; long: string; shortKey: string; longKey: string };
  halfs?: Record<string, string>;
};

export type Match = {
  id: number;
  leagueId: number;
  time: string;
  timeTS: number;
  statusId: number;
  tournamentStage: string;
  eliminatedTeamId: number | null;
  home: Team;
  away: Team;
  status: MatchStatus;
};

export type MatchDayLeague = {
  id: number;
  primaryId: number;
  parentLeagueId?: number;
  parentLeagueName?: string | null;
  isGroup?: boolean | null;
  groupName?: string;
  name: string;
  ccode: string;
  internalRank: number;
  localRank?: number;
  simpleLeague: boolean;
  matches: Match[];
};

export type LeagueRef = {
  id: number;
  name: string;
  localizedName: string;
  pageUrl: string;
  ccode: string;
};

export type AllLeagues = {
  popular: LeagueRef[];
  international: { ccode: string; name: string; leagues: LeagueRef[] }[];
  countries: { ccode: string; name: string; leagues: LeagueRef[] }[];
};

export type SearchTeam = { id: number; name: string; leagueName?: string };
export type SearchLeague = { id: number; name: string; ccode?: string };
export type SearchResult = { teams: SearchTeam[]; leagues: SearchLeague[] };

type SuggestGroup<P> = { options: { text: string; payload: P }[] }[];
type SuggestResponse = {
  teamSuggest?: SuggestGroup<{
    id: string;
    leagueId?: number;
    leagueName?: string;
  }>;
  leagueSuggest?: SuggestGroup<{ id: string; countryCode?: string }>;
};

/** Only the slice of /matchDetails the pane reads; every path can be missing. */
export type MatchEvent = {
  type: string;
  time: number;
  timeStr?: string | number;
  overloadTime?: number | null;
  nameStr?: string;
  isHome?: boolean;
  card?: "Yellow" | "Red" | "YellowRed" | null;
  ownGoal?: boolean | null;
  isPenalty?: boolean;
  goalDescriptionKey?: string | null;
  /** Substitution events only: [playerIn, playerOut]. */
  swap?: { id: string; name: string }[];
};

export type LineupPlayer = {
  id: number;
  name: string;
  lastName?: string;
  shirtNumber?: string;
  usualPlayingPositionId?: number | null; // 0 GK, 1 DEF, 2 MID, 3 ATT
  horizontalLayout?: { x: number; y: number } | null;
  performance?: {
    rating?: number | null;
    events?: { type: string }[];
    substitutionEvents?: { time: number; type: "subIn" | "subOut" }[];
  } | null;
};

export type LineupTeam = {
  name: string;
  formation?: string | null;
  starters?: LineupPlayer[];
  subs?: LineupPlayer[];
};

export type MatchDetails = {
  header?: {
    teams?: { id: number; name: string; score: number }[];
    status?: MatchStatus;
  } | null;
  content?: {
    matchFacts?: {
      events?: { events?: MatchEvent[] | null } | null;
      infoBox?: {
        Tournament?: {
          leagueName?: string;
          roundName?: string;
          parentLeagueId?: number;
        };
        Stadium?: { name?: string; city?: string } | null;
        Referee?: { text?: string } | null;
        Attendance?: number | null;
      } | null;
    } | null;
    lineup?: {
      lineupType?: string;
      homeTeam?: LineupTeam | null;
      awayTeam?: LineupTeam | null;
    } | null;
    stats?: {
      Periods?: {
        All?: {
          stats?: {
            stats?: {
              key: string;
              stats?: (string | number)[];
            }[];
          }[];
        };
      };
    } | null;
  } | null;
};

// FotMob 404s some paths without a browser User-Agent.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`FotMob ${response.status}`);
  return (await response.json()) as T;
}

/** dateKey is "YYYYMMDD" in local time. */
export async function fetchMatches(dateKey: string): Promise<MatchDayLeague[]> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const data = await get<{ date: string; leagues: MatchDayLeague[] }>(
    `https://www.fotmob.com/api/data/matches?date=${dateKey}&timezone=${encodeURIComponent(timezone)}`,
  );
  return data?.leagues ?? [];
}

export async function fetchAllLeagues(): Promise<AllLeagues> {
  return get<AllLeagues>("https://www.fotmob.com/api/data/allLeagues");
}

/** Crest PNG as a data URI so it can be embedded in an SVG scoreboard. */
export async function fetchCrestDataUri(teamId: number): Promise<string> {
  const response = await fetch(crestUrl(teamId), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`FotMob ${response.status}`);
  const type = response.headers.get("content-type") ?? "image/png";
  const b64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  return `data:${type};base64,${b64}`;
}

export async function fetchMatchDetails(id: number): Promise<MatchDetails> {
  return get<MatchDetails>(
    `https://www.fotmob.com/api/data/matchDetails?matchId=${id}`,
  );
}

// "Arsenal|9825" -> ["Arsenal", 9825]
function splitSuggest(text: string): [string, number] {
  const i = text.lastIndexOf("|");
  return [text.slice(0, i), Number(text.slice(i + 1))];
}

export async function search(term: string): Promise<SearchResult> {
  const data = await get<SuggestResponse>(
    `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(term)}&lang=en`,
  );
  return {
    teams: (data.teamSuggest?.[0]?.options ?? []).map((o) => {
      const [name, id] = splitSuggest(o.text);
      return {
        id: Number(o.payload.id) || id,
        name,
        leagueName: o.payload.leagueName,
      };
    }),
    leagues: (data.leagueSuggest?.[0]?.options ?? []).map((o) => {
      const [name, id] = splitSuggest(o.text);
      return {
        id: Number(o.payload.id) || id,
        name,
        ccode: o.payload.countryCode,
      };
    }),
  };
}

export const crestUrl = (id: number) =>
  `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;

export function teamCrest(id: number): Image.ImageLike {
  return { source: crestUrl(id) };
}

export function leagueLogo(id: number): Image.ImageLike {
  return {
    source: {
      light: `https://images.fotmob.com/image_resources/logo/leaguelogo/${id}.png`,
      dark: `https://images.fotmob.com/image_resources/logo/leaguelogo/dark/${id}.png`,
    },
  };
}

export const matchUrl = (id: number) => `https://www.fotmob.com/match/${id}`;
export const teamUrl = (id: number) => `https://www.fotmob.com/teams/${id}`;
export const leagueUrl = (id: number) => `https://www.fotmob.com/leagues/${id}`;
