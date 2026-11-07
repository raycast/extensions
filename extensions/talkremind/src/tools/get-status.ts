import { getApplications } from "@raycast/api";
import { getState, getStats } from "../lib/client";
import { percent } from "../lib/format";
import { describePause } from "../lib/pause";

export default async function tool() {
  const [state, stats, apps] = await Promise.all([getState(), getStats(), getApplications()]);
  const name = (bundleId: string) => apps.find((a) => a.bundleId === bundleId)?.name ?? bundleId;
  const totals = (t: { dictatedWords: number; typedWords: number; share?: number }) => ({
    dictatedWords: t.dictatedWords,
    typedWords: t.typedWords,
    dictationSharePercent: percent(t.share),
  });
  return {
    paused: state.paused,
    pausedUntil: state.pausedUntil ?? null,
    pause: state.paused ? describePause(state) : null,
    excludedApps: state.excludedApps.map(name),
    today: totals(stats.today),
    week: totals(stats.week),
    last7Days: stats.days.map((d) => ({ date: d.date.slice(0, 10), dictationSharePercent: percent(d.share) })),
    timeSavedThisWeekMinutes:
      stats.timeSavedThisWeekSeconds === undefined ? null : Math.round(stats.timeSavedThisWeekSeconds / 60),
    remindedToday: stats.remindedToday.map((r) => ({ app: name(r.bundleID), count: r.count })),
  };
}
