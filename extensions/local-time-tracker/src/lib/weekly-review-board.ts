import { formatDuration } from "./duration";
import type { createWeeklyReview } from "./weekly-review";

type Review = ReturnType<typeof createWeeklyReview>;
const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!,
  );

function wrap(value: string, width: number, size: number): string[] {
  const lines: string[] = [];
  let line = "";
  let used = 0;
  for (const char of value) {
    const next = /^[\x20-\x7e]$/.test(char) ? size * 0.6 : size;
    if (line && (used + next > width || char === "\n")) {
      lines.push(line);
      line = "";
      used = 0;
    }
    if (char !== "\n") {
      line += char;
      used += next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function weeklyReviewBoardSvg(review: Review, today: string, appearance: "light" | "dark"): string {
  const colors =
    appearance === "dark"
      ? {
          background: "#10151e",
          card: "#1b2431",
          border: "#374456",
          text: "#eef5ff",
          muted: "#b1becf",
          accent: "#67e8b1",
        }
      : {
          background: "#f6f8fb",
          card: "#ffffff",
          border: "#cbd5e1",
          text: "#172536",
          muted: "#526275",
          accent: "#087a50",
        };
  const width = 1400;
  const days = review.days.filter((day) => day.date <= today);
  const gap = 12;
  const column = (width - 40 - gap * (days.length - 1)) / Math.max(1, days.length);
  const padding = 12;
  const content: string[] = [];
  const text = (x: number, y: number, value: string, size = 21, color = colors.text, weight = 400) => {
    content.push(
      `<text x="${x}" y="${y}" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}">${escapeXml(value)}</text>`,
    );
  };
  const heights = days.map((day, index) => {
    const x = 20 + index * (column + gap);
    const active = day.date === today;
    text(
      x + padding,
      46,
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
      32,
      active ? colors.accent : colors.text,
      600,
    );
    text(x + padding, 80, day.date.slice(5).replace("-", "/"), 25, colors.muted);
    text(x + padding, 117, formatDuration(day.seconds), 28, active ? colors.accent : colors.text, 600);
    text(x + padding, 149, `${day.completed} done`, 22, colors.muted);
    let y = 190;
    if (!day.items.length) {
      for (const line of wrap("No work recorded", column - padding * 2, 24)) {
        text(x + padding, y, line, 24, colors.muted);
        y += 30;
      }
    }
    for (const item of day.items) {
      content.push(
        `<line x1="${x + padding}" y1="${y - 18}" x2="${x + column - padding}" y2="${y - 18}" stroke="${colors.border}"/>`,
      );
      text(
        x + padding,
        y + 4,
        item.running ? "RUNNING" : item.completedOnDay ? "COMPLETED" : "WORKED",
        20,
        item.running || item.completedOnDay ? colors.accent : colors.muted,
        600,
      );
      y += 40;
      for (const line of wrap(item.title, column - padding * 2, 28)) {
        text(x + padding, y, line, 28, colors.text, 600);
        y += 36;
      }
      for (const label of [item.goalTitle, item.projectName !== item.title ? item.projectName : undefined].filter(
        (value): value is string => !!value,
      )) {
        for (const line of wrap(label, column - padding * 2, 22)) {
          text(x + padding, y, line, 22, colors.muted);
          y += 29;
        }
      }
      text(x + padding, y + 4, formatDuration(item.seconds), 24, colors.muted);
      y += 54;
    }
    return y + 20;
  });
  const height = Math.max(300, ...heights);
  const cards = days
    .map(
      (day, index) =>
        `<rect x="${20 + index * (column + gap)}" y="8" width="${column}" height="${height - 20}" rx="10" fill="${colors.card}" stroke="${day.date === today ? colors.accent : colors.border}" stroke-width="2"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${colors.background}"/>${cards}${content.join("")}</svg>`;
}

export function weeklyReviewBoardMarkdown(review: Review, today: string, appearance: "light" | "dark"): string {
  const svg = weeklyReviewBoardSvg(review, today, appearance);
  return `![Weekly Review: ${review.start} to ${review.end < today ? review.end : today}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}
