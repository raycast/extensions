import type { Fixture } from "../api/types";

/**
 * Provisional bonus points from BPS for fixtures that have kicked off but whose bonus
 * is not yet confirmed. Follows FPL's tie rules: a tie for first gives both 3 and the
 * next player 1; a tie for second gives both 2 and nobody 1; a tie for third gives both 1.
 */
export function provisionalBonus(fixtures: Fixture[]): Map<number, number> {
  const bonus = new Map<number, number>();
  for (const fixture of fixtures) {
    if (!fixture.started || fixture.finished) continue;
    const stat = (id: string) => fixture.stats.find((s) => s.identifier === id);
    const confirmed = stat("bonus");
    if (confirmed && confirmed.h.length + confirmed.a.length > 0) continue;
    const bps = stat("bps");
    if (!bps) continue;

    const ranked = [...bps.h, ...bps.a].sort((a, b) => b.value - a.value).slice(0, 5);
    const awards = [3, 2, 1];
    let i = 0;
    while (i < ranked.length && awards.length) {
      const tied = ranked.filter((p) => p.value === ranked[i].value);
      const award = awards[0];
      for (const p of tied) bonus.set(p.element, award);
      awards.splice(0, tied.length);
      i += tied.length;
    }
  }
  return bonus;
}
