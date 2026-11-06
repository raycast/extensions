import type { AppUsage, TrafficPoint, Units } from "../types";
import { formatBytes, formatRate } from "./format";

const palettes = {
  dark: {
    text: "#F5F5F7",
    muted: "#AAAAB4",
    line: "#3C3C45",
    panel: "#292930",
    down: "#62C4FF",
    up: "#C3A1FF",
  },
  light: {
    text: "#202126",
    muted: "#62636B",
    line: "#D9DAE1",
    panel: "#F0F1F5",
    down: "#0873B7",
    up: "#7950B5",
  },
};

export function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char,
  );
}

export const CHART_WINDOW_MS = 120_000;

export function chartScale(history: TrafficPoint[]): number {
  const peak = Math.max(1000, ...history.flatMap((point) => [point.downloadBps, point.uploadBps]));
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  return ([1, 2, 5, 10].find((step) => step * magnitude >= peak) ?? 10) * magnitude;
}

export function chartX(timestamp: number, end: number): number {
  return 16 + (1 - (end - timestamp) / CHART_WINDOW_MS) * 448;
}

type ChartIcon = "download" | "upload" | "activity" | "clock" | "pause";

function icon(kind: ChartIcon, x: number, y: number, color: string): string {
  const paths: Record<ChartIcon, string> = {
    download: "M8 1.5v8m-3-3 3 3 3-3M2 11v3h12v-3",
    upload: "M8 9.5v-8m-3 3 3-3 3 3M2 11v3h12v-3",
    activity: "M1 8h3l2-5 4 10 2-5h3",
    clock: "M8 4v4l2.5 1.5M14.5 8a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0",
    pause: "M5 3v10M11 3v10",
  };
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[kind]}"/></g>`;
}

/** Basic SVG elements and explicit text attributes work with Raycast's native SVG renderer. */
export function trafficSvg({
  app,
  units,
  appearance,
  totalRate,
  paused,
  animate = false,
}: {
  app: AppUsage;
  units: Units;
  appearance: "light" | "dark";
  totalRate: number;
  paused: boolean;
  animate?: boolean;
}): string {
  const p = palettes[appearance];
  const width = 480;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="390" viewBox="0 0 ${width} 390">`];
  function text(
    x: number,
    y: number,
    content: string,
    size = 14,
    fill = p.text,
    bold = false,
    anchor = "start",
    numeric = false,
  ) {
    parts.push(
      `<text x="${x}" y="${y}" font-family="${numeric ? "Menlo, monospace" : "Helvetica Neue, Helvetica, Arial, sans-serif"}" font-size="${size}" font-weight="${bold ? "bold" : "normal"}" text-anchor="${anchor}" fill="${fill}">${escapeXml(content)}</text>`,
    );
  }
  function rect(x: number, y: number, w: number, h: number, fill: string, radius = 0) {
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`);
  }
  parts.push(icon(paused ? "pause" : "activity", 16, 10, p.muted));
  text(40, 23, paused ? "PAUSED SNAPSHOT" : "CURRENT TRAFFIC", 12, p.muted);
  text(
    464,
    23,
    `${Math.round(totalRate > 0 ? ((app.downloadBps + app.uploadBps) / totalRate) * 100 : 0)}% of shown traffic`,
    12,
    p.muted,
    false,
    "end",
  );
  rect(16, 40, 218, 76, p.panel, 10);
  rect(246, 40, 218, 76, p.panel, 10);
  parts.push(icon("download", 30, 52, p.down));
  text(54, 65, "DOWNLOAD", 12, p.down, true);
  text(30, 99, formatRate(app.downloadBps, units), 25, p.text, true, "start", true);
  parts.push(icon("upload", 260, 52, p.up));
  text(284, 65, "UPLOAD", 12, p.up, true);
  text(260, 99, formatRate(app.uploadBps, units), 25, p.text, true, "start", true);

  const points = app.history;
  const first = points[0];
  const last = points.at(-1);
  const previous = points.at(-2);
  const maxRate = chartScale(points);
  parts.push(icon("activity", 16, 133, p.muted));
  text(40, 146, "TRAFFIC HISTORY", 12, p.muted);
  text(464, 146, formatRate(maxRate, units), 12, p.muted, false, "end");
  const left = 16,
    right = 464,
    top = 165,
    bottom = 266;
  for (const y of [top, (top + bottom) / 2, bottom]) rect(left, y, right - left, 1, p.line);
  if (first && last && previous) {
    const elapsed = last.timestamp - previous.timestamp;
    const slide = animate && !paused && elapsed > 0 && elapsed <= 10_000;
    const shift = ((right - left) * elapsed) / CHART_WINDOW_MS;
    const y = (rate: number) => bottom - (rate / maxRate) * (bottom - top);
    if (slide) {
      parts.push(
        `<defs><clipPath id="traffic-plot"><rect x="${left}" y="${top - 2}" width="${right - left}" height="${bottom - top + 4}"/></clipPath></defs>`,
        `<g clip-path="url(#traffic-plot)"><g><animateTransform attributeName="transform" type="translate" from="${shift.toFixed(2)} 0" to="0 0" dur="0.2s" fill="freeze"/>`,
      );
    }
    for (const direction of ["downloadBps", "uploadBps"] satisfies (keyof Pick<
      AppUsage,
      "downloadBps" | "uploadBps"
    >)[]) {
      const coordinates = points.map((point) =>
        [chartX(point.timestamp, last.timestamp), y(point[direction])].map((number) => number.toFixed(1)).join(","),
      );
      parts.push(
        `<polygon points="${chartX(first.timestamp, last.timestamp).toFixed(1)},${bottom} ${coordinates.join(" ")} ${right},${bottom}" fill="${direction === "downloadBps" ? p.down : p.up}" fill-opacity="0.12"/>`,
      );
      parts.push(
        `<polyline points="${coordinates.join(" ")}" fill="none" stroke="${direction === "downloadBps" ? p.down : p.up}" stroke-width="2.5" stroke-linejoin="round"/>`,
      );
    }
    if (slide) parts.push("</g></g>");
    for (const direction of ["downloadBps", "uploadBps"] satisfies (keyof Pick<
      AppUsage,
      "downloadBps" | "uploadBps"
    >)[]) {
      parts.push(
        `<circle cx="${right}" cy="${y(last[direction]).toFixed(1)}" r="3.5" fill="${direction === "downloadBps" ? p.down : p.up}">${
          slide
            ? `<animate attributeName="cy" from="${y(previous[direction]).toFixed(1)}" to="${y(last[direction]).toFixed(1)}" dur="0.2s" fill="freeze"/>`
            : ""
        }</circle>`,
      );
    }
  } else text(240, 220, "Collecting traffic history…", 14, p.muted, false, "middle");
  text(16, 287, "2 min ago", 12, p.muted);
  text(464, 287, paused ? "Paused" : "Now", 12, p.muted, false, "end");
  parts.push(icon("clock", 16, 307, p.muted));
  text(40, 320, "OBSERVED THIS SESSION", 12, p.muted);
  text(464, 320, formatBytes(app.downloadedBytes + app.uploadedBytes), 16, p.text, true, "end");
  const total = app.downloadedBytes + app.uploadedBytes;
  const downWidth = total ? (448 * app.downloadedBytes) / total : 0;
  rect(16, 334, 448, 6, p.line, 3);
  if (downWidth > 0) rect(16, 334, downWidth, 6, p.down, 2);
  if (total && downWidth < 448) rect(16 + downWidth, 334, 448 - downWidth, 6, p.up, 2);
  parts.push(icon("download", 16, 352, p.down));
  text(40, 365, formatBytes(app.downloadedBytes), 14, p.down, false, "start", true);
  parts.push(icon("upload", 246, 352, p.up));
  text(270, 365, formatBytes(app.uploadedBytes), 14, p.up, false, "start", true);
  parts.push("</svg>");
  return parts.join("");
}

export function trafficMarkdown(options: Parameters<typeof trafficSvg>[0]): string {
  const { app, units } = options;
  const alt = `${app.name}: download ${formatRate(app.downloadBps, units)}, upload ${formatRate(app.uploadBps, units)}. Observed ${formatBytes(app.downloadedBytes + app.uploadedBytes)}.`;
  return `![${alt.replace(/[[\]\n]/g, " ")}](data:image/svg+xml;base64,${Buffer.from(trafficSvg(options)).toString("base64")}?raycast-width=480&raycast-height=390)`;
}
