import { Fixture, Match, Score, Tour } from "./api";

export const TOUR_TITLES: Record<Tour, string> = {
  atp: "ATP",
  wta: "WTA",
  challenger: "Challenger",
  itf: "ITF",
  juniors: "Juniors",
};

/** "6-4 3-4" from the player-major per-set games arrays. */
export function formatGames(score: Score | null): string {
  if (!score || !Array.isArray(score.games) || score.games.length < 2) {
    return "";
  }
  const [p1, p2] = score.games;
  const sets: string[] = [];
  for (let i = 0; i < Math.max(p1?.length ?? 0, p2?.length ?? 0); i++) {
    sets.push(`${p1?.[i] ?? 0}-${p2?.[i] ?? 0}`);
  }
  return sets.join(" ");
}

/** "30-15" (or "TB 5-3" style points during a tiebreak) for the game in progress. */
export function formatPoints(score: Score | null): string {
  if (!score || !Array.isArray(score.points) || score.points.length < 2) {
    return "";
  }
  const [a, b] = score.points;
  if (a == null || b == null) {
    return "";
  }
  return score.is_tiebreak ? `TB ${a}-${b}` : `${a}-${b}`;
}

/**
 * True when the receiver is one point from breaking serve: receiver holds "AD",
 * or "40" while the server holds neither "40" nor "AD". Never during a tiebreak.
 */
export function isBreakPoint(score: Score | null): boolean {
  if (!score || score.is_tiebreak || score.server == null) {
    return false;
  }
  if (!Array.isArray(score.points) || score.points.length < 2) {
    return false;
  }
  const serverPoints = score.points[score.server - 1];
  const receiverPoints = score.points[2 - score.server];
  if (serverPoints == null || receiverPoints == null) {
    return false;
  }
  return receiverPoints === "AD" || (receiverPoints === "40" && serverPoints !== "40" && serverPoints !== "AD");
}

export function matchTitle(match: Match): string {
  return `${match.players.p1.name} vs ${match.players.p2.name}`;
}

export function fixtureTitle(fixture: Fixture): string {
  return `${fixture.player1_name ?? "TBD"} vs ${fixture.player2_name ?? "TBD"}`;
}

/** One-line score summary, e.g. "6-4 3-4 · 30-15". */
export function scoreSummary(score: Score | null): string {
  return [formatGames(score), formatPoints(score)].filter(Boolean).join(" · ");
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatStartTime(fixture: Fixture): string {
  if (fixture.start_time) {
    const date = new Date(fixture.start_time);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (fixture.event_date) {
    return new Date(`${fixture.event_date}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
  return "TBD";
}
