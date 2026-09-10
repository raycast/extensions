// Section.matches holds { match, league } pairs, so the favorites section's rows
// carry their own league and matches.tsx needs no leagueById map.
import type { Match, MatchDayLeague } from "./fotmob";
import type { Favorites } from "./store";

export type MatchState = "live" | "finished" | "cancelled" | "scheduled";
export type Mode = "all" | "favorites";

/** "20260910" in local time. */
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Local-midnight safe: day arithmetic that survives DST. */
export function shiftDay(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

export function dayLabel(d: Date): string {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return day.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function statusOf(m: Match): MatchState {
  if (m.status.cancelled) return "cancelled";
  if (m.status.finished) return "finished";
  if (m.status.started) return "live";
  return "scheduled";
}

export function hasFavoriteTeam(m: Match, favs: Favorites): boolean {
  return favs.teams.some((t) => t.id === m.home.id || t.id === m.away.id);
}

export function isFavoriteLeague(
  league: MatchDayLeague,
  favs: Favorites,
): boolean {
  return favs.leagues.some(
    (l) => l.id === league.primaryId || l.id === league.parentLeagueId,
  );
}

export function isFavoriteMatch(
  m: Match,
  league: MatchDayLeague,
  favs: Favorites,
): boolean {
  return hasFavoriteTeam(m, favs) || isFavoriteLeague(league, favs);
}

export type SectionMatch = { match: Match; league: MatchDayLeague };
export type Section = { key: string; title: string; matches: SectionMatch[] };

// FotMob leaves internalRank at 0 on unranked leagues and gives a localRank only
// to the day's headline competitions, so localRank wins, then internalRank.
function rankOf(l: MatchDayLeague): number {
  return l.localRank ?? 1e6 + (l.internalRank || 1e6);
}

export function leagueTitle(l: MatchDayLeague): string {
  return l.parentLeagueName && l.parentLeagueName !== l.name
    ? `${l.parentLeagueName} · ${l.name}`
    : l.name;
}

/** Same order sections appear in: FotMob's headline rank, then name. */
export function sortLeagues(leagues: MatchDayLeague[]): MatchDayLeague[] {
  return [...leagues].sort(
    (a, b) => rankOf(a) - rankOf(b) || a.name.localeCompare(b.name),
  );
}

/**
 * mode "all":       [★ Teams?, ...★ favorite leagues, ...remaining leagues]
 * mode "favorites": [★ Teams?, ...★ favorite leagues]
 * A favorite-team match also stays in its own league section; favorite
 * leagues are pinned to the top rather than duplicated.
 */
export function buildSections(
  leagues: MatchDayLeague[],
  favs: Favorites,
  mode: Mode,
): Section[] {
  const ordered = sortLeagues(leagues);
  const byTime = (a: SectionMatch, b: SectionMatch) =>
    a.match.timeTS - b.match.timeTS;
  const pairs = (l: MatchDayLeague) =>
    l.matches.map((match) => ({ match, league: l })).sort(byTime);
  const section = (l: MatchDayLeague, star: boolean): Section => ({
    key: String(l.id),
    title: star ? `★ ${leagueTitle(l)}` : leagueTitle(l),
    matches: pairs(l),
  });

  const teams = ordered
    .flatMap(pairs)
    .filter((p) => hasFavoriteTeam(p.match, favs))
    .sort(byTime);
  const favLeagues = ordered.filter((l) => isFavoriteLeague(l, favs));
  const rest = ordered.filter((l) => !isFavoriteLeague(l, favs));

  return [
    ...(teams.length
      ? [{ key: "teams", title: "★ Teams", matches: teams }]
      : []),
    ...favLeagues.map((l) => section(l, true)),
    ...(mode === "all" ? rest.map((l) => section(l, false)) : []),
  ];
}
