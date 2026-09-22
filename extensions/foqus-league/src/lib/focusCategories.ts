import { writeFile, readFile } from "fs/promises";
import { homedir } from "os";
import * as path from "path";

export const CATEGORIES_PATH = path.join(
  homedir(),
  "Library/Group Containers/SY64MV22J9.com.raycast.macos.shared",
  "Library/Application Support/Raycast Focus/categories.json",
);

export const IMPORT_URL = "raycast://extensions/raycast/raycast-focus/import-focus-categories";

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

export function categoryTitleFor(goal: string): string {
  const plain = goal
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return `Foqus ${plain || "Focus"}`;
}

export function findCategory(categories: FocusCategory[], title: string): FocusCategory | undefined {
  const wanted = title.trim().toLowerCase();
  return categories.find((c) => c.title.trim().toLowerCase() === wanted);
}

function slugFor(goal: string): string {
  const slug = goal.trim().toLowerCase().replace(/\W+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return slug || "focus";
}

export async function writeImportFile(
  goal: string,
  stranded: { id: string; app: boolean }[],
  dir = path.join(homedir(), "Downloads"),
): Promise<string> {
  const file = path.join(dir, `foqus-${slugFor(goal)}.json`);
  const category = {
    title: categoryTitleFor(goal),
    iconName: ICON,
    apps: stranded.filter((s) => s.app).map((s) => s.id),
    websites: stranded.filter((s) => !s.app).map((s) => s.id),
  };
  await writeFile(file, `${JSON.stringify([category], null, 2)}\n`, "utf8");
  return file;
}
