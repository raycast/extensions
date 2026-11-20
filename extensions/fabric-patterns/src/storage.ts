import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { CUSTOM_DIR, readSystemPrompt } from "../lib/loaders";
import type { OutputMode } from "../lib/output";
import { DEFAULT_FABRIC_PATH, isRunnableFile, pastedPath, resolveFabricPath } from "../lib/paths";
import { itemId, type ItemType } from "../lib/actions";
import { type ModelPair, ModelStore } from "../lib/models";
import { type KV, type Usage, UsageStore } from "../lib/store";

const localKV: KV = {
  get: async (k) => {
    const v = await LocalStorage.getItem<string>(k);
    return typeof v === "string" ? v : undefined;
  },
  set: (k, v) => LocalStorage.setItem(k, v),
};

export const usageStore = () => new UsageStore(localKV);
export const modelStore = () => new ModelStore(localKV);

/** The model pinned to a pattern, read fresh. Never throws: a pin that can't be read runs as if unpinned. */
export async function modelPinFor(pattern: string): Promise<ModelPair | undefined> {
  try {
    return (await modelStore().load())[pattern];
  } catch {
    return undefined;
  }
}

/** A pattern's system.md, Custom Patterns first, as Preferences hold that folder now. */
export const systemPromptFor = (name: string) => readSystemPrompt(name, { myPatternsDir: prefs().myPatternsFolder });

/** Counts a run for the Search ranking. Never throws or rejects, and the views don't await it, so it never holds up a run: a count that fails to save only leaves the ranking one run behind. */
export function countRun(store: UsageStore, id: string, onSaved: (u: Usage) => void): Promise<void> {
  return store.recordRun(id).then(onSaved, () => undefined);
}

/** Moves a renamed item's pin and run count, and a pattern's pinned model; a new item (no `from`) has none. Never throws. */
export async function movePin(type: ItemType, from: string | undefined, to: string) {
  if (!from) return;
  try {
    await usageStore().rename(itemId(type, from), itemId(type, to));
  } catch {
    /* the item is renamed; at worst its pin shows as gone and can be unpinned */
  }
  if (type !== "pattern") return;
  try {
    await modelStore().rename(from, to);
  } catch {
    /* the renamed pattern runs on fabric's choice of model until it is pinned again */
  }
}

/** A deleted pattern's pin, run count and pinned model go with it. Never throws. */
export async function forgetItem(store: UsageStore, type: ItemType, name: string): Promise<Usage | undefined> {
  if (type === "pattern")
    await modelStore()
      .unpin(name)
      .catch(() => undefined);
  return store.forget(itemId(type, name)).catch(() => undefined);
}

// saveFolder and customPatternsFolder were outputFolder and myPatternsFolder while they were
// directory pickers. Raycast kept serving the picker's old value under those names after they
// became text fields, ignoring what was typed (manual test, 2026-10-18), so the keys are new.
function readPrefs() {
  const { saveFolder, customPatternsFolder, ...p } = getPreferenceValues<Preferences>();
  return {
    ...p,
    fabricPath: resolveFabricPath(pastedPath(p.fabricPath, homedir()) || DEFAULT_FABRIC_PATH, isRunnableFile),
    defaultOutput: (p.defaultOutput || "clipboard") as OutputMode,
    outputFolder: pastedPath(saveFolder, homedir()),
    myPatternsFolder: pastedPath(customPatternsFolder, homedir()) || CUSTOM_DIR,
  };
}

export type Prefs = ReturnType<typeof readPrefs>;

// Every property read asks Raycast again. Raycast reopens a still-open command without
// re-rendering it, so values captured at render would be the first launch's (manual test,
// 2026-10-18); a live view keeps render code and action handlers on the same, current values.
const live = new Proxy({} as Prefs, { get: (_t, k) => readPrefs()[k as keyof Prefs] });

export const prefs = (): Prefs => live;

/** A folder picker's starting value: the folder, if it exists (a picker can't show one that doesn't). */
export const pickerSeed = (folder?: string): string[] => (folder && existsSync(folder) ? [folder] : []);
