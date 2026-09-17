import { updateCommandMetadata, LocalStorage, showHUD, getPreferenceValues } from "@raycast/api";
import {
  getMatches,
  liveMatch,
  formatLine,
  goalsEnabled,
  goalHud,
  isUpcomingMatch,
  matchScore,
  teamCode,
  type Match,
} from "./lib/worldcup";

const STORE_KEY = "scores";
type ScoreMap = Record<string, { h: number; a: number }>;

/**
 * No-view background command (interval: "1m"). Two jobs:
 *   1. Rewrite its own subtitle so the live score shows under the command name.
 *   2. Diff the score against the last run and post a goal notification.
 */
export default async function Command() {
  const enabled = await goalsEnabled();
  const matches = await getMatches();

  // 1. Subtitle
  const live = liveMatch(matches);
  const next = matches.find(isUpcomingMatch);
  const subtitle = live ? formatLine(live) : next ? `Next: ${formatLine(next)}` : "No live match";
  await updateCommandMetadata({ subtitle });

  // 2. Goal detection
  const prev = JSON.parse((await LocalStorage.getItem<string>(STORE_KEY)) ?? "{}") as ScoreMap;
  const current: ScoreMap = {};
  const country = getPreferenceValues<Preferences.ScoreSubtitle>().country ?? "";

  for (const m of matches) {
    if (isUpcomingMatch(m)) continue; // nothing to diff before kickoff
    const score = matchScore(m);
    const a = score.away ?? 0;
    const h = score.home ?? 0;
    current[m.IdMatch] = { a, h };

    const was = prev[m.IdMatch];
    if (!was || !enabled) continue; // skip first sighting to avoid a flood

    if (a > was.a) await notifyGoal(m, "away", country);
    if (h > was.h) await notifyGoal(m, "home", country);
  }

  await LocalStorage.setItem(STORE_KEY, JSON.stringify(current));
}

async function notifyGoal(m: Match, side: "home" | "away", country: string) {
  const scorerCode = side === "home" ? teamCode(m.Home) : teamCode(m.Away);
  // showHUD is the store-safe way to surface a background event: a brief overlay
  // that appears even when Raycast isn't focused, no external binary required.
  await showHUD(goalHud(m, scorerCode, country));
}
