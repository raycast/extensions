import { execSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { environment, LocalStorage } from "@raycast/api";
import type { QRProps } from "qrdx";
import type { Settings } from "./types";

const STORAGE_KEY = "saved-qrs-v1";
const PREVIEW_SIZE = 256;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedQR {
  id: string;
  name: string;
  url: string;
  settings: Settings;
  savedAt: number;
}

// ─── Preview PNG ──────────────────────────────────────────────────────────────

function previewDir(): string {
  const dir = join(environment.supportPath, "saved-previews");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function savedPreviewPath(id: string): string {
  return join(previewDir(), `${id}.png`);
}

export function generateSavedPreview(id: string, svgString: string): void {
  const dir = previewDir();
  const svgPath = join(dir, `${id}.svg`);
  const pngPath = join(dir, `${id}.png`);
  writeFileSync(
    svgPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`,
    "utf-8",
  );
  try {
    execSync(
      `sips -s format png "${svgPath}" --out "${pngPath}" --resampleHeightWidth ${PREVIEW_SIZE} ${PREVIEW_SIZE} 2>/dev/null`,
      { stdio: "pipe" },
    );
  } finally {
    try {
      unlinkSync(svgPath);
    } catch {
      /* ignore */
    }
  }
}

export function deleteSavedPreview(id: string): void {
  const pngPath = savedPreviewPath(id);
  try {
    if (existsSync(pngPath)) unlinkSync(pngPath);
  } catch {
    /* ignore */
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function loadSavedQRs(): Promise<SavedQR[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedQR[];
  } catch {
    return [];
  }
}

async function persist(list: SavedQR[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function saveQR(entry: SavedQR): Promise<void> {
  const list = await loadSavedQRs();
  const existing = list.findIndex((q) => q.id === entry.id);
  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.unshift(entry);
  }
  await persist(list);
}

export async function deleteQR(id: string): Promise<void> {
  const list = await loadSavedQRs();
  await persist(list.filter((q) => q.id !== id));
  deleteSavedPreview(id);
}

// ─── Build QRProps from saved entry ──────────────────────────────────────────

export function savedToQRProps(saved: SavedQR): QRProps & { size: number } {
  const s = saved.settings;
  const size = Math.max(64, Number.parseInt(s.size || "512", 10) || 512);
  const margin = Number.parseInt(s.margin || "0", 10) || 0;
  const props: QRProps & { size: number } = {
    value: saved.url.trim() || "https://qrdx.dev",
    size,
    margin,
    level: s.level || "Q",
    bodyPattern: s.bodyPattern,
    cornerEyePattern: s.cornerEyePattern,
    cornerEyeDotPattern: s.cornerEyeDotPattern,
    fgColor: s.fgColor || "#000000",
    bgColor: s.bgColor || "#ffffff",
  };
  if (s.eyeColor?.trim()) props.eyeColor = s.eyeColor;
  if (s.dotColor?.trim()) props.dotColor = s.dotColor;
  if (s.templateId?.trim()) props.templateId = s.templateId;
  if (s.logo?.trim()) {
    props.imageSettings = {
      src: s.logo,
      height: Math.round(size * 0.2),
      width: Math.round(size * 0.2),
      excavate: true,
    };
  }
  return props;
}
