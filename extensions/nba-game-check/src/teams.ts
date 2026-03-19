/**
 * NBA team data with BallDontLie API IDs and common aliases for fuzzy matching.
 * IDs sourced from the BallDontLie /nba/v1/teams endpoint.
 */

export interface NBATeam {
  id: number;
  name: string;
  fullName: string;
  abbreviation: string;
  city: string;
  conference: string;
  aliases: string[];
}

export const NBA_TEAMS: NBATeam[] = [
  { id: 1, name: "Hawks", fullName: "Atlanta Hawks", abbreviation: "ATL", city: "Atlanta", conference: "East", aliases: ["hawks", "atl", "atlanta"] },
  { id: 2, name: "Celtics", fullName: "Boston Celtics", abbreviation: "BOS", city: "Boston", conference: "East", aliases: ["celtics", "bos", "boston"] },
  { id: 3, name: "Nets", fullName: "Brooklyn Nets", abbreviation: "BKN", city: "Brooklyn", conference: "East", aliases: ["nets", "bkn", "brooklyn"] },
  { id: 4, name: "Hornets", fullName: "Charlotte Hornets", abbreviation: "CHA", city: "Charlotte", conference: "East", aliases: ["hornets", "cha", "charlotte"] },
  { id: 5, name: "Bulls", fullName: "Chicago Bulls", abbreviation: "CHI", city: "Chicago", conference: "East", aliases: ["bulls", "chi", "chicago"] },
  { id: 6, name: "Cavaliers", fullName: "Cleveland Cavaliers", abbreviation: "CLE", city: "Cleveland", conference: "East", aliases: ["cavaliers", "cavs", "cle", "cleveland"] },
  { id: 7, name: "Mavericks", fullName: "Dallas Mavericks", abbreviation: "DAL", city: "Dallas", conference: "West", aliases: ["mavericks", "mavs", "dal", "dallas"] },
  { id: 8, name: "Nuggets", fullName: "Denver Nuggets", abbreviation: "DEN", city: "Denver", conference: "West", aliases: ["nuggets", "den", "denver"] },
  { id: 9, name: "Pistons", fullName: "Detroit Pistons", abbreviation: "DET", city: "Detroit", conference: "East", aliases: ["pistons", "det", "detroit"] },
  { id: 10, name: "Warriors", fullName: "Golden State Warriors", abbreviation: "GSW", city: "Golden State", conference: "West", aliases: ["warriors", "gsw", "golden state", "gs", "dubs"] },
  { id: 11, name: "Rockets", fullName: "Houston Rockets", abbreviation: "HOU", city: "Houston", conference: "West", aliases: ["rockets", "hou", "houston"] },
  { id: 12, name: "Pacers", fullName: "Indiana Pacers", abbreviation: "IND", city: "Indiana", conference: "East", aliases: ["pacers", "ind", "indiana"] },
  { id: 13, name: "Clippers", fullName: "LA Clippers", abbreviation: "LAC", city: "Los Angeles", conference: "West", aliases: ["clippers", "lac", "la clippers"] },
  { id: 14, name: "Lakers", fullName: "Los Angeles Lakers", abbreviation: "LAL", city: "Los Angeles", conference: "West", aliases: ["lakers", "lal", "la lakers", "los angeles lakers"] },
  { id: 15, name: "Grizzlies", fullName: "Memphis Grizzlies", abbreviation: "MEM", city: "Memphis", conference: "West", aliases: ["grizzlies", "grizz", "mem", "memphis"] },
  { id: 16, name: "Heat", fullName: "Miami Heat", abbreviation: "MIA", city: "Miami", conference: "East", aliases: ["heat", "mia", "miami"] },
  { id: 17, name: "Bucks", fullName: "Milwaukee Bucks", abbreviation: "MIL", city: "Milwaukee", conference: "East", aliases: ["bucks", "mil", "milwaukee"] },
  { id: 18, name: "Timberwolves", fullName: "Minnesota Timberwolves", abbreviation: "MIN", city: "Minnesota", conference: "West", aliases: ["timberwolves", "wolves", "twolves", "min", "minnesota"] },
  { id: 19, name: "Pelicans", fullName: "New Orleans Pelicans", abbreviation: "NOP", city: "New Orleans", conference: "West", aliases: ["pelicans", "pels", "nop", "new orleans"] },
  { id: 20, name: "Knicks", fullName: "New York Knicks", abbreviation: "NYK", city: "New York", conference: "East", aliases: ["knicks", "nyk", "new york", "ny knicks"] },
  { id: 21, name: "Thunder", fullName: "Oklahoma City Thunder", abbreviation: "OKC", city: "Oklahoma City", conference: "West", aliases: ["thunder", "okc", "oklahoma city", "oklahoma"] },
  { id: 22, name: "Magic", fullName: "Orlando Magic", abbreviation: "ORL", city: "Orlando", conference: "East", aliases: ["magic", "orl", "orlando"] },
  { id: 23, name: "76ers", fullName: "Philadelphia 76ers", abbreviation: "PHI", city: "Philadelphia", conference: "East", aliases: ["76ers", "sixers", "phi", "philadelphia", "philly"] },
  { id: 24, name: "Suns", fullName: "Phoenix Suns", abbreviation: "PHX", city: "Phoenix", conference: "West", aliases: ["suns", "phx", "phoenix"] },
  { id: 25, name: "Trail Blazers", fullName: "Portland Trail Blazers", abbreviation: "POR", city: "Portland", conference: "West", aliases: ["trail blazers", "blazers", "por", "portland"] },
  { id: 26, name: "Kings", fullName: "Sacramento Kings", abbreviation: "SAC", city: "Sacramento", conference: "West", aliases: ["kings", "sac", "sacramento"] },
  { id: 27, name: "Spurs", fullName: "San Antonio Spurs", abbreviation: "SAS", city: "San Antonio", conference: "West", aliases: ["spurs", "sas", "san antonio"] },
  { id: 28, name: "Raptors", fullName: "Toronto Raptors", abbreviation: "TOR", city: "Toronto", conference: "East", aliases: ["raptors", "raps", "tor", "toronto"] },
  { id: 29, name: "Jazz", fullName: "Utah Jazz", abbreviation: "UTA", city: "Utah", conference: "West", aliases: ["jazz", "uta", "utah"] },
  { id: 30, name: "Wizards", fullName: "Washington Wizards", abbreviation: "WAS", city: "Washington", conference: "East", aliases: ["wizards", "wiz", "was", "washington", "dc"] },
];

/**
 * Resolve a user's text input to an NBA team.
 * Tries exact alias match first, then substring matching.
 * Returns undefined if no match found.
 */
export function resolveTeam(input: string): NBATeam | undefined {
  const query = input.trim().toLowerCase();

  if (!query) return undefined;

  // Exact alias match
  const exactMatch = NBA_TEAMS.find((team) =>
    team.aliases.some((alias) => alias === query)
  );
  if (exactMatch) return exactMatch;

  // Abbreviation match (case-insensitive)
  const abbrMatch = NBA_TEAMS.find(
    (team) => team.abbreviation.toLowerCase() === query
  );
  if (abbrMatch) return abbrMatch;

  // Substring match on full name
  const substringMatch = NBA_TEAMS.find(
    (team) =>
      team.fullName.toLowerCase().includes(query) ||
      query.includes(team.name.toLowerCase())
  );
  if (substringMatch) return substringMatch;

  return undefined;
}
