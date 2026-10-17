import { MenuBarExtra, getPreferenceValues, open, Icon, Image } from "@raycast/api";
import { useEffect, useState } from "react";

interface ContributionDay {
  date: string;
  contributionCount: number;
}

interface StreakResult {
  hasCommitToday: boolean;
  streakAlive: boolean;
  count: number;
  capped: boolean;
  todayCount: number;
  totalLastWeek: number;
}

interface Milestone {
  days: number;
  icon: Icon | Image.ImageLike;
  label?: string;
  exactOnly?: boolean;
  exactLabel?: boolean;
}

const SVG_TINT = { light: "#000000", dark: "#ffffff" };
const GITHUB_CONTRIBUTIONS_START_YEAR = 2008;
const HISTORICAL_FETCH_BATCH_SIZE = 3;

const MILESTONES: Milestone[] = [
  { days: 365, icon: Icon.Rocket, label: "1y", exactLabel: true },
  {
    days: 314,
    icon: { source: "pi.svg", tintColor: SVG_TINT },
    label: "314",
    exactOnly: true,
  },
  { days: 100, icon: Icon.Trophy },
  { days: 30, icon: Icon.Crown },
  { days: 10, icon: Icon.Star },
];

function getMilestone(days: number): Milestone | null {
  return MILESTONES.find((m) => (m.exactOnly ? days === m.days : days >= m.days)) ?? null;
}

const CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

function flattenWeeks(weeks: { contributionDays: ContributionDay[] }[]): ContributionDay[] {
  const byDate = new Map<string, ContributionDay>();
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      byDate.set(day.date, day);
    }
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function calculateStreak(weeks: { contributionDays: ContributionDay[] }[]): StreakResult {
  const allDays = flattenWeeks(weeks);

  const today = new Date().toLocaleDateString("sv");
  const todayEntry = allDays.find((d) => d.date === today);
  const hasCommitToday = todayEntry ? todayEntry.contributionCount > 0 : false;
  const todayCount = todayEntry?.contributionCount ?? 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString("sv");
  const totalLastWeek = allDays
    .filter((d) => d.date >= sevenDaysAgoStr && d.date <= today)
    .reduce((sum, d) => sum + d.contributionCount, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("sv");
  const yesterdayEntry = allDays.find((d) => d.date === yesterdayStr);
  const hadCommitYesterday = yesterdayEntry ? yesterdayEntry.contributionCount > 0 : false;

  if (hasCommitToday) {
    let streak = 0;
    let skipped = 0;
    for (const day of allDays) {
      if (day.date > today) {
        skipped++;
        continue;
      }
      if (day.contributionCount > 0) streak++;
      else break;
    }
    const capped = streak === allDays.length - skipped;
    return {
      hasCommitToday: true,
      streakAlive: true,
      count: streak,
      capped,
      todayCount,
      totalLastWeek,
    };
  } else if (hadCommitYesterday) {
    let streak = 0;
    let skipped = 0;
    for (const day of allDays) {
      if (day.date >= today) {
        skipped++;
        continue;
      }
      if (day.contributionCount > 0) streak++;
      else break;
    }
    const capped = streak === allDays.length - skipped;
    return {
      hasCommitToday: false,
      streakAlive: true,
      count: streak,
      capped,
      todayCount,
      totalLastWeek,
    };
  } else {
    let snowflakeDays = 0;
    for (const day of allDays) {
      if (day.date > today) continue;
      if (day.contributionCount === 0) snowflakeDays++;
      else break;
    }
    return {
      hasCommitToday: false,
      streakAlive: false,
      count: Math.max(snowflakeDays, 1),
      capped: false,
      todayCount,
      totalLastWeek,
    };
  }
}

function getPreviousYearRange(from: Date): { from: Date; to: Date } | null {
  const to = new Date(from);
  to.setDate(to.getDate() - 1);

  if (to.getFullYear() < GITHUB_CONTRIBUTIONS_START_YEAR) {
    return null;
  }

  const rangeFrom = new Date(to);
  rangeFrom.setDate(rangeFrom.getDate() - 364);

  return {
    from: rangeFrom,
    to,
  };
}

export default function CommitStreak() {
  const preferences = getPreferenceValues<Preferences.CommitStreak>();
  const [streak, setStreak] = useState<StreakResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchYear(from: Date, to: Date): Promise<{ contributionDays: ContributionDay[] }[]> {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: {
          username: preferences.username,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = (await response.json()) as {
      errors?: { message: string }[];
      data?: {
        user?: {
          contributionsCollection?: {
            contributionCalendar?: {
              weeks: { contributionDays: ContributionDay[] }[];
            };
          };
        };
      };
    };
    if (data.errors) throw new Error(data.errors[0]?.message ?? "Unknown error");
    const weeks = data.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
    if (!weeks) throw new Error("Could not read contribution data. Check your username.");
    return weeks;
  }

  async function fetchContributions() {
    setIsLoading(true);
    setError(null);

    try {
      const to = new Date();
      let from = new Date();
      from.setDate(from.getDate() - 364);

      let allWeeks = await fetchYear(from, to);
      let result = calculateStreak(allWeeks);

      while (result.capped) {
        const ranges: { from: Date; to: Date }[] = [];

        for (let i = 0; i < HISTORICAL_FETCH_BATCH_SIZE; i++) {
          const range = getPreviousYearRange(from);
          if (!range) break;

          ranges.push(range);
          from = range.from;
        }

        if (ranges.length === 0) break;

        const previousYears = await Promise.all(ranges.map((range) => fetchYear(range.from, range.to)));
        const prevWeeks = previousYears.flat();
        if (prevWeeks.length === 0) break;

        allWeeks = [...prevWeeks, ...allWeeks];
        result = calculateStreak(allWeeks);
      }

      setStreak(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchContributions();
  }, []);

  if (isLoading) {
    return <MenuBarExtra icon={Icon.Clock} isLoading={true} />;
  }

  if (error) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} title="!">
        <MenuBarExtra.Item title={`Error: ${error}`} />
        <MenuBarExtra.Item title="Refresh" onAction={fetchContributions} />
        <MenuBarExtra.Item title="Open Token Settings" onAction={() => open("https://github.com/settings/tokens")} />
      </MenuBarExtra>
    );
  }

  if (!streak) return null;

  const displayCount = streak.streakAlive ? streak.count : null;
  const milestone = displayCount !== null ? getMilestone(displayCount) : null;
  const icon =
    displayCount !== null
      ? (milestone?.icon ?? Icon.Bolt)
      : streak.count >= 7
        ? Icon.EmojiSad
        : { source: "snowflake.svg", tintColor: SVG_TINT };
  const resolveLabel = (m: Milestone | null, count: number) => {
    if (!m) return `${count}`;
    if (m.exactLabel && count !== m.days) return `${count}`;
    return m.label ?? `${count}`;
  };
  const label = displayCount !== null ? resolveLabel(milestone, displayCount) : `${streak.count}`;

  const statusTitle = streak.hasCommitToday
    ? `🔥 ${streak.count}-day streak`
    : streak.streakAlive
      ? `🔥 ${streak.count}-day streak — commit today to keep it!`
      : streak.count >= 7
        ? `😢 ${streak.count} days without commits`
        : `❄️ ${streak.count} day${streak.count !== 1 ? "s" : ""} without commits`;

  const todayTitle = streak.hasCommitToday
    ? `Today: ${streak.todayCount} contribution${streak.todayCount !== 1 ? "s" : ""}`
    : "No contributions today";

  return (
    <MenuBarExtra icon={icon} title={label}>
      <MenuBarExtra.Item title={statusTitle} />
      <MenuBarExtra.Item title={todayTitle} />
      <MenuBarExtra.Item title={`Last 7 days: ${streak.totalLastWeek} contributions`} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Open Profile" onAction={() => open(`https://github.com/${preferences.username}`)} />
      <MenuBarExtra.Item title="Refresh" onAction={fetchContributions} />
    </MenuBarExtra>
  );
}
