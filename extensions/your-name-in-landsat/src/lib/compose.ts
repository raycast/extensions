import { Jimp } from "jimp";
import { environment } from "@raycast/api";
import * as fs from "fs/promises";
import * as path from "path";
import { TILE_BASE_URL, TILE_HEIGHT, TILE_WIDTH, VARIANT_COUNTS } from "./tiles";

export const MAX_LETTERS = 16;
const ROW_BREAK = 4;
const GAP_RATIO = 0.1;
const SPACE_RATIO = 0.35;
const ROW_GAP_RATIO = 0.06;
const GAP_WIDTH = Math.round(TILE_WIDTH * GAP_RATIO);
const SPACE_WIDTH = Math.round(TILE_WIDTH * SPACE_RATIO);
const ROW_GAP = Math.round(TILE_HEIGHT * ROW_GAP_RATIO);

export type LetterPick = { letter: string; variant: number } | { space: true };

export function normalizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z ]/g, "").toLowerCase();
}

export function countLetters(name: string): number {
  return normalizeName(name).replace(/\s+/g, "").length;
}

export function pickLetters(name: string): LetterPick[] {
  const normalized = normalizeName(name);
  const available: Record<string, number[]> = {};
  for (const [letter, count] of Object.entries(VARIANT_COUNTS)) {
    available[letter] = Array.from({ length: count }, (_, i) => i);
  }
  const picks: LetterPick[] = [];
  for (const ch of normalized) {
    if (ch === " ") {
      picks.push({ space: true });
      continue;
    }
    let pool = available[ch];
    if (!pool) continue;
    if (pool.length === 0) {
      pool = Array.from({ length: VARIANT_COUNTS[ch] }, (_, i) => i);
      available[ch] = pool;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const variant = pool[idx];
    pool.splice(idx, 1);
    picks.push({ letter: ch, variant });
  }
  return picks;
}

export function pickTiles(picks: LetterPick[]): string[] {
  return picks
    .filter((p): p is { letter: string; variant: number } => !("space" in p))
    .map((p) => `${p.letter}_${p.variant}`);
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export type ComposeResult = {
  filePath: string;
  exportFilePath: string;
  tileIds: string[];
};

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function splitRows(picks: LetterPick[]): LetterPick[][] {
  const letters = pickTiles(picks);
  if (letters.length <= ROW_BREAK) return [picks];

  const half = Math.ceil(letters.length / 2);
  const rows: LetterPick[][] = [[], []];
  let letterCount = 0;
  let targetRow = 0;
  for (const p of picks) {
    if (targetRow === 0 && letterCount >= half) {
      if ("space" in p) continue;
      targetRow = 1;
    }
    if ("space" in p && rows[targetRow].length === 0) continue;
    rows[targetRow].push(p);
    if (!("space" in p)) letterCount++;
  }
  return rows.map(trimTrailingSpaces).filter((r) => r.length > 0);
}

function trimTrailingSpaces(row: LetterPick[]): LetterPick[] {
  let end = row.length;
  while (end > 0 && "space" in row[end - 1]) end--;
  return row.slice(0, end);
}

type LoadedImage = Awaited<ReturnType<typeof Jimp.read>>;
type Segment = { kind: "letter" | "space"; width: number; image?: LoadedImage };

function rowSegments(
  picks: LetterPick[],
  tileImagesIter: Iterator<LoadedImage>,
): { segments: Segment[]; width: number } {
  const segments: Segment[] = [];
  let totalWidth = 0;

  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    if ("space" in p) {
      segments.push({ kind: "space", width: SPACE_WIDTH });
      totalWidth += SPACE_WIDTH;
    } else {
      segments.push({ kind: "letter", width: TILE_WIDTH, image: tileImagesIter.next().value });
      totalWidth += TILE_WIDTH;
      const next = picks[i + 1];
      if (next && !("space" in next)) totalWidth += GAP_WIDTH;
    }
  }
  return { segments, width: totalWidth };
}

async function composeRows(rows: LetterPick[][], tileImages: LoadedImage[]): Promise<Buffer> {
  const iter = tileImages[Symbol.iterator]();
  const rowData = rows.map((row) => rowSegments(row, iter));

  const canvasWidth = Math.max(...rowData.map((r) => r.width));
  const canvasHeight = rowData.length * TILE_HEIGHT + (rowData.length - 1) * ROW_GAP;
  const canvas = new Jimp({ width: canvasWidth, height: canvasHeight, color: 0x00000000 });

  let y = 0;
  for (const row of rowData) {
    let x = Math.round((canvasWidth - row.width) / 2);
    for (let i = 0; i < row.segments.length; i++) {
      const seg = row.segments[i];
      if (seg.kind === "letter" && seg.image) {
        canvas.composite(seg.image, x, y);
        x += seg.width;
        const next = row.segments[i + 1];
        if (next && next.kind === "letter") x += GAP_WIDTH;
      } else {
        x += seg.width;
      }
    }
    y += TILE_HEIGHT + ROW_GAP;
  }

  return canvas.getBuffer("image/png");
}

async function composeFromPicks(name: string, picks: LetterPick[], tileIds: string[]): Promise<ComposeResult> {
  const tileBuffers = await Promise.all(tileIds.map((id) => fetchBuffer(`${TILE_BASE_URL}/${id}.jpg`)));
  const tileImages = await Promise.all(tileBuffers.map((buf) => Jimp.read(buf)));

  const [displayBuffer, exportBuffer] = await Promise.all([
    composeRows(splitRows(picks), tileImages),
    composeRows([picks], tileImages),
  ]);

  const dir = path.join(environment.supportPath, "generations");
  await fs.mkdir(dir, { recursive: true });
  const baseName = normalizeName(name).replace(/\s+/g, "_") || "landsat";
  const hash = hashString(tileIds.join("|") + Date.now());
  const filePath = path.join(dir, `${baseName}-${hash}.png`);
  const exportFilePath = path.join(dir, `${baseName}-${hash}-export.png`);
  await Promise.all([fs.writeFile(filePath, displayBuffer), fs.writeFile(exportFilePath, exportBuffer)]);

  return { filePath, exportFilePath, tileIds };
}

export async function generate(name: string): Promise<ComposeResult> {
  const picks = pickLetters(name);
  const tileIds = pickTiles(picks);
  if (tileIds.length === 0) throw new Error("Name must contain at least one letter");
  if (tileIds.length > MAX_LETTERS) throw new Error(`Name too long (max ${MAX_LETTERS} letters)`);
  return composeFromPicks(name, picks, tileIds);
}
