import { execFile, spawn } from "child_process";
import { stat } from "fs/promises";
import { homedir } from "os";
import * as path from "path";
import { promisify } from "util";
import type { LoggedBlocks } from "./types.ts";

const exec = promisify(execFile);

const DOMAIN = "com.raycast.macos";
const ITEMS_KEY = "raycast-startFocusSession-blockable-items";
const MODE_KEY = "raycast-startFocusSession-filter-mode";
const TITLE_KEY = "raycast-startFocusSession-title";

async function exportDomain(): Promise<Buffer> {
  const { stdout } = await exec("/usr/bin/defaults", ["export", DOMAIN, "-"], {
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
}

function extract(plist: Buffer, key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/plutil", ["-extract", key, "raw", "-o", "-", "-"]);
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d: string) => (out += d));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (d: string) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err.trim() || `plutil exited ${code}`))));
    child.stdin.on("error", () => {});
    child.stdin.end(plist);
  });
}

const CATEGORY_SOURCE = "1_presets";

const APP_SOURCE = "2_systemApps";

export type FilterMode = "block" | "allow";

export type Category = { id: string; title: string };

export type Stranded = { id: string; title: string; app: boolean };

export type FocusSetup = {
  categories: Category[];
  mode: FilterMode;
  skipped: Stranded[];
  goal: string;
};

type BlockableItem = { id?: string; title?: string; source?: { id?: string } };

export function categoriesFromItems(json: string): { categories: Category[]; skipped: Stranded[] } {
  let items: unknown;
  try {
    items = JSON.parse(json);
  } catch {
    return { categories: [], skipped: [] };
  }
  if (!Array.isArray(items)) return { categories: [], skipped: [] };

  const categories: Category[] = [];
  const skipped: Stranded[] = [];
  for (const item of items as BlockableItem[]) {
    if (!item?.id) continue;
    if (item.source?.id === CATEGORY_SOURCE) categories.push({ id: item.id, title: item.title ?? item.id });
    else skipped.push({ id: item.id, title: item.title ?? item.id, app: item.source?.id === APP_SOURCE });
  }
  return { categories, skipped };
}

export function decodeItems(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "[]";
  if (trimmed.startsWith("[")) return trimmed;
  const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
  return decoded.startsWith("[") ? decoded : null;
}

export function setupFromExtracts(itemsRaw: string, mode: string, title: string): FocusSetup {
  const json = decodeItems(itemsRaw);
  const { categories, skipped } = categoriesFromItems(json ?? "");
  return {
    categories,
    skipped,
    mode: mode.trim() === "allow" ? "allow" : "block",
    goal: title.trim(),
  };
}

async function readSetupNow(): Promise<FocusSetup | null> {
  try {
    const plist = await exportDomain();
    const [items, mode, title] = await Promise.all([
      extract(plist, ITEMS_KEY),
      extract(plist, MODE_KEY),
      extract(plist, TITLE_KEY).catch(() => ""),
    ]);
    return setupFromExtracts(items, mode, title);
  } catch {
    return null;
  }
}

const PLIST = path.join(homedir(), "Library/Preferences", `${DOMAIN}.plist`);

const MEMO_MS = 10 * 60_000;

let memo: { mtimeMs: number; at: number; setup: FocusSetup | null } | undefined;

export async function readFocusSetup(): Promise<FocusSetup | null> {
  const mtimeMs = await stat(PLIST)
    .then((s) => s.mtimeMs)
    .catch(() => 0);
  if (memo && mtimeMs && memo.mtimeMs === mtimeMs && Date.now() - memo.at < MEMO_MS) return memo.setup;
  const setup = await readSetupNow();
  memo = { mtimeMs, at: Date.now(), setup };
  return setup;
}

export type OwnedCategory = { id: string; title: string; apps: string[]; websites: string[] };

function titleForApp(bundleId: string): string {
  return bundleId.split(".").pop() || bundleId;
}

export function setupFromBlocked(goal: string, blocked: LoggedBlocks, owned: OwnedCategory[]): FocusSetup {
  const apps = new Set(blocked.apps);
  const websites = new Set(blocked.websites);

  const categories: Category[] = [];
  for (const category of owned) {
    const members = [...category.apps, ...category.websites];
    if (!members.length) continue;
    if (!category.apps.every((a) => apps.has(a)) || !category.websites.every((w) => websites.has(w))) continue;
    categories.push({ id: category.id, title: category.title });
    for (const a of category.apps) apps.delete(a);
    for (const w of category.websites) websites.delete(w);
  }

  return {
    goal,
    mode: blocked.mode,
    categories,
    skipped: [
      ...[...apps].map((id) => ({ id, title: titleForApp(id), app: true })),
      ...[...websites].map((id) => ({ id, title: id, app: false })),
    ],
  };
}
