import { getApplications } from "@raycast/api";
import { getUsage } from "../lib/client";
import { percent } from "../lib/format";

type Input = {
  /** Length of the period in days, 1 to 90: 1 is today, 7 the last week, 30 the last month. Defaults to 7. */
  days?: number;
};

const TOP_APPS = 25;

export default async function tool({ days = 7 }: Input) {
  const [usage, installed] = await Promise.all([getUsage(Math.round(days)), getApplications()]);
  const name = (bundleId: string) => installed.find((a) => a.bundleId === bundleId)?.name ?? bundleId;
  return {
    periodDays: usage.days,
    total: {
      typedWords: usage.total.typedWords,
      dictatedWords: usage.total.dictatedWords,
      dictationSharePercent: percent(usage.total.share),
    },
    perDay: usage.daily.map((d) => ({
      date: d.date.slice(0, 10),
      typedWords: d.typedWords,
      dictatedWords: d.dictatedWords,
      dictationSharePercent: percent(d.share),
    })),
    apps: usage.apps.slice(0, TOP_APPS).map((a) => ({
      app: name(a.bundleID),
      typedWords: a.typedWords,
      dictatedWords: a.dictatedWords,
      dictationSharePercent: percent(a.share),
      typingRuns: a.typingRuns,
      reminders: a.reminders,
      remindersFollowed: a.remindersFollowed,
    })),
  };
}
