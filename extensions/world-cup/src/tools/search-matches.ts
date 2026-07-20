import {
  FIFA_COMPETITION,
  filterMatches,
  getMatches,
  matchScore,
  matchStage,
  matchState,
  matchVenue,
  teamCode,
  teamName,
  type Match,
  type Team,
} from "../lib/worldcup";
import { clamp } from "../utils";

type Input = {
  /**
   * Country names or FIFA tricodes to search for, separated by commas. Examples: "Brazil", "USA", "Brazil, United States".
   */
  countries?: string;
  /**
   * How country filters are applied. Use "all" when the user asks when countries play each other.
   * Use "any" when the user asks for matches involving any listed country.
   */
  mode?: string;
  /**
   * Match status to search. Use "upcoming" for "next match" questions, "finished" for results,
   * "live" for current matches, and "all" when the user asks for the whole schedule.
   */
  status?: string;
  /**
   * Only return matches on or after this ISO 8601 date/time.
   */
  fromDate?: string;
  /**
   * Maximum number of matches to return. Use 1 for a "next match" answer.
   */
  limit?: number;
};

/**
 * Search FIFA World Cup 2026 matches by country, country combination, and status.
 */
export default async function tool(input: Input) {
  const matches = await getMatches();
  const countries = parseCountries(input.countries);
  const mode = parseMode(input.mode) ?? (countries.length > 1 ? "all" : "any");
  const status = parseStatus(input.status);
  const {
    matches: filteredMatches,
    resolvedCountries,
    unresolvedCountries,
  } = filterMatches(matches, {
    countries,
    mode,
    status,
  });
  const fromTime = input.fromDate ? Date.parse(input.fromDate) : undefined;
  const limit = clamp(input.limit ?? (status === "upcoming" ? 5 : 10), 1, 20);
  const candidateMatches = filteredMatches.filter((match) =>
    fromTime ? new Date(match.Date).getTime() >= fromTime : true,
  );
  const results = candidateMatches.slice(0, limit).map(serializeMatch);

  return {
    competition: FIFA_COMPETITION,
    query: {
      countries,
      mode,
      status,
      fromDate: input.fromDate,
      limit,
    },
    resolvedCountries,
    unresolvedCountries,
    totalMatches: candidateMatches.length,
    returnedMatches: results.length,
    matches: results,
    note:
      results.length === 0
        ? "No matches were found for the requested country combination and status in the currently published FIFA schedule."
        : undefined,
  };
}

function serializeMatch(match: Match) {
  const score = matchScore(match);

  return {
    id: match.IdMatch,
    dateUtc: match.Date,
    localDate: new Date(match.Date).toLocaleString(),
    status: matchState(match),
    stage: matchStage(match),
    venue: matchVenue(match),
    home: serializeTeam(match.Home),
    away: serializeTeam(match.Away),
    score: matchState(match) === "pre" ? undefined : { home: score.home ?? 0, away: score.away ?? 0 },
  };
}

function serializeTeam(team: Team | null) {
  if (!team) return { code: undefined, name: "TBD" };

  return {
    code: teamCode(team),
    name: teamName(team),
  };
}

function parseCountries(value: string | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((country) => country.trim())
      .filter(Boolean) ?? []
  );
}

function parseMode(value: string | undefined): "any" | "all" | undefined {
  if (value === "any" || value === "all") return value;
  return undefined;
}

function parseStatus(value: string | undefined): "all" | "upcoming" | "live" | "finished" {
  if (value === "all" || value === "upcoming" || value === "live" || value === "finished") return value;
  return "upcoming";
}
