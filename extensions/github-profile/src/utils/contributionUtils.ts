import { format } from "date-fns";
import { ContributionDay } from "../api/github";

/**
 * Creates a base64 representation of the contribution heatmap for embedding in markdown
 */
export function generateContributionSVG(
  weeks: Array<{ contributionDays: ContributionDay[] }>,
  appearance: string = "light",
): string {
  // SVG generation constants
  const cellSize = 10;
  const cellMargin = 2;
  const headerHeight = 20;
  const width = weeks.length * (cellSize + cellMargin) + cellMargin;
  const height = 7 * (cellSize + cellMargin) + headerHeight;

  // Define color schemes for light and dark modes
  const lightModeColors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const darkModeColors = ["#25252580", "#0e4429", "#006d32", "#26a641", "#39d353"];

  const levelColors = appearance === "dark" ? darkModeColors : lightModeColors;
  const textColor = appearance === "dark" ? "#7d8590" : "#24292f";

  // Create SVG header
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Add month labels
  let previousMonth = -1;
  weeks.forEach((week, weekIndex) => {
    if (week.contributionDays.length === 0) return;

    const firstDay = new Date(week.contributionDays[0].date);
    const currentMonth = firstDay.getMonth();

    // Check if this week contains the first day of a month
    const isNewMonth = currentMonth !== previousMonth;
    const isFirstWeek = weekIndex === 0;

    if (isNewMonth || isFirstWeek) {
      const monthLabelX = weekIndex * (cellSize + cellMargin) + cellSize / 2;
      svg += `<text x="${monthLabelX}" y="10" font-family="Arial" font-size="10" 
        fill="${textColor}" text-anchor="middle">${format(firstDay, "MMM")}</text>`;
      previousMonth = currentMonth;
    }
  });

  // Add day cells
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex];
    for (let dayIndex = 0; dayIndex < week.contributionDays.length; dayIndex++) {
      const day = week.contributionDays[dayIndex];
      const x = weekIndex * (cellSize + cellMargin) + cellMargin;
      const y = dayIndex * (cellSize + cellMargin) + headerHeight;

      svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${
        levelColors[day.level]
      }" rx="2" ry="2"><title>${day.count} contribution(s) on ${day.date}</title></rect>`;
    }
  }

  svg += "</svg>";

  // Return the SVG as a data URI
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
