import { getDateRange, getOverlapDurationSeconds, getStartOfToday } from "./date";
import { formatDuration } from "./duration";
import { createReport } from "./reports";
import type { ActiveTimer, Project, ReportPeriod, WorkLog } from "./types";

export type DashboardDay = { date: Date; seconds: number };
export type DashboardModel = {
  title: string;
  period: string;
  totalSeconds: number;
  share: number;
  sessions: number;
  projectCount: number;
  running: boolean;
  days: DashboardDay[];
  distribution: { name: string; seconds: number }[];
};

export function getUnknownProjectIds(
  logs: WorkLog[],
  projects: Project[],
  activeTimer: ActiveTimer | null,
): Set<string> {
  const knownIds = new Set(projects.map((project) => project.id));
  const ids = logs.map((log) => log.projectId);
  if (activeTimer) ids.push(activeTimer.projectId);
  return new Set(ids.filter((id) => !knownIds.has(id)));
}

export function createDashboard(
  title: string,
  period: ReportPeriod,
  logs: WorkLog[],
  projects: Project[],
  activeTimer: ActiveTimer | null,
  now: Date,
  projectIds?: Set<string>,
): DashboardModel {
  const selectedLogs = projectIds ? logs.filter((log) => projectIds.has(log.projectId)) : logs;
  const selectedTimer = activeTimer && (!projectIds || projectIds.has(activeTimer.projectId)) ? activeTimer : null;
  const report = createReport(period, selectedLogs, projects, selectedTimer, now);
  const all = createReport(period, logs, projects, activeTimer, now);
  const range = getDateRange(period, now);
  const running = Boolean(selectedTimer && Date.parse(selectedTimer.startedAt) <= now.getTime());
  const intervals = [
    ...selectedLogs,
    ...(running ? [{ startedAt: selectedTimer!.startedAt, endedAt: now.toISOString() }] : []),
  ];
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = getStartOfToday(now);
    date.setDate(date.getDate() - 34 + index);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    // Keep today's bars consistent with the report, excluding future entries.
    const cutoff = new Date(Math.min(end.getTime(), now.getTime()));
    return {
      date,
      seconds: intervals.reduce(
        (sum, log) => sum + getOverlapDurationSeconds(log.startedAt, log.endedAt, date, cutoff),
        0,
      ),
    };
  });
  return {
    title,
    period: ({ today: "TODAY", week: "THIS WEEK", month: "THIS MONTH" } as const)[period],
    totalSeconds: report.totalSeconds,
    share: all.totalSeconds > 0 ? report.totalSeconds / all.totalSeconds : 0,
    sessions: intervals.filter(
      (log) => getOverlapDurationSeconds(log.startedAt, log.endedAt, range.start, range.end) > 0,
    ).length,
    projectCount: report.projects.length,
    running,
    days,
    distribution: report.projects.map((project) => ({ name: project.projectName, seconds: project.seconds })),
  };
}

const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
export type DashboardAppearance = "light" | "dark";
const themes = {
  dark: {
    background: "#10151e",
    border: "#26303e",
    muted: "#96a6b9",
    text: "#eef5ff",
    secondary: "#c9d6e6",
    accent: "#67e8b1",
    idle: "#6c7d92",
    empty: "#1b2431",
    bar: "#398b82",
    palette: ["#67e8b1", "#65d5ef", "#c4a7ff", "#ffd08a", "#f7a2c4"],
    levels: ["#1b2431", "#25493e", "#36755b", "#4bab7a", "#67e8b1"],
  },
  light: {
    background: "#f6f8fb",
    border: "#d5dde7",
    muted: "#526275",
    text: "#172536",
    secondary: "#35465b",
    accent: "#087a50",
    idle: "#64748b",
    empty: "#e3e9f0",
    bar: "#31937e",
    palette: ["#087a50", "#087e9c", "#7952b3", "#a76816", "#b34b7d"],
    levels: ["#e3e9f0", "#c5e8d5", "#8bc9a9", "#43a477", "#087a50"],
  },
};

export function dashboardSvg(
  model: DashboardModel,
  expanded = false,
  appearance: DashboardAppearance = "dark",
): string {
  const colors = themes[appearance];
  const palette = colors.palette;
  const visible = expanded ? model.distribution : model.distribution.slice(0, 2);
  const extraHeight = Math.max(0, visible.length - 2) * 18;
  const height = 355 + extraHeight;
  const svg: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="${height}" viewBox="0 0 440 ${height}">`,
    `<rect width="440" height="${height}" rx="18" fill="${colors.background}"/>`,
    `<rect x="0.5" y="0.5" width="439" height="${height - 1}" rx="18" fill="none" stroke="${colors.border}"/>`,
  ];
  let textIndex = 0;
  function text(
    x: number,
    y: number,
    value: string,
    size = 12,
    color = colors.muted,
    weight = "400",
    maxWidth?: number,
  ) {
    const original = value;
    let clip = "";
    if (maxWidth !== undefined) {
      // Reserve enough width for full-width characters and fallback fonts.
      const width = (char: string) => size * (/^[\x20-\x7e]$/.test(char) ? 0.65 : 1.1);
      const chars = Array.from(value);
      if (chars.reduce((sum, char) => sum + width(char), 0) > maxWidth) {
        let used = width("…");
        value = "";
        for (const char of chars) {
          if (used + width(char) > maxWidth) break;
          value += char;
          used += width(char);
        }
        value += "…";
      }
      const id = `dashboard-text-${textIndex++}`;
      svg.push(
        `<defs><clipPath id="${id}"><rect x="${x}" y="${y - size * 1.2}" width="${maxWidth}" height="${size * 1.5}"/></clipPath></defs>`,
      );
      clip = ` clip-path="url(#${id})"`;
    }
    svg.push(
      `<text x="${x}" y="${y}" font-family="Menlo,monospace" font-size="${size}" fill="${color}" font-weight="${weight}"${clip}>${maxWidth === undefined ? "" : `<title>${escapeXml(original)}</title>`}${escapeXml(value)}</text>`,
    );
  }
  function rect(x: number, y: number, width: number, height: number, color: string, radius = 4) {
    svg.push(
      `<rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${height}" rx="${radius}" fill="${color}"/>`,
    );
  }
  text(24, 25, `WORK / ${model.period}`, 12, colors.accent);
  svg.push(`<circle cx="330" cy="21" r="3" fill="${model.running ? colors.accent : colors.idle}"/>`);
  text(340, 25, model.running ? "RUNNING" : "IDLE", 11);
  text(24, 53, model.title, 20, colors.text, "600", 392);
  text(24, 102, formatDuration(model.totalSeconds), 38, colors.text, "700");
  text(24, 123, "TRACKED TIME", 10);
  text(266, 81, `${model.sessions} ${model.sessions === 1 ? "session" : "sessions"}`, 12, colors.secondary);
  text(266, 102, `${model.projectCount} ${model.projectCount === 1 ? "project" : "projects"}`, 12, colors.secondary);
  text(266, 123, `${Math.round(model.share * 100)}% of total`, 12, colors.accent);
  rect(24, 136, 392, 1, colors.border, 0);
  text(24, 157, "PROJECT MIX", 11);
  let offset = 24;
  model.distribution.forEach((item, index) => {
    const width = model.totalSeconds ? (item.seconds / model.totalSeconds) * 392 : 0;
    rect(offset, 167, width, 8, palette[index % palette.length], 0);
    offset += width;
  });
  if (!model.distribution.length) rect(24, 167, 392, 8, colors.border);
  visible.forEach((item, index) => {
    const y = 193 + index * 18;
    rect(24, y - 8, 7, 7, palette[index % palette.length], 2);
    text(40, y, item.name, 12, colors.secondary, "400", 274);
    text(326, y, formatDuration(item.seconds), 12, colors.text);
  });
  if (!visible.length) text(24, 209, "No tracked time in this period", 12);
  text(24, 251 + extraHeight, "LAST 7 DAYS", 11);
  const week = model.days.slice(-7);
  const max = Math.max(1, ...week.map((day) => day.seconds));
  week.forEach((day, index) => {
    const x = 29 + index * 56;
    const height = Math.round((day.seconds / max) * 27);
    rect(x, 262 + extraHeight, 40, 27, colors.empty);
    if (height) rect(x, 289 + extraHeight - height, 40, height, index === 6 ? colors.accent : colors.bar);
    text(x, 306 + extraHeight, `${day.date.getMonth() + 1}/${day.date.getDate()}`, 10);
  });
  text(24, 327 + extraHeight, "35-DAY ACTIVITY", 11);
  const levels = colors.levels;
  model.days.forEach((day, index) => {
    const level = day.seconds === 0 ? 0 : Math.min(4, Math.ceil(day.seconds / 7200));
    rect(24 + index * 11.25, 335 + extraHeight, 8.5, 8, levels[level], 2);
  });

  text(262, 352 + extraHeight, "Less", 9);
  levels.forEach((color, index) => rect(293 + index * 13, 345 + extraHeight, 7, 7, color, 2));
  text(365, 352 + extraHeight, "More", 9);
  svg.push("</svg>");
  return svg.join("");
}

export function dashboardMarkdown(
  model: DashboardModel,
  expanded = false,
  appearance: DashboardAppearance = "dark",
): string {
  return `![${model.period} work dashboard](data:image/svg+xml;base64,${Buffer.from(dashboardSvg(model, expanded, appearance)).toString("base64")})`;
}
