import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { PRESETS, presetById } from "./presets";
import type { AICommand } from "./types";

const KEY = "ai-commands.v1";

/** All commands, presets first on first run. Presets the user deleted stay deleted. */
export async function loadCommands(): Promise<AICommand[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) {
    const fresh = clone(PRESETS);
    await save(fresh);
    return fresh;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.map(normalize);
  } catch {
    // Unreadable storage must not brick the extension: start over with presets.
    const fresh = clone(PRESETS);
    await save(fresh);
    return fresh;
  }
}

/** Fills in fields that older or hand-edited records may lack. */
function normalize(c: Partial<AICommand>): AICommand {
  return {
    id: c.id ?? randomUUID(),
    title: c.title ?? "Untitled",
    icon: c.icon ?? "Wand",
    prompt: c.prompt ?? "",
    provider: c.provider === "anthropic" ? "anthropic" : "openai",
    model: c.model ?? "",
    mode: c.mode === "paste" || c.mode === "copy" ? c.mode : "preview",
    preset: c.preset,
    createdAt: c.createdAt ?? 0,
    updatedAt: c.updatedAt ?? 0,
  };
}

/** Never hand out the module-level PRESETS array: callers mutate what they get. */
function clone(list: AICommand[]): AICommand[] {
  return list.map((c) => ({ ...c }));
}

/** Re-adds any preset that was deleted. Existing commands are untouched. */
export async function restorePresets(): Promise<number> {
  const all = await loadCommands();
  const have = new Set(all.map((c) => c.id));
  const missing = PRESETS.filter((p) => !have.has(p.id)).map((p) => ({ ...p, updatedAt: Date.now() }));
  if (missing.length) await save([...all, ...missing]);
  return missing.length;
}

async function save(commands: AICommand[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(commands));
}

/** Looks up a command by id. A preset that was deleted still resolves to its built-in version, so hotkeys never break. */
export async function getCommand(id: string): Promise<AICommand | undefined> {
  const all = await loadCommands();
  return all.find((c) => c.id === id) ?? presetById(id);
}

export async function upsertCommand(cmd: AICommand): Promise<void> {
  const all = await loadCommands();
  const i = all.findIndex((c) => c.id === cmd.id);
  if (i === -1) all.unshift(cmd);
  else all[i] = cmd;
  await save(all);
}

export async function deleteCommand(id: string): Promise<void> {
  await save((await loadCommands()).filter((c) => c.id !== id));
}

/** Puts a preset back to how it shipped. */
export async function resetPreset(id: string): Promise<void> {
  const original = presetById(id);
  if (!original) return;
  await upsertCommand({ ...original, updatedAt: Date.now() });
}

export function newCommand(partial: Omit<AICommand, "id" | "createdAt" | "updatedAt">): AICommand {
  const now = Date.now();
  return { ...partial, id: randomUUID(), createdAt: now, updatedAt: now };
}
