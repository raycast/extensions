import { createHash } from "node:crypto";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { LocalStorage } from "@raycast/api";
import { cacheDir, codeSVG, drawPNG } from "./preview-files";
import { buildQRProps, type QRRenderProps, withLogoData } from "./qr-engine";
import { DEFAULT_SETTINGS, type Settings } from "./types";

const STORAGE_KEY = "saved-qrs-v1";
// The list's icons and its detail pane show these, the pane at 150 pt, so
// they're drawn at 512 px to stay sharp on a Retina screen.
const PREVIEW_SIZE = 512;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedQR {
  id: string;
  name: string;
  url: string;
  settings: Settings;
  savedAt: number;
}

// ─── Preview PNG ──────────────────────────────────────────────────────────────

// One folder per qrdx version and preview size, so an update or a new size
// redraws the previews when the list loads. Earlier folders and the 256 px
// previews of earlier versions, kept straight in saved-previews, are removed.
function previewDir(): string {
  return cacheDir("saved-previews", PREVIEW_SIZE);
}

/**
 * A preview's file: the code's id and a hash of what it draws, so an edited
 * code gets a new path (Raycast caches images by path).
 */
function previewPath(id: string, qrProps: QRRenderProps): string {
  const hash = createHash("sha256").update(JSON.stringify(qrProps)).digest("hex").slice(0, 12);
  return join(previewDir(), `${id}-${hash}.png`);
}

/** Where a saved code's preview is, once it's drawn. */
export function savedPreviewPath(saved: SavedQR): string {
  return previewPath(saved.id, savedToQRProps(saved));
}

/** Removes a saved code's previews, except the file at `keep`. */
function removePreviews(id: string, keep?: string): void {
  const dir = previewDir();
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name.startsWith(`${id}-`) && path !== keep) {
      rmSync(path, { force: true });
    }
  }
}

/**
 * Draws a saved code's preview, the code with any frame on a square, and
 * removes its earlier ones. A logo that can't be loaded throws, so the code
 * stays without a preview and is drawn again next time.
 */
export async function generateSavedPreview(id: string, qrProps: QRRenderProps): Promise<void> {
  const path = previewPath(id, qrProps);
  await drawPNG(codeSVG(await withLogoData(qrProps), PREVIEW_SIZE), path, PREVIEW_SIZE);
  removePreviews(id, path);
}

/**
 * Draws the previews `list` is missing (codes saved before this version and
 * size), one at a time. `onDrawn` runs after each, so the list can show it.
 * A preview that fails to draw is left out; the list shows an icon instead.
 */
export async function drawMissingPreviews(list: SavedQR[], onDrawn: () => void): Promise<void> {
  for (const saved of list) {
    if (existsSync(savedPreviewPath(saved))) continue;
    try {
      await generateSavedPreview(saved.id, savedToQRProps(saved));
      onDrawn();
    } catch {
      /* left without a preview */
    }
  }
}

export function deleteSavedPreview(id: string): void {
  try {
    removePreviews(id);
  } catch {
    /* ignore */
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** The saved codes as stored. */
async function readList(): Promise<SavedQR[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedQR[];
  } catch {
    return [];
  }
}

export async function loadSavedQRs(): Promise<SavedQR[]> {
  // Codes saved before frames have no frame settings: they're read with the
  // defaults (no frame) and keep their template, which still draws. What's
  // stored changes only when the code itself is saved again.
  return (await readList()).map((saved) => ({
    ...saved,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
  }));
}

async function persist(list: SavedQR[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function saveQR(entry: SavedQR): Promise<void> {
  const list = await readList();
  const existing = list.findIndex((q) => q.id === entry.id);
  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.unshift(entry);
  }
  await persist(list);
}

export async function deleteQR(id: string): Promise<void> {
  const list = await readList();
  await persist(list.filter((q) => q.id !== id));
  deleteSavedPreview(id);
}

// ─── Build QRProps from saved entry ──────────────────────────────────────────

export function savedToQRProps(saved: SavedQR): QRRenderProps {
  return buildQRProps(saved.url, saved.settings);
}
