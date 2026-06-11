import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { createApiClient } from "./api";
import type { UserStats } from "./api/stats-client";
import { CommandShell, type CommandShellContext } from "./core/command-shell";

function buildProgressBar(stats: UserStats): string {
  const total = stats.totalItems;
  if (total === 0) return "No items yet";

  const barWidth = 20;
  const inboxChars = Math.round((stats.inboxCount / total) * barWidth);
  const newChars = Math.round((stats.newCount / total) * barWidth);
  const learningChars = Math.round((stats.learningCount / total) * barWidth);
  const masteredChars = barWidth - inboxChars - newChars - learningChars;

  return (
    "⬜".repeat(Math.max(0, inboxChars)) +
    "🟦".repeat(Math.max(0, newChars)) +
    "🟨".repeat(Math.max(0, learningChars)) +
    "🟩".repeat(Math.max(0, masteredChars))
  );
}

function getDueEmoji(dueCount: number): string {
  if (dueCount === 0) return "🟢";
  if (dueCount > 20) return "🔴";
  if (dueCount > 10) return "🟡";
  return "🟠";
}

function build7DayChart(history: { date: string; sessionCount: number }[]): string {
  const historyMap = new Map(history.map((d) => [d.date, d.sessionCount]));
  const today = new Date();

  const last7: { dayName: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    last7.push({ dayName, count: historyMap.get(key) ?? 0 });
  }

  const maxSessions = Math.max(...last7.map((d) => d.count), 1);
  const rows = last7.map((day) => {
    const barLength = Math.round((day.count / maxSessions) * 15);
    const bar = "█".repeat(barLength) || "·";
    const count = String(day.count).padStart(2);
    return `${day.dayName}  ${bar} ${count}`;
  });

  return "```\n" + rows.join("\n") + "\n```";
}

function buildContributionGrid(history: { date: string; sessionCount: number }[]): string {
  const historyMap = new Map(history.map((d) => [d.date, d.sessionCount]));

  const today = new Date();
  const days: { date: Date; count: number }[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, count: historyMap.get(key) ?? 0 });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  // Use double-width block chars in a code block for square-ish cells
  function intensityCell(count: number): string {
    if (count === 0) return "··";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "░░";
    if (ratio <= 0.5) return "▒▒";
    if (ratio <= 0.75) return "▓▓";
    return "██";
  }

  // GitHub-style: rows = days of week (Mon–Sun), columns = weeks
  const firstDay = days[0].date;
  const firstDayOfWeek = firstDay.getDay(); // 0=Sun
  const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - mondayOffset);

  const countMap = new Map<string, number>();
  for (const d of days) {
    countMap.set(d.date.toISOString().slice(0, 10), d.count);
  }

  const lastDay = days[days.length - 1].date;
  const totalGridDays = Math.ceil((lastDay.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const numWeeks = Math.ceil(totalGridDays / 7);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const rows: string[] = [];

  for (let row = 0; row < 7; row++) {
    let line = dayLabels[row] + " ";
    for (let week = 0; week < numWeeks; week++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + week * 7 + row);
      const key = d.toISOString().slice(0, 10);
      const count = countMap.get(key);
      line += count !== undefined ? intensityCell(count) + " " : "   ";
    }
    rows.push(line);
  }

  const activeDays = days.filter((d) => d.count > 0).length;
  const totalSessions = days.reduce((sum, d) => sum + d.count, 0);

  const grid = "```\n" + rows.join("\n") + "\n```";

  return (
    grid +
    `\n\n· None  ░ Low  ▒ Medium  ▓ High  █ Max` +
    `\n\n${activeDays} active days · ${totalSessions} total sessions`
  );
}

function buildMarkdown(stats: UserStats): string {
  const dueCount = stats.dueForReviewCount ?? 0;
  const sections: string[] = [];

  sections.push(`# Learning Stats`);

  // Progress
  sections.push(`### Progress (${stats.learningProgressPercent}%)`);
  sections.push(buildProgressBar(stats));
  sections.push(
    `⬜ Inbox: **${stats.inboxCount}** · 🟦 New: **${stats.newCount}** · 🟨 Learning: **${stats.learningCount}** · 🟩 Mastered: **${stats.masteredCount}**`,
  );
  sections.push(`${getDueEmoji(dueCount)} Due for review: **${dueCount}**`);

  sections.push(`---`);

  // Summary
  sections.push(`### Summary`);
  sections.push(
    `🔥 Streak: **${stats.trainingStreak} days**\n\n🏋️ Today: **${stats.trainingsToday} sessions**\n\n✅ Total trainings: **${stats.totalTrainings}**\n\n📖 Total items: **${stats.totalItems}**`,
  );

  if (stats.dailyTrainingHistory?.length) {
    // 7-day bar chart
    sections.push(`---`);
    sections.push(`### Last 7 Days`);
    sections.push(build7DayChart(stats.dailyTrainingHistory));

    // 60-day contribution grid
    sections.push(`---`);
    sections.push(`### Last 60 Days`);
    sections.push(buildContributionGrid(stats.dailyTrainingHistory));
  }

  return sections.join("\n\n");
}

function ViewStatsContent({ currentLanguage }: CommandShellContext) {
  const { data: stats, isLoading } = useCachedPromise(
    async (langCode: string) => {
      const client = createApiClient();
      return client.stats.getStats(langCode);
    },
    [currentLanguage.languageCode],
    { keepPreviousData: true },
  );

  return (
    <Detail
      navigationTitle={`Stats — ${currentLanguage.languageName}`}
      isLoading={isLoading}
      markdown={stats ? buildMarkdown(stats) : ""}
    />
  );
}

export default function ViewStats() {
  return <CommandShell>{(context) => <ViewStatsContent {...context} />}</CommandShell>;
}
