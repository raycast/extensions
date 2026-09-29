import path from "node:path";
import { DownloadKind, DownloadSnapshot, Stage, stagesFor } from "./download-session.js";
import { formatBytes, formatClock, formatSpeed, plural, wrapText } from "./format.js";
import { FONT, svg, theme, xml } from "./svg.js";

// The hero image of the download view: a progress ring with four stat tiles next
// to it, a throughput chart, and a strip with the steps of the download. Every
// update redraws the whole picture from the session snapshot.

export const HERO_W = 560;
const RING_BOX = 184;
const TILE_X = 196;
const GAP = 12;
const CHART_Y = RING_BOX + 16;
const CHART_H = 112;
const STRIP_Y = CHART_Y + CHART_H + 16;
const STRIP_H = 44;
export const HERO_H = STRIP_Y + STRIP_H;

const ACCENT: Record<DownloadKind, string> = {
  video: theme.blue,
  audio: theme.purple,
  gallery: theme.yellow,
  spotify: theme.green,
  website: theme.blue,
  transcript: theme.yellow,
  thumbnail: theme.yellow,
};

/** Kinds that report a running count instead of a percentage, and what they count. */
const COUNTED: Partial<Record<DownloadKind, string>> = { gallery: "file", spotify: "track" };

const KIND_TITLE: Record<DownloadKind, string> = {
  video: "Video",
  audio: "Audio",
  gallery: "Gallery",
  spotify: "Spotify",
  website: "Webpage",
  transcript: "Transcript",
  thumbnail: "Thumbnail",
};

const WORKING_LABEL: Partial<Record<DownloadKind, string>> = {
  website: "saving page…",
  transcript: "reading subtitles…",
  thumbnail: "fetching image…",
};

const DETAILS: Partial<Record<DownloadKind, string>> = {
  website: "monolith is saving the page as one file, with its images, styles and scripts inlined.",
  transcript: "yt-dlp is fetching the subtitles; they are cleaned up into plain text before saving.",
  thumbnail: "yt-dlp is fetching the thumbnail at the best resolution the site offers.",
};

export function accentFor(kind: DownloadKind): string {
  return ACCENT[kind];
}

export function kindTitle(kind: DownloadKind): string {
  return KIND_TITLE[kind];
}

export function elapsedSeconds(s: DownloadSnapshot, now: number): number {
  return Math.max(0, ((s.finishedAt ?? now) - s.startedAt) / 1000);
}

/** Sum of every stream size yt-dlp has announced so far. */
export function knownTotalBytes(s: DownloadSnapshot): number | undefined {
  const sizes = s.streamBytes.filter((b): b is number => typeof b === "number");
  return sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) : undefined;
}

/** Bytes on disk so far: finished streams plus the one in flight. */
export function downloadedBytes(s: DownloadSnapshot): number | undefined {
  if (s.status === "done") return knownTotalBytes(s);
  const current = s.streamIndex > 0 ? s.streamIndex - 1 : 0;
  const finished = s.streamBytes.slice(0, current).reduce((a, b) => a + (b ?? 0), 0);
  if (s.downloadedBytes === undefined) return finished > 0 ? finished : undefined;
  return finished + s.downloadedBytes;
}

const peak = (samples: number[]) => (samples.length > 0 ? Math.max(...samples) : undefined);
const mean = (samples: number[]) =>
  samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : undefined;

/** Bytes over the time progress was actually flowing, so preparing and merging don't drag it down. */
function averageSpeed(s: DownloadSnapshot): number | undefined {
  const total = knownTotalBytes(s);
  const { firstProgressAt: first, lastProgressAt: last } = s;
  if (total !== undefined && first !== undefined && last !== undefined && last - first >= 500) {
    return total / ((last - first) / 1000);
  }
  return mean(s.speedSamples);
}

function text(
  x: number,
  y: number,
  content: string,
  opts: { size: number; weight?: number; color?: string; anchor?: "start" | "middle" | "end" },
): string {
  const anchor = opts.anchor && opts.anchor !== "start" ? ` text-anchor="${opts.anchor}"` : "";
  const weight = opts.weight ? ` font-weight="${opts.weight}"` : "";
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}"${anchor} ${FONT} font-size="${opts.size}"${weight} fill="${opts.color ?? theme.text}">${xml(content)}</text>`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

// ---------------------------------------------------------------------------
// Ring
// ---------------------------------------------------------------------------

function ring(s: DownloadSnapshot, now: number, accent: string): string {
  const cx = RING_BOX / 2;
  const cy = RING_BOX / 2;
  const r = 74;
  const stroke = 14;
  const circumference = 2 * Math.PI * r;
  const arc = (fraction: number, color: string, opacity = 1) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" opacity="${opacity}"
       stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${(circumference * (1 - Math.min(Math.max(fraction, 0.004), 1))).toFixed(2)}"
       transform="rotate(-90 ${cx} ${cy})"/>`;
  const track = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.track}" stroke-width="${stroke}"/>`;
  const noun = COUNTED[s.kind];

  let arcs = "";
  let big = "";
  let bigSize = 34;
  let bigColor = theme.text;
  let small = "";
  let icon = "";

  if (s.status === "done") {
    arcs = arc(1, theme.green);
    icon = `<path d="M ${cx - 13} ${cy - 30} l 9 9 l 17 -19" fill="none" stroke="${theme.green}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    big = noun ? String(s.items) : "Done";
    bigSize = noun ? 34 : 26;
    small = noun ? `${noun}s saved` : formatBytes(knownTotalBytes(s)).replace("—", "") || "saved";
  } else if (s.status === "failed") {
    arcs = arc(1, theme.red, 0.3);
    big = "Failed";
    bigSize = 26;
    bigColor = theme.red;
    small = "see details below";
  } else if (s.status === "cancelled") {
    if (s.percent !== undefined && !noun) arcs = arc(s.percent / 100, theme.muted, 0.6);
    big = "Stopped";
    bigSize = 26;
    bigColor = theme.muted;
    small = noun ? plural(s.items, noun) : s.percent !== undefined ? `at ${Math.floor(s.percent)}%` : "";
  } else if (noun && s.stage !== "prepare") {
    arcs = arc(1, accent, 0.22);
    big = String(s.items);
    small = `${noun}s so far`;
  } else if (s.stage === "process") {
    arcs = arc(1, accent, 0.45);
    big = s.kind === "audio" ? "Converting" : s.streams > 1 ? "Merging" : "Finishing";
    bigSize = 22;
    small = "almost done";
  } else if (s.percent !== undefined) {
    arcs = arc(s.percent / 100, accent);
    big = `${Math.floor(s.percent)}%`;
    // With separate video and audio streams the percentage is per stream (the tiles
    // show the overall bytes), so say which one it is.
    // Kept short: the label has to fit inside the ring.
    const stream = s.streams > 1 ? (s.stage === "audio" ? "audio" : "video") : "";
    const size = s.totalBytes ? formatBytes(s.totalBytes) : "";
    small = stream && size ? `${stream} · ${size}` : stream ? `${stream} stream` : size ? `of ${size}` : "downloading";
  } else {
    // No percentage to show (still preparing, or a tool without progress output):
    // a short static arc plus the elapsed clock, which the view ticks every second.
    arcs = arc(0.2, accent, 0.9);
    big = formatClock(elapsedSeconds(s, now));
    small = s.stage === "prepare" ? "preparing…" : (WORKING_LABEL[s.kind] ?? "working…");
  }

  const bigY = icon ? cy + 12 : cy + 8;
  return `${track}${arcs}${icon}
    ${text(cx, bigY, big, { size: bigSize, weight: 700, color: bigColor, anchor: "middle" })}
    ${text(cx, bigY + 22, small, { size: 12, color: theme.muted, anchor: "middle" })}`;
}

// ---------------------------------------------------------------------------
// Stat tiles
// ---------------------------------------------------------------------------

type Tile = { label: string; value: string; sub?: string; color?: string };

function tiles(s: DownloadSnapshot, now: number): Tile[] {
  const elapsed = elapsedSeconds(s, now);
  const noun = COUNTED[s.kind];
  const folder = truncate(path.basename(s.folder) || s.folder, 16);

  if (noun) {
    const minutes = elapsed / 60;
    const rate = s.items > 0 && elapsed >= 5 ? `${(s.items / minutes).toFixed(1)}/min` : "—";
    return [
      { label: `${noun[0].toUpperCase()}${noun.slice(1)}s`, value: String(s.items) },
      { label: "Rate", value: rate },
      { label: s.status === "running" ? "Elapsed" : "Took", value: formatClock(elapsed) },
      { label: "Folder", value: folder },
    ];
  }

  if (s.kind === "video" || s.kind === "audio") {
    const total = knownTotalBytes(s);
    const top = peak(s.speedSamples);
    if (s.status === "done") {
      return [
        { label: "Average", value: formatSpeed(averageSpeed(s)) },
        { label: "Took", value: formatClock(elapsed) },
        { label: "Size", value: formatBytes(total), sub: s.streams > 1 ? `${s.streams} streams merged` : undefined },
        { label: "Peak", value: formatSpeed(top) },
      ];
    }
    const moreComing = s.streamBytes.filter((b) => b !== undefined).length < s.streams;
    return [
      {
        label: "Speed",
        value: s.status === "running" && s.stage !== "process" ? formatSpeed(s.speed) : "—",
        sub: top !== undefined ? `peak ${formatSpeed(top)}` : undefined,
      },
      {
        label: "Time Left",
        value: s.status === "running" && s.stage !== "process" ? formatClock(s.eta) : "—",
        sub: s.streams > 1 && s.streamIndex > 0 ? `stream ${s.streamIndex} of ${s.streams}` : undefined,
      },
      {
        label: "Downloaded",
        value: formatBytes(downloadedBytes(s)),
        sub: total !== undefined ? `of ${formatBytes(total)}${moreComing ? "+" : ""}` : undefined,
      },
      { label: s.status === "running" ? "Elapsed" : "Took", value: formatClock(elapsed) },
    ];
  }

  const status =
    s.status === "done" ? "Saved" : s.status === "failed" ? "Failed" : s.status === "cancelled" ? "Stopped" : "Working";
  const statusColor =
    s.status === "done"
      ? theme.green
      : s.status === "failed"
        ? theme.red
        : s.status === "cancelled"
          ? theme.muted
          : undefined;
  return [
    { label: "Status", value: status, color: statusColor },
    { label: s.status === "running" ? "Elapsed" : "Took", value: formatClock(elapsed) },
    { label: "Type", value: kindTitle(s.kind) },
    { label: "Folder", value: folder },
  ];
}

function tileGrid(s: DownloadSnapshot, now: number): string {
  const w = (HERO_W - TILE_X - GAP) / 2;
  const h = (RING_BOX - GAP) / 2;
  return tiles(s, now)
    .map((tile, i) => {
      const x = TILE_X + (i % 2) * (w + GAP);
      const y = Math.floor(i / 2) * (h + GAP);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="12" fill="${theme.card}"/>
        ${text(x + 14, y + 24, tile.label, { size: 11, weight: 600, color: theme.muted })}
        ${text(x + 14, y + 54, tile.value, { size: 22, weight: 700, color: tile.color })}
        ${tile.sub ? text(x + 14, y + 73, tile.sub, { size: 11, color: theme.muted }) : ""}`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Chart card
// ---------------------------------------------------------------------------

function sparkline(samples: number[], color: string, title: string, format: (v: number) => string): string {
  const w = HERO_W;
  const h = CHART_H;
  const pad = 14;
  const labelW = 104;
  const heading = text(pad, 24, title, { size: 11, weight: 600, color: theme.muted });

  if (samples.length < 2) {
    const mid = (h + 30) / 2;
    return `${heading}
      <line x1="${pad}" y1="${mid}" x2="${w - pad}" y2="${mid}" stroke="${theme.faint}" stroke-width="2" stroke-dasharray="6 6"/>
      ${text(w / 2, mid - 12, "waiting for data…", { size: 12, color: theme.muted, anchor: "middle" })}`;
  }

  const max = Math.max(...samples, 1);
  const plotTop = 44;
  const plotBottom = h - 14;
  const points = samples.map((v, i) => {
    const x = pad + (i / (samples.length - 1)) * (w - pad * 2 - labelW);
    const y = plotBottom - (v / max) * (plotBottom - plotTop);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  const labelY = Math.min(Math.max(lastY, plotTop + 6), plotBottom - 4) + 5;

  return `${heading}
    ${text(w - pad, 24, `peak ${format(max)}`, { size: 11, color: theme.muted, anchor: "end" })}
    <line x1="${pad}" y1="${plotTop}" x2="${w - pad - labelW}" y2="${plotTop}" stroke="${theme.faint}" stroke-width="1" stroke-dasharray="4 4"/>
    <polygon points="${pad},${plotBottom} ${line} ${lastX.toFixed(1)},${plotBottom}" fill="${color}" opacity="0.18"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4.5" fill="${color}"/>
    ${text(lastX + 12, labelY, format(samples[samples.length - 1]), { size: 14, weight: 600 })}`;
}

function messageCard(title: string, message: string, color: string): string {
  const lines = wrapText(message, 78, 3);
  return `${text(14, 28, title, { size: 14, weight: 700, color })}
    ${lines.map((l, i) => text(14, 52 + i * 18, l, { size: 12, color: theme.muted })).join("")}`;
}

function chartCard(s: DownloadSnapshot, accent: string): string {
  const noun = COUNTED[s.kind];
  let body: string;
  let fill = theme.card;
  let fillOpacity = 1;

  if (s.status === "failed") {
    fill = theme.red;
    fillOpacity = 0.14;
    body = messageCard(s.resultTitle ?? "Download failed", s.resultMessage ?? "Something went wrong.", theme.red);
  } else if (s.status === "cancelled") {
    body = messageCard("Stopped", "The download was stopped before it finished.", theme.muted);
  } else if (s.status === "done" && (noun ? s.itemSamples : s.speedSamples).length < 2) {
    // Finished before there was enough to chart.
    body = messageCard("Saved", s.filePath ? path.basename(s.filePath) : (s.resultMessage ?? "Done."), theme.green);
  } else if (noun) {
    body = sparkline(s.itemSamples, accent, `${noun[0].toUpperCase()}${noun.slice(1)}s over time`, (v) =>
      plural(Math.round(v), noun),
    );
  } else if (s.kind === "video" || s.kind === "audio") {
    body = sparkline(s.speedSamples, accent, "Download speed", formatSpeed);
  } else if (s.status === "done") {
    body = messageCard("Saved", s.filePath ? path.basename(s.filePath) : (s.resultMessage ?? "Done."), theme.green);
  } else {
    body = messageCard("Working", DETAILS[s.kind] ?? "Working…", theme.muted);
  }

  return `<g transform="translate(0,${CHART_Y})">
    <rect width="${HERO_W}" height="${CHART_H}" rx="12" fill="${fill}" fill-opacity="${fillOpacity}"/>
    ${body}
  </g>`;
}

// ---------------------------------------------------------------------------
// Step strip
// ---------------------------------------------------------------------------

function stageValue(s: DownloadSnapshot, stage: Stage, state: "done" | "active" | "pending" | "failed"): string {
  if (state === "failed") return s.status === "cancelled" ? "stopped" : "failed";
  if (state === "pending") return "pending";
  const noun = COUNTED[s.kind];
  switch (stage.key) {
    case "prepare":
      return state === "active" ? "working…" : "ready";
    case "video":
    case "audio":
    case "download": {
      if (noun) return plural(s.items, noun);
      const index = stage.key === "audio" ? 1 : 0;
      const bytes = s.streamBytes[index];
      if (bytes !== undefined) return formatBytes(bytes);
      return state === "active" ? "working…" : "done";
    }
    case "process":
      return state === "active" ? "working…" : "done";
    case "done":
      return s.filePath ? truncate(path.extname(s.filePath).slice(1).toUpperCase() || "done", 12) : "done";
  }
}

function strip(s: DownloadSnapshot, accent: string): string {
  const stages = stagesFor(s.kind, s.streams);
  const found = stages.findIndex((st) => st.key === s.stage);
  const current = s.status === "done" ? stages.length : found === -1 ? 1 : found;
  const pillW = (HERO_W - GAP * (stages.length - 1)) / stages.length;
  const stopped = s.status === "failed" || s.status === "cancelled";

  return stages
    .map((stage, i) => {
      const state = i < current ? "done" : i > current ? "pending" : stopped ? "failed" : "active";
      const color = state === "failed" ? (s.status === "cancelled" ? theme.muted : theme.red) : accent;
      const lit = state !== "pending";
      const x = i * (pillW + GAP);
      const fillOpacity = state === "active" ? 0.28 : state === "pending" ? 1 : 0.16;
      const border = state === "active" || state === "failed" ? `stroke="${color}" stroke-width="2"` : "";
      return `<rect x="${x.toFixed(1)}" y="${STRIP_Y}" width="${pillW.toFixed(1)}" height="${STRIP_H}" rx="12" fill="${lit ? color : theme.card}" fill-opacity="${fillOpacity}" ${border}/>
        <circle cx="${(x + 16).toFixed(1)}" cy="${STRIP_Y + STRIP_H / 2}" r="4.5" fill="${lit ? color : theme.track}"/>
        ${text(x + 28, STRIP_Y + 19, stage.title, { size: 12, weight: 600, color: lit ? theme.text : theme.muted })}
        ${text(x + 28, STRIP_Y + 34, stageValue(s, stage, state), { size: 11, color: lit ? theme.text : theme.muted })}`;
    })
    .join("");
}

// ---------------------------------------------------------------------------

export function downloadHeroSvg(s: DownloadSnapshot, now: number): string {
  const accent = accentFor(s.kind);
  return svg(HERO_W, HERO_H, `${ring(s, now, accent)}${tileGrid(s, now)}${chartCard(s, accent)}${strip(s, accent)}`);
}

/** Changes whenever the picture does; used as the image alt text so Raycast never shows a cached frame. */
export function heroFrameKey(s: DownloadSnapshot, now: number): string {
  return [
    s.status,
    s.stage,
    s.streamIndex,
    s.percent === undefined ? "-" : s.percent.toFixed(1),
    s.speedSamples.length,
    s.items,
    Math.floor(elapsedSeconds(s, now)),
  ].join("-");
}
