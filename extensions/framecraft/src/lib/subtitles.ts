import fs from "node:fs";
import path from "node:path";
import { CaptureProjectManifest, ExtractedLayer, SubtitleMode } from "./types";

export interface ParsedSubtitleCue {
  startSec: number;
  endSec: number;
  text: string;
}

function parseSrtTimestamp(raw: string): number | null {
  const m = raw.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  const ms = Number(m[4].padEnd(3, "0"));
  return h * 3600 + min * 60 + sec + ms / 1000;
}

export function cleanSubtitleMarkup(raw: string): string {
  return raw
    .replace(/\\N/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\h/g, " ")
    .replace(/\{[^}]*\}/g, "")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function parseSrtOrVttContent(rawContent: string): ParsedSubtitleCue[] {
  const normalized = rawContent.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n{2,}/);
  const cues: ParsedSubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const arrowIdx = lines.findIndex((l) => l.includes("-->"));
    if (arrowIdx === -1) continue;

    const timeParts = lines[arrowIdx].split("-->");
    if (timeParts.length < 2) continue;

    const startSec = parseSrtTimestamp(timeParts[0]);
    const endToken = timeParts[1].trim().split(/\s+/)[0];
    const endSec = parseSrtTimestamp(endToken);
    if (startSec === null || endSec === null) continue;

    const text = cleanSubtitleMarkup(lines.slice(arrowIdx + 1).join("\n"));
    if (text) {
      cues.push({ startSec, endSec, text });
    }
  }
  return cues;
}

export function parseAssContent(rawContent: string): ParsedSubtitleCue[] {
  const lines = rawContent.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cues: ParsedSubtitleCue[] = [];

  for (const line of lines) {
    if (!line.startsWith("Dialogue:")) continue;
    // Dialogue: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    const rest = line.slice("Dialogue:".length).trim();
    const parts = rest.split(",");
    if (parts.length < 10) continue;

    const startSec = parseSrtTimestamp(parts[1]);
    const endSec = parseSrtTimestamp(parts[2]);
    if (startSec === null || endSec === null) continue;

    const rawText = parts.slice(9).join(",");
    const text = cleanSubtitleMarkup(rawText);
    if (text) {
      cues.push({ startSec, endSec, text });
    }
  }
  return cues;
}

export function findActiveSubtitleText(rawSubText: string, targetSec: number): string {
  const cues = rawSubText.includes("Dialogue:") ? parseAssContent(rawSubText) : parseSrtOrVttContent(rawSubText);

  if (cues.length === 0) return "";

  // Both extraction paths pass -copyts, so cue timestamps stay on the source
  // clock and targetSec addresses them directly. There is no window-relative
  // timeline to fall back to; guessing one attributed another moment's line to
  // the current frame.
  const hits = cues.filter((c) => targetSec >= c.startSec - 0.08 && targetSec <= c.endSec + 0.08).map((c) => c.text);

  // Deduplicate identical simultaneous cues
  return Array.from(new Set(hits)).join("\n");
}

export function applyInitialLayerSelection(layers: ExtractedLayer[], mode: SubtitleMode, frameHeight: number): void {
  for (const l of layers) {
    l.visible = false;
    l.yOffset = 0;
  }

  if (mode === "clean" || layers.length === 0) {
    return;
  }

  const isChinese = (l: ExtractedLayer) =>
    l.isChinese || /^(zh|zho|chi|cmn)(?:[-_]|$)/i.test(l.language) || /中文|简体|繁体|簡體|繁體|Chinese/i.test(l.title);
  const isEnglish = (l: ExtractedLayer) =>
    l.isEnglish || /^(en|eng)(?:[-_]|$)/i.test(l.language) || /英文|英语|英語|English/i.test(l.title);
  const isExplicitBilingual = (l: ExtractedLayer) =>
    /中英|英中|Chinese\s*(?:[+&/-]|and)\s*English|English\s*(?:[+&/-]|and)\s*Chinese/i.test(l.title) ||
    (isChinese(l) && /英文|英语|英語|English/i.test(l.title));
  const richness = (l: ExtractedLayer) => (l.kind === "bitmap" ? (l.bitmapBytes ?? 0) : (l.text?.length ?? 0));
  // Stable sorting keeps the source track order when the available evidence ties.
  const pool = layers.filter((l) => l.hasActiveContent);
  const chiCandidates = pool
    .filter((l) => isChinese(l) || isExplicitBilingual(l))
    .sort((a, b) => Number(isExplicitBilingual(b)) - Number(isExplicitBilingual(a)) || richness(b) - richness(a));
  const engCandidates = pool.filter(isEnglish);
  // Missing disc language metadata must not silently turn active dialogue into
  // a clean export. Preserve an active fallback layer for manual switching.
  const unknownCandidates = pool
    .filter((l) => !isChinese(l) && !isEnglish(l))
    .sort((a, b) => richness(b) - richness(a));
  const primary = chiCandidates[0] ?? engCandidates[0] ?? unknownCandidates[0];
  if (primary) {
    primary.visible = true;
  }

  if (mode === "bilingual") {
    // A named Chinese–English track already supplies both languages.
    if (primary && isExplicitBilingual(primary)) return;
    const secondary = engCandidates.find((l) => l.id !== primary?.id);
    if (secondary) {
      secondary.visible = true;
      // Auto-stack upward so primary & secondary subtitles do not overlap
      if (primary && primary.hasActiveContent && secondary.hasActiveContent) {
        secondary.yOffset = -Math.round(frameHeight * 0.1);
      }
    }
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildLayeredSvg(manifest: CaptureProjectManifest): string {
  const { width, height } = manifest.colorInfo;
  const barPad = manifest.cinemaBar ? Math.round(height * 0.12) : 0;
  const totalHeight = height + barPad * 2;
  const videoY = barPad;

  const cleanBuf = fs.readFileSync(manifest.cleanPngPath);
  const cleanB64 = cleanBuf.toString("base64");

  const svgLayers: string[] = [];

  for (const layer of manifest.layers) {
    const opacity = layer.visible ? "1" : "0";
    const safeId = escapeXml(layer.id);
    const comment = `  <!-- Track [${layer.index}] ${escapeXml(layer.title)} (${layer.codec.toUpperCase()}) -->`;

    if (layer.kind === "bitmap" && layer.bitmapFilename) {
      const bmpPath = path.join(manifest.projectDir, layer.bitmapFilename);
      if (!fs.existsSync(bmpPath)) continue;

      const b64 = fs.readFileSync(bmpPath).toString("base64");
      const baseImgY = manifest.alignTop ? -Math.round(height * 0.72) : 0;
      const finalY = videoY + baseImgY + layer.yOffset;

      svgLayers.push(
        [
          comment,
          `  <g id="${safeId}" data-track-index="${layer.index}" data-kind="bitmap" data-lang="${escapeXml(layer.language)}" opacity="${opacity}" transform="translate(0, ${finalY})">`,
          `    <image href="data:image/png;base64,${b64}" width="${width}" height="${height}" x="0" y="0"/>`,
          `  </g>`,
        ].join("\n"),
      );
    } else if (layer.kind === "text") {
      const fontSize = layer.fontSize ?? Math.max(28, Math.round(height * 0.044));
      const fontFamily = escapeXml(layer.fontFamily || "PingFang SC, Hiragino Sans GB, SF Pro Display, sans-serif");
      const fill = escapeXml(layer.fillColor || "#FFFFFF");
      const stroke = escapeXml(layer.strokeColor || "#000000");
      const strokeWidth = Math.max(4, Math.round(fontSize * 0.15));
      const lines = (layer.text ?? "").split(/\r?\n/).filter((l) => l.trim().length > 0);
      const lineStep = Math.round(fontSize * 1.32);

      const margin = Math.round(height * 0.075);
      const baseAnchorY = manifest.alignTop
        ? videoY + margin + fontSize + layer.yOffset
        : videoY + height - margin - Math.max(0, lines.length - 1) * lineStep + layer.yOffset;

      const centerX = Math.round(width / 2);
      const tspans =
        lines.length > 0
          ? lines
              .map((line, idx) => {
                const dy = idx === 0 ? 0 : lineStep;
                return `      <tspan x="${centerX}" dy="${dy}">${escapeXml(line)}</tspan>`;
              })
              .join("\n")
          : `      <tspan x="${centerX}" dy="0"></tspan>`;

      svgLayers.push(
        [
          comment,
          `  <g id="${safeId}" data-track-index="${layer.index}" data-kind="text" data-lang="${escapeXml(layer.language)}" opacity="${opacity}">`,
          `    <text x="${centerX}" y="${baseAnchorY}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="600" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" paint-order="stroke fill" filter="url(#framecraft-sub-shadow)">`,
          tspans,
          `    </text>`,
          `  </g>`,
        ].join("\n"),
      );
    }
  }

  return [
    `<svg width="100%" height="100%" viewBox="0 0 ${width} ${totalHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`,
    `  <defs>`,
    `    <filter id="framecraft-sub-shadow" x="-10%" y="-10%" width="120%" height="130%">`,
    `      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.82"/>`,
    `    </filter>`,
    `  </defs>`,
    `  <!-- Cinema #000000 baseplate prevents macOS QuickLook/Preview white-border artifacts -->`,
    `  <rect id="Layer-Baseplate" width="${width}" height="${totalHeight}" fill="#000000"/>`,
    `  <!-- 100% Source-Resolution Clean Frame -->`,
    `  <g id="Layer-0-CleanBackground" opacity="1">`,
    `    <image href="data:image/png;base64,${cleanB64}" width="${width}" height="${height}" x="0" y="${videoY}"/>`,
    `  </g>`,
    ...svgLayers,
    `</svg>`,
    "",
  ].join("\n");
}
