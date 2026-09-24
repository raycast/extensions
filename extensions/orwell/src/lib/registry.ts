import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { RegistryEntry } from "./types";

const ORWELL_DIR = join(homedir(), ".orwell");
const REGISTRY_PATH = join(ORWELL_DIR, "registry.json");

export async function loadRegistry(): Promise<RegistryEntry[]> {
  try {
    const raw = await readFile(REGISTRY_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveRegistry(entries: RegistryEntry[]): Promise<void> {
  if (!existsSync(ORWELL_DIR)) {
    await mkdir(ORWELL_DIR, { recursive: true });
  }
  await writeFile(REGISTRY_PATH, JSON.stringify(entries, null, 2));
}

export async function upsertEntry(entry: RegistryEntry): Promise<void> {
  const registry = await loadRegistry();
  const idx = registry.findIndex((e) => e.projectDir === entry.projectDir);
  if (idx >= 0) {
    registry[idx] = entry;
  } else {
    registry.push(entry);
  }
  await saveRegistry(registry);
}

export async function removeEntry(projectDir: string): Promise<void> {
  const registry = await loadRegistry();
  const filtered = registry.filter((e) => e.projectDir !== projectDir);
  await saveRegistry(filtered);
}
