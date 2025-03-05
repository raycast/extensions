import { environment } from "@raycast/api";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import { ContributionDay } from "../api/github";

/**
 * Creates a base64 representation of the contribution heatmap for embedding in markdown
 */
export function generateContributionSVG(weeks: Array<{ contributionDays: ContributionDay[] }>): string {
  // SVG generation constants
  const cellSize = 10;
  const cellMargin = 2;
  const headerHeight = 20;
  const width = weeks.length * (cellSize + cellMargin) + cellMargin;
  const height = 7 * (cellSize + cellMargin) + headerHeight;

  const levelColors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

  // Create SVG header
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Add month labels
  const months = new Map<number, string>();
  weeks.forEach((week, i) => {
    if (week.contributionDays.length > 0) {
      const date = new Date(week.contributionDays[0].date);
      const month = date.getMonth();
      // Add month label if it's the first day of month
      if (!months.has(month)) {
        months.set(month, format(date, "MMM"));
        svg += `<text x="${i * (cellSize + cellMargin)}" y="10" font-family="Arial" font-size="10">${format(date, "MMM")}</text>`;
      }
    }
  });

  // Add day cells
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex];
    for (let dayIndex = 0; dayIndex < week.contributionDays.length; dayIndex++) {
      const day = week.contributionDays[dayIndex];
      const x = weekIndex * (cellSize + cellMargin) + cellMargin;
      const y = dayIndex * (cellSize + cellMargin) + headerHeight;

      svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${levelColors[day.level]}" rx="2" ry="2"><title>${day.count} contribution(s) on ${day.date}</title></rect>`;
    }
  }

  svg += "</svg>";

  // Create a cached SVG file
  const cacheDir = path.join(environment.assetsPath, "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const svgPath = path.join(cacheDir, "contribution_heatmap.svg");
  fs.writeFileSync(svgPath, svg);

  // Return the file URL
  return `file://${svgPath}`;
}
