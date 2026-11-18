import { ContributionDay } from "../api/github";
import { summarizeContributions } from "./contributionStats";

export function generateContributionSVG(
  weeks: Array<{ contributionDays: ContributionDay[] }>,
  appearance: string = "light",
  totalContributions?: number,
): string {
  const dark = appearance === "dark";
  const colors = dark
    ? ["#252b33", "#0e4429", "#006d32", "#26a641", "#39d353"]
    : ["#e8edf2", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const background = dark ? "#14181e" : "#f6f8fa";
  const surface = dark ? "#1c222b" : "#ffffff";
  const text = dark ? "#edf2f7" : "#1f2937";
  const muted = dark ? "#9ba9b9" : "#667587";
  const width = Math.max(720, weeks.length * 12 + 74);
  const height = 270;
  const stats = summarizeContributions(weeks);
  const number = (value: number) => value.toLocaleString("en-US");
  const duration = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;
  const cards = [
    ["Past year", number(totalContributions ?? stats.total)],
    ["Last 30 days", number(stats.last30Days)],
    ["Current streak", duration(stats.currentStreak)],
    ["Longest streak", duration(stats.longestStreak)],
  ];
  const cardWidth = (width - 48 - 24) / 4;
  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>GitHub contribution activity</title>
    <rect width="${width}" height="${height}" rx="16" fill="${background}"/>
    <g font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif">
    <text x="24" y="30" font-size="16" font-weight="600" fill="${text}">Contribution activity</text>
    <text x="${width - 24}" y="30" text-anchor="end" font-size="12" fill="${muted}">${stats.activeDays} active ${stats.activeDays === 1 ? "day" : "days"}</text>`;

  cards.forEach(([label, value], index) => {
    const x = 24 + index * (cardWidth + 8);
    svg += `<rect x="${x}" y="48" width="${cardWidth}" height="62" rx="10" fill="${surface}"/>
      <text x="${x + 12}" y="68" font-size="11" fill="${muted}">${label}</text>
      <text x="${x + 12}" y="95" font-size="23" font-weight="600" fill="${text}">${value}</text>`;
  });

  const monthLabels: Array<{ x: number; label: string }> = [];
  let previousMonth = -1;
  weeks.forEach((week, weekIndex) => {
    if (!week.contributionDays.length) return;
    const firstDay = new Date(week.contributionDays[0].date);
    const month = firstDay.getUTCMonth();
    if (month !== previousMonth) {
      const x = Math.min(50 + weekIndex * 12, width - 48);
      // A short first month should not overlap the following month's label.
      if (monthLabels.length && x - monthLabels[monthLabels.length - 1].x < 30) monthLabels.pop();
      monthLabels.push({ x, label: firstDay.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) });
      previousMonth = month;
    }
  });
  monthLabels.forEach(({ x, label }) => {
    svg += `<text x="${x}" y="134" font-size="10" fill="${muted}">${label}</text>`;
  });
  [
    ["Mon", 1],
    ["Wed", 3],
    ["Fri", 5],
  ].forEach(([label, row]) => {
    svg += `<text x="24" y="${152 + Number(row) * 12}" font-size="9" fill="${muted}">${label}</text>`;
  });
  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const x = 50 + weekIndex * 12;
      const y = 144 + new Date(day.date).getUTCDay() * 12;
      const fill = colors[Math.max(0, Math.min(4, day.level))];
      svg += `<rect x="${x}" y="${y}" width="9" height="9" fill="${fill}" rx="2"><title>${day.count} contributions on ${day.date}</title></rect>`;
    });
  });

  svg += `<text x="24" y="250" font-size="10" fill="${muted}">GitHub contribution calendar</text>
    <text x="${width - 160}" y="250" font-size="10" fill="${muted}">Less</text>`;
  colors.forEach((color, index) => {
    svg += `<rect x="${width - 130 + index * 12}" y="241" width="9" height="9" rx="2" fill="${color}"/>`;
  });
  svg += `<text x="${width - 62}" y="250" font-size="10" fill="${muted}">More</text></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
