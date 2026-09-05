import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";

export const layoutsFilePath = join(
  homedir(),
  "Library",
  "Application Support",
  "Layouts",
  "layouts.json",
);

export type MiseSet = {
  name: string;
};

type LayoutsFile = {
  layouts?: Array<{ name?: string } | string>;
  sets?: Array<{ name?: string } | string>;
};

function normalizeName(entry: { name?: string } | string): string | null {
  if (typeof entry === "string") {
    const name = entry.trim();
    return name.length > 0 ? name : null;
  }
  if (entry && typeof entry.name === "string") {
    const name = entry.name.trim();
    return name.length > 0 ? name : null;
  }
  return null;
}

export async function loadSets(): Promise<MiseSet[]> {
  const raw = await readFile(layoutsFilePath, "utf-8");
  const data = JSON.parse(raw) as LayoutsFile;
  const entries = data.layouts ?? data.sets ?? [];
  const names = new Set<string>();
  const sets: MiseSet[] = [];

  for (const entry of entries) {
    const name = normalizeName(entry);
    if (name && !names.has(name)) {
      names.add(name);
      sets.push({ name });
    }
  }

  return sets.sort((a, b) => a.name.localeCompare(b.name));
}

export function applySetURL(name: string): string {
  return `layouts://apply?name=${encodeURIComponent(name)}`;
}

export function reloadSetsURL(): string {
  return "layouts://reload";
}
