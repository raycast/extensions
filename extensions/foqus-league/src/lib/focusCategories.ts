import { createHash } from "crypto";
import { writeFile, readFile } from "fs/promises";
import { homedir } from "os";
import * as path from "path";
import type { Category } from "./focusSetup.ts";

export const CATEGORIES_PATH = path.join(
  homedir(),
  "Library/Group Containers/SY64MV22J9.com.raycast.macos.shared",
  "Library/Application Support/Raycast Focus/categories.json",
);

const ICON = "bulls-eye-16";

export type FocusCategory = {
  id: string;
  title: string;
  apps: string[];
  websites: string[];
  builtin: boolean;
};

type RawCategory = {
  categoryId?: string;
  title?: string;
  apps?: unknown;
  websites?: unknown;
  kind?: unknown;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

export function parseCategories(json: string): FocusCategory[] {
  let rows: unknown;
  try {
    rows = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];

  const out: FocusCategory[] = [];
  for (const row of rows as RawCategory[]) {
    if (!row?.categoryId) continue;
    const kind = row.kind;
    out.push({
      id: row.categoryId,
      title: typeof row.title === "string" ? row.title : row.categoryId,
      apps: strings(row.apps),
      websites: strings(row.websites),
      builtin: typeof kind === "object" && kind !== null && "builtin" in kind,
    });
  }
  return out;
}

export async function readCategories(): Promise<FocusCategory[]> {
  try {
    return parseCategories(await readFile(CATEGORIES_PATH, "utf8"));
  } catch {
    return [];
  }
}

const tagFor = (goal: string) => createHash("sha256").update(goal.trim()).digest("hex").slice(0, 6);

export function categoryTitleFor(goal: string): string {
  const plain = goal
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^[a-z0-9]+( [a-z0-9]+)*$/i.test(plain)) return `Foqus ${plain}`;
  return `Foqus ${plain || "Focus"} ${tagFor(goal)}`;
}

export function categoryIdFor(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "focus-category"
  );
}

export function ownCategoryFor(goal: string): Category {
  const title = categoryTitleFor(goal);
  return { id: categoryIdFor(title), title };
}

export function builtinsAsLogged(categories: FocusCategory[], installed: Set<string>): FocusCategory[] {
  return categories.filter((c) => c.builtin).map((c) => ({ ...c, apps: c.apps.filter((app) => installed.has(app)) }));
}

export function findCategory(categories: FocusCategory[], title: string): FocusCategory | undefined {
  const wanted = title.trim().toLowerCase();
  return categories.find((c) => c.title.trim().toLowerCase() === wanted);
}

export function importFileName(goal: string): string {
  const { id } = ownCategoryFor(goal);
  return `${id.length > 60 ? `${id.slice(0, 53)}-${tagFor(goal)}` : id}.json`;
}

export async function writeImportFile(
  goal: string,
  stranded: { id: string; app: boolean }[],
  dir = path.join(homedir(), "Downloads"),
): Promise<string> {
  const category = {
    title: categoryTitleFor(goal),
    iconName: ICON,
    apps: stranded.filter((s) => s.app).map((s) => s.id),
    websites: stranded.filter((s) => !s.app).map((s) => s.id),
  };
  const file = path.join(dir, importFileName(goal));
  await writeFile(file, `${JSON.stringify([category], null, 2)}\n`, "utf8");
  return file;
}
