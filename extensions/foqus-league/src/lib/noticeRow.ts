import { noteDetail, type StatusNote } from "./statusNotes.ts";
import { CHART_WIDTH, escapeXml, markdownImage, px, rect, svg, text, textWidth, truncateToWidth } from "./svg.ts";
import type { Theme } from "./theme.ts";

const PAD = 2;
const ROW = 34;
const LINE = 18;
const MAX_LINES = 3;
const GAP = 6;
const INSET = 14;
const SIZE = 13;
const DOT = 3.5;
const KEY = { w: 22, h: 18 };

const TONE: Record<StatusNote["kind"], "calm" | "problem"> = {
  menuBar: "calm",
  empty: "calm",
  sync: "problem",
  blind: "problem",
  collector: "problem",
};

export function wrapBody(body: string, first: number, rest: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of body.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, SIZE) > (lines.length ? rest : first)) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);

  const kept = lines.slice(0, MAX_LINES);
  if (lines.length > MAX_LINES) kept[MAX_LINES - 1] = lines.slice(MAX_LINES - 1).join(" ");
  return kept.map((l, i) => truncateToWidth(l, { maxWidth: i ? rest : first, fontSize: SIZE }));
}

function returnKey(x: number, mid: number, theme: Theme): string {
  const cx = x + KEY.w / 2;
  const arrow =
    `M${px(cx + 3.5)},${px(mid - 3.5)} V${px(mid + 1)} H${px(cx - 3.5)} ` +
    `M${px(cx - 1.2)},${px(mid - 1.3)} L${px(cx - 3.5)},${px(mid + 1)} L${px(cx - 1.2)},${px(mid + 3.3)}`;
  return (
    rect(x, mid - KEY.h / 2, KEY.w, KEY.h, { rx: 5, stroke: theme.muted }) +
    `<path d="${arrow}" fill="none" stroke="${theme.ink2}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />`
  );
}

function noticeRow(note: StatusNote, theme: Theme, width: number, top: number): { body: string; height: number } {
  const right = width - PAD - INSET;
  const dotX = PAD + INSET + DOT;
  const titleX = dotX + DOT + 10;
  const label = note.onReturn && note.onReturn[0].toUpperCase() + note.onReturn.slice(1);
  const bodyRight = label ? right - KEY.w - 8 - textWidth(label, SIZE) - 16 : right;
  const lines = wrapBody(note.body, bodyRight - titleX - textWidth(note.title, SIZE, 600) - 8, bodyRight - titleX);

  const height = ROW + Math.max(0, lines.length - 1) * LINE;
  const mid = top + ROW / 2;
  const baseline = mid + SIZE * 0.35;

  let out = rect(PAD, top, width - PAD * 2, height, { rx: 8, fill: theme.track });
  out += `<circle cx="${px(dotX)}" cy="${px(mid)}" r="${DOT}" fill="${TONE[note.kind] === "problem" ? theme.league[2] : theme.muted}" />`;

  if (label) {
    const keyX = right - KEY.w;
    out += returnKey(keyX, mid, theme);
    out += text(keyX - 8, baseline, label, { size: SIZE, fill: theme.ink2, anchor: "end" });
  }

  const more = lines
    .slice(1)
    .map((l) => `<tspan x="${px(titleX)}" dy="${LINE}" fill="${theme.muted}">${escapeXml(l)}</tspan>`)
    .join("");
  out +=
    `<text x="${px(titleX)}" y="${px(baseline)}" font-size="${SIZE}">` +
    `<tspan font-weight="600" fill="${theme.ink}">${escapeXml(note.title)}</tspan>` +
    `<tspan dx="8" fill="${theme.muted}">${escapeXml(lines[0] ?? "")}</tspan>${more}</text>`;
  return { body: out, height };
}

export function renderNotices(notes: StatusNote[], theme: Theme, width: number = CHART_WIDTH): string {
  let height = 0;
  let body = "";
  for (const note of notes) {
    if (height) height += GAP;
    const row = noticeRow(note, theme, width, height);
    body += row.body;
    height += row.height;
  }
  return svg(width, height, theme.font, body);
}

export function noticesMarkdown(notes: StatusNote[], theme: Theme, width: number = CHART_WIDTH): string {
  if (!notes.length) return "";
  const alt = notes
    .map((note) => `${note.title}. ${noteDetail(note)}`)
    .join(" ")
    .replace(/[[\]]/g, "")
    .replace(/\s+/g, " ");
  return markdownImage(alt, renderNotices(notes, theme, width), width);
}
