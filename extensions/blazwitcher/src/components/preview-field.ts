import { sourceNames, type Range, type Source } from "../types";
import { normalizeRanges } from "../search/highlight";

type Run = { text: string; matched: boolean };
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const width = 520;
const horizontalPadding = 5;

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 给系统字体保留余量，先分行再渲染，SVG 高度不依赖被裁切后的内容。
function glyphWidth(text: string, fontSize: number) {
  if (/^[\p{Mark}\p{Cf}]+$/u.test(text)) return 0;
  if (/\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(text))
    return fontSize * 1.4;
  if (/^[ ilI]+$/.test(text)) return fontSize * 0.3;
  if (/^[jtfr.,:;!'|`]+$/.test(text)) return fontSize * 0.42;
  if (text === "m") return fontSize * 0.95;
  if (text === "w") return fontSize * 0.88;
  if (/^[MW@#%&]+$/.test(text)) return fontSize * 1.05;
  if (/^[BEPFRSTXZ]+$/.test(text)) return fontSize * 0.74;
  if (/^[A-Z]+$/.test(text)) return fontSize * 0.82;
  if (/^[aceosvxyz]+$/.test(text)) return fontSize * 0.61;
  if (/^[\x20-\x7e]+$/.test(text)) return fontSize * 0.64;
  return (
    fontSize *
    1.1 *
    Array.from(text).filter((char) => !/[\p{Mark}\p{Cf}]/u.test(char)).length
  );
}

function runsWidth(runs: Run[], fontSize: number) {
  return runs.reduce(
    (total, run) =>
      total +
      (run.matched ? horizontalPadding * 2 : 0) +
      Array.from(graphemes.segment(run.text)).reduce(
        (width, { segment }) => width + glyphWidth(segment, fontSize),
        0,
      ),
    0,
  );
}

function splitRuns(runs: Run[], index: number): [Run[], Run[]] {
  const before: Run[] = [];
  const after: Run[] = [];
  let cursor = 0;
  for (const run of runs) {
    const split = Math.max(0, Math.min(run.text.length, index - cursor));
    if (split) before.push({ ...run, text: run.text.slice(0, split) });
    if (split < run.text.length)
      after.push({ ...run, text: run.text.slice(split) });
    cursor += run.text.length;
  }
  return [before, after];
}

const sourceColors: Record<Source, string> = {
  tab: "#238257",
  history: "#AF6719",
  bookmark: "#7C4CC7",
};

export function previewFieldSvg(
  value: string,
  ranges: Range[],
  kind: "title" | "url",
  offset = 0,
  source?: Source,
) {
  const text = value.slice(offset);
  const normalized = normalizeRanges(
    ranges.map(([start, end]) => [start - offset, end - offset]),
    text.length,
  );
  const fontSize = kind === "title" ? 20 : 16;
  const lineHeight = fontSize + 12;
  const lines: Run[][] = [];
  let line: Run[] = [];
  let usedWidth = 0;
  let rangeIndex = 0;
  for (const { segment, index } of graphemes.segment(text)) {
    while (normalized[rangeIndex] && normalized[rangeIndex][1] < index)
      rangeIndex++;
    const range = normalized[rangeIndex];
    const matched = Boolean(range && range[0] < index + segment.length);
    const visible = segment
      .replace(/\r\n|[\r\n\t]/g, " ")
      // eslint-disable-next-line no-control-regex -- XML 1.0 forbids these characters.
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
    if (!visible) continue;
    const advance = glyphWidth(visible, fontSize);
    let padding = matched && !line.at(-1)?.matched ? horizontalPadding * 2 : 0;
    if (line.length && usedWidth + advance + padding > width - 20) {
      lines.push(line);
      line = [];
      usedWidth = 0;
      padding = matched ? horizontalPadding * 2 : 0;
    }
    const last = line.at(-1);
    if (last && last.matched === matched) last.text += visible;
    else line.push({ text: visible, matched });
    usedWidth += advance + padding;
  }
  if (line.length || !lines.length) lines.push(line);
  let tag = "";
  if (kind === "title" && source) {
    const label = sourceNames[source];
    const tagWidth = runsWidth([{ text: label, matched: false }], 12) + 22;
    const availableWidth = width - horizontalPadding * 2;
    if (line.length && usedWidth + tagWidth > availableWidth) {
      const lastText = line.map((run) => run.text).join("");
      const lastGrapheme = Array.from(graphemes.segment(lastText)).at(-1)!;
      let [before, after] = splitRuns(
        line,
        Math.max(0, lastText.search(/\S+\s*$/u)),
      );
      if (
        !before.length ||
        runsWidth(after, fontSize) + tagWidth > availableWidth
      )
        [before, after] = splitRuns(line, lastGrapheme.index);
      lines.pop();
      if (before.length) lines.push(before);
      lines.push(after);
    }
    tag = `<span class="source-tag" style="display:inline-block;vertical-align:middle;margin-left:8px;font:500 12px/20px -apple-system,BlinkMacSystemFont,sans-serif;color:#fff;background:${sourceColors[source]};border-radius:5px;padding:2px 7px">${label}</span>`;
  }
  const height = lines.length * lineHeight + 8;
  const color =
    kind === "title" ? "raycast-primary-text" : "raycast-secondary-text";
  const content = lines
    .map(
      (runs, index) =>
        `<div style="white-space:pre;line-height:${lineHeight}px;min-height:${lineHeight}px">${runs
          .map(({ text, matched }) => {
            const escaped = escapeXml(text);
            return matched
              ? `<mark style="color:#fff;background:#268DFF;border-radius:5px;padding:3px 5px">${escaped}</mark>`
              : escaped;
          })
          .join("")}${index === lines.length - 1 ? tag : ""}</div>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:${kind === "title" ? 600 : 400} ${fontSize}px/${lineHeight}px -apple-system,BlinkMacSystemFont,sans-serif;color:${color};padding:4px 5px">${content}</div></foreignObject></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
