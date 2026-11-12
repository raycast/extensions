import { CleanupResult } from "../services/cleanup";
import { Artifact, ScanStatus } from "../types";
import { formatActivity, formatSize } from "./artifacts";

type Appearance = "light" | "dark";
export interface SizeSummary {
  bytes: number;
  unknown: number;
}

export function summarizeSizes(items: readonly { size: number | null }[]): SizeSummary {
  return items.reduce<SizeSummary>(
    (summary, item) => ({
      bytes: summary.bytes + (item.size ?? 0),
      unknown: summary.unknown + Number(item.size === null),
    }),
    { bytes: 0, unknown: 0 },
  );
}

function palette(appearance: Appearance) {
  return appearance === "dark"
    ? {
        bg: "#202124",
        text: "#F4F4F5",
        muted: "#B5B8C0",
        track: "#3B3E45",
        accent: "#75ADFF",
        warning: "#FFD280",
        danger: "#FF9292",
        success: "#7EDDB5",
      }
    : {
        bg: "#F2F3F5",
        text: "#202124",
        muted: "#575D67",
        track: "#D5D9E0",
        accent: "#245DC1",
        warning: "#865300",
        danger: "#B42B36",
        success: "#157350",
      };
}
type Palette = ReturnType<typeof palette>;

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!,
  );
}

function text(x: number, y: number, value: string, color: string, size = 13, bold = false): string {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${bold ? 700 : 400}">${escapeXml(value)}</text>`;
}

function image(body: string, height: number, description: string, colors: Palette): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="${height}" viewBox="0 0 660 ${height}" role="img"><title>${escapeXml(description)}</title><rect width="660" height="${height}" rx="16" fill="${colors.bg}"/><g font-family="-apple-system, BlinkMacSystemFont, Helvetica, sans-serif">${body}</g></svg>`;
  return `![${description}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=660)`;
}

export function artifactInfographic(
  artifact: Artifact,
  summary: SizeSummary,
  status: ScanStatus,
  appearance: Appearance,
  now = Date.now(),
): string {
  const c = palette(appearance);
  const share = artifact.size !== null && summary.bytes > 0 ? Math.min(1, artifact.size / summary.bytes) : null;
  const percentage = share === null ? "—" : share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;
  const circumference = 2 * Math.PI * 42;
  const activity = formatActivity(artifact.activity, now);
  const days =
    artifact.activity === null || artifact.activity > now ? null : Math.floor((now - artifact.activity) / 86_400_000);
  const risk =
    artifact.risk === "sensitive"
      ? "Sensitive directory"
      : artifact.risk === "unknown"
        ? "Risk unknown"
        : "Review before cleanup";
  const riskColor = artifact.risk === "sensitive" ? c.danger : artifact.risk === "unknown" ? c.muted : c.warning;
  const scope =
    status === "complete"
      ? "Measured scan results"
      : status === "scanning" || status === "preparing"
        ? "Scan in progress · snapshot"
        : "Partial scan results";
  const ring = `<circle cx="80" cy="112" r="42" fill="none" stroke="${c.track}" stroke-width="10"/>${share === null ? "" : `<circle cx="80" cy="112" r="42" fill="none" stroke="${c.accent}" stroke-width="10" stroke-dasharray="${share * circumference} ${circumference}" transform="rotate(-90 80 112)"/>`}`;
  const timeline = `<path d="M320 99 H624" stroke="${c.track}" stroke-width="5" stroke-linecap="round"/>${days === null ? "" : `<circle cx="${320 + (Math.min(days, 180) / 180) * 304}" cy="99" r="6" fill="${c.accent}"/>`}`;
  return image(
    text(24, 29, "STORAGE ESTIMATE", c.muted, 11, true) +
      ring +
      `<text x="80" y="118" text-anchor="middle" fill="${c.text}" font-size="22" font-weight="700">${escapeXml(percentage)}</text>` +
      text(144, 99, artifact.size === null ? "Unknown" : formatSize(artifact.size), c.text, 25, true) +
      text(144, 121, "Directory size", c.muted) +
      text(24, 182, scope, c.text, 13, true) +
      text(
        24,
        204,
        `${formatSize(summary.bytes)} measured${summary.unknown ? ` · ${summary.unknown} unknown` : ""}`,
        c.muted,
        12,
      ) +
      `<path d="M294 24 V218" stroke="${c.track}"/>` +
      text(320, 29, "PROJECT ACTIVITY", c.muted, 11, true) +
      text(320, 65, activity, c.text, 23, true) +
      timeline +
      text(320, 123, "Today", c.muted, 11) +
      text(458, 123, "90d", c.muted, 11) +
      text(596, 123, "180d+", c.muted, 11) +
      text(320, 166, risk, riskColor, 16, true) +
      text(
        320,
        190,
        artifact.risk === "sensitive"
          ? "May contain important application data."
          : artifact.risk === "unknown"
            ? "Risk analysis was unavailable."
            : "No specific sensitive-folder warning.",
        c.muted,
        12,
      ) +
      text(320, 211, "Activity alone does not establish safety.", c.muted, 12),
    242,
    "Storage share, project activity, and risk overview",
    c,
  );
}

function breakdown(
  title: string,
  value: string,
  note: string,
  segments: { label: string; count: number; color: string }[],
  appearance: Appearance,
): string {
  const c = palette(appearance);
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  let x = 24;
  const bars = segments
    .map((segment) => {
      const width = total === 0 ? 0 : (segment.count / total) * 612;
      const rect = `<rect x="${x}" y="66" width="${width}" height="8" fill="${segment.color}"/>`;
      x += width;
      return rect;
    })
    .join("");
  return image(
    text(24, 23, title, c.muted, 11, true) +
      text(24, 49, value, c.text, 24, true) +
      `<rect x="24" y="66" width="612" height="8" fill="${c.track}"/>` +
      bars +
      segments
        .map(
          (segment, index) =>
            `<circle cx="${30 + index * 208}" cy="95" r="4" fill="${segment.color}"/>` +
            text(42 + index * 208, 100, `${segment.count} ${segment.label}`, c.text),
        )
        .join(""),
    120,
    `${title}: ${value}. ${segments.map((segment) => `${segment.count} ${segment.label}`).join(", ")}. ${note}`,
    c,
  );
}

export function reviewInfographic(items: readonly Artifact[], appearance: Appearance): string {
  const c = palette(appearance);
  const { bytes, unknown } = summarizeSizes(items);
  return breakdown(
    "SELECTED DIRECTORIES",
    `${formatSize(bytes)} estimated${unknown ? ` + ${unknown} unknown` : ""}`,
    "Risk flags are advisory. Review every selected path before cleanup.",
    [
      { label: "sensitive", count: items.filter((item) => item.risk === "sensitive").length, color: c.danger },
      { label: "to review", count: items.filter((item) => item.risk === "review").length, color: c.warning },
      { label: "unknown risk", count: items.filter((item) => item.risk === "unknown").length, color: c.muted },
    ],
    appearance,
  );
}

export function reportInfographic(results: readonly CleanupResult[], appearance: Appearance): string {
  const c = palette(appearance);
  const successful = results.filter((result) => result.status === "success");
  const { bytes, unknown } = summarizeSizes(successful);
  return breakdown(
    "PROCESSED ESTIMATE",
    `${formatSize(bytes)}${unknown ? ` + ${unknown} unknown` : ""}`,
    "Only successful operations contribute to the processed size estimate.",
    [
      { label: "succeeded", count: successful.length, color: c.success },
      {
        label: "already missing",
        count: results.filter((result) => result.status === "missing").length,
        color: c.muted,
      },
      { label: "failed", count: results.filter((result) => result.status === "failed").length, color: c.danger },
    ],
    appearance,
  );
}
