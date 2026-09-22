import { List } from "@raycast/api";
import { formatDay, formatDuration } from "./format.ts";
import type { Preferences } from "./prefs.ts";
import { SHIELDS_PER_WEEK } from "./streaks.ts";
import { tierFor, tiersFor } from "./theme.ts";
import type { Stats } from "./types.ts";

type Entry = { section: string; title: string; icon: string; accessory?: string; markdown: string };

export function HowItWorks({ stats, prefs }: { stats: Stats; prefs: Preferences }) {
  const tiers = tiersFor(prefs.leagues);
  const { tier, next } = tierFor(stats.weekMinutes, tiers);
  const weekStart = prefs.weekStartsOn === 0 ? "Sunday" : "Monday";
  const toNext = next ? next.min - stats.weekMinutes : 0;
  const delta = stats.weekMinutes - stats.lastWeekMinutes;
  const goal = formatDuration(prefs.dailyGoal);
  const since = stats.firstSessionAt ? formatDay(stats.firstSessionAt) : null;

  const ladder = ["| League | Focused this week |", "| --- | --- |"]
    .concat(tiers.map((t) => `| ${t.glyph} ${t.name}${t === tier ? " (you)" : ""} | ${formatDuration(t.min)} |`))
    .join("\n");

  const entries: Entry[] = [
    {
      section: "Leagues",
      title: "League",
      icon: "🏆",
      accessory: `${tier.glyph} ${tier.name}`,
      markdown: `# League\n\nYour tier this week, from minutes focused since ${weekStart}. Resets every week.\n\n${ladder}`,
    },
    ...tiers.map((t) => ({
      section: "Leagues",
      title: t.name,
      icon: t.glyph,
      accessory: formatDuration(t.min),
      markdown: `# ${t.glyph} ${t.name}\n\n${
        t.min === 0 ? "Every week starts here." : `${formatDuration(t.min)} or more this week.`
      } ${
        t === tier
          ? "You are here."
          : t.min > stats.weekMinutes
            ? `${formatDuration(t.min - stats.weekMinutes)} to go.`
            : "Passed."
      }`,
    })),
    {
      section: "Streak",
      title: "Streak",
      icon: "🔥",
      accessory: stats.currentStreak ? `${stats.currentStreak} days` : undefined,
      markdown: `# Streak\n\nDays in a row with at least one finished session. An empty day spends a shield.${
        stats.bestStreak > stats.currentStreak ? ` Best: ${stats.bestStreak} days.` : ""
      }`,
    },
    {
      section: "Streak",
      title: "Shield",
      icon: "🛡️",
      accessory: `${stats.shieldsLeft} left`,
      markdown: `# Shield\n\n${SHIELDS_PER_WEEK} a week, refilled every ${weekStart}. An empty day spends a shield instead of ending your streak. Shielded days keep the streak but do not add to it. ${stats.shieldsLeft} of ${SHIELDS_PER_WEEK} left this week.`,
    },
    {
      section: "Quests",
      title: next ? `Reach ${next.name}` : "Top league",
      icon: next?.glyph ?? tier.glyph,
      accessory: next ? formatDuration(toNext) : undefined,
      markdown: next
        ? `# Reach ${next.glyph} ${next.name}\n\nYou need ${formatDuration(toNext)} more this week to move up a tier.`
        : `# ${tier.glyph} ${tier.name} held\n\nThere is no tier above ${tier.name}. Hold it by keeping ${formatDuration(tier.min)} this week.`,
    },
    {
      section: "Quests",
      title: "Perfect week",
      icon: "⭐",
      accessory: `5 days at ${goal}`,
      markdown: `# Perfect week\n\nFive days at ${goal} or more. Change the goal in Settings.`,
    },
    {
      section: "Quests",
      title: "Beat last week",
      icon: "🏁",
      accessory: delta > 0 ? `${formatDuration(delta)} ahead` : `${formatDuration(1 - delta)} to go`,
      markdown: `# Beat last week\n\nMore focused time than all of last week. Last week: ${formatDuration(stats.lastWeekMinutes)}.`,
    },
    {
      section: "Calendar",
      title: "Calendar shading",
      icon: "🌗",
      markdown: `# Calendar shading\n\nDarker (or brighter, in dark mode) means a longer day. Shades are relative to your own record. Each cell shows its minutes.`,
    },
    {
      section: "History",
      title: "On record since",
      icon: "🗓️",
      accessory: since ?? "your first session",
      markdown: `# On record\n\nCounting since ${since ?? "your first session"}. Earlier sessions were never logged. Nothing leaves your Mac.`,
    },
  ];

  const sections = [...new Set(entries.map((e) => e.section))];

  return (
    <List isShowingDetail searchBarPlaceholder="Search the glossary">
      {sections.map((section) => (
        <List.Section key={section} title={section}>
          {entries
            .filter((e) => e.section === section)
            .map((e) => (
              <List.Item
                key={e.title}
                icon={e.icon}
                title={e.title}
                keywords={[e.section]}
                accessories={e.accessory ? [{ text: e.accessory }] : undefined}
                detail={<List.Item.Detail markdown={e.markdown} />}
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
