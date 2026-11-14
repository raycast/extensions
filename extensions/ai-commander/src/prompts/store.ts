/**
 * Persistence in Raycast `LocalStorage`, the only module here that touches `@raycast/api`.
 *
 * Everything lives in one JSON document, so a change is atomic: the list of added examples cannot drift from the
 * prompts it describes. All operations run through a queue and re-read the document, which prevents lost updates
 * within a process. Separate commands are separate processes, and that race is accepted: the writes are rare,
 * user-driven, and LocalStorage offers no transaction.
 *
 * Nothing unreadable is ever overwritten. A broken document is copied to a quarantine key and every operation then
 * fails with `StoreCorruptedError` until the user restores the backup or resets. Before each write the previous good
 * document goes to the backup key. Single unreadable entries are carried along and reported, not dropped.
 */

import { Icon, LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import type { DefaultModel, ModelRef, OpenRouterPrivacy, PromptDef, TextSnippet } from "../core/types";
import { createExamplePrompts } from "./examples";
import { isQuotableSnippetName, UNQUOTABLE_SNIPPET_NAME } from "./template/snippets";
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyState,
  migrate,
  parsePersistedState,
  serializeState,
  type ParsedState,
  type PersistedState,
  type SchemaIssue,
} from "./schema";
import {
  applyImportPlan,
  buildExport,
  type ApplyOptions,
  type ExportDocument,
  type ImportPlan,
  type ImportSummary,
} from "./transfer";

export const STORAGE_KEY = "ai-commander.state";
export const BACKUP_KEY = "ai-commander.state.backup";
export const QUARANTINE_KEY = "ai-commander.state.corrupted";

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}

/** The stored data cannot be read. Offer `restoreBackup` when `hasBackup` is true, otherwise `resetStore`. */
export class StoreCorruptedError extends StoreError {
  constructor(
    message: string,
    readonly hasBackup: boolean,
  ) {
    super(message);
    this.name = "StoreCorruptedError";
  }
}

type Parsed = { raw: string | undefined; parsed: ParsedState };

function parseDocument(raw: unknown): ParsedState | undefined {
  if (typeof raw !== "string") return undefined;
  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const migrated = migrate(document);
  return migrated.ok ? parsePersistedState(migrated.document) : undefined;
}

let queue: Promise<unknown> = Promise.resolve();
let lastIssues: SchemaIssue[] = [];

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  // A failed task must not stall the ones behind it. Its caller still sees the rejection through `run`.
  queue = run.catch(() => undefined);
  return run;
}

async function write(parsed: ParsedState, previous: string | undefined): Promise<void> {
  if (previous !== undefined) await LocalStorage.setItem(BACKUP_KEY, previous);
  await LocalStorage.setItem(STORAGE_KEY, serializeState(parsed));
}

function fresh(): ParsedState {
  return { state: createEmptyState(), invalidPrompts: [], invalidSnippets: [], issues: [] };
}

async function load(): Promise<Parsed> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  const raw = stored === undefined ? undefined : String(stored);

  let parsed: ParsedState;
  if (stored === undefined) {
    parsed = fresh();
  } else {
    const result = parseDocument(stored);
    if (!result) {
      await LocalStorage.setItem(QUARANTINE_KEY, String(stored));
      const hasBackup = parseDocument(await LocalStorage.getItem<string>(BACKUP_KEY)) !== undefined;
      throw new StoreCorruptedError("Stored prompts could not be read. A copy of the data was kept.", hasBackup);
    }
    parsed = result;
  }
  lastIssues = parsed.issues;

  // A newer build manages its own examples; adding ours to its data could bring back deleted ones.
  const isFuture = parsed.state.schemaVersion > CURRENT_SCHEMA_VERSION;
  const added = new Set(parsed.state.seededExamples);
  const missing = isFuture ? [] : createExamplePrompts(Date.now()).filter((example) => !added.has(example.id));
  if (missing.length > 0) {
    // A prompt that already has an example's ID, an imported one for instance, stays as it is.
    const known = new Set(parsed.state.prompts.map((prompt) => prompt.id));
    parsed.state.prompts.push(...missing.filter((example) => !known.has(example.id)));
    parsed.state.seededExamples.push(...missing.map((example) => example.id));
    await write(parsed, raw);
    return { raw: serializeState(parsed), parsed };
  }
  return { raw, parsed };
}

function read<T>(select: (state: PersistedState) => T): Promise<T> {
  return enqueue(async () => select((await load()).parsed.state));
}

/** A throw from `change` leaves storage untouched. */
function mutate<T>(change: (state: PersistedState) => T): Promise<T> {
  return enqueue(async () => {
    const { raw, parsed } = await load();
    const result = change(parsed.state);
    await write(parsed, raw);
    return result;
  });
}

/** Entries found unreadable by the latest operation. They stay in storage; show them instead of hiding them. */
export function getLoadIssues(): readonly SchemaIssue[] {
  return lastIssues;
}

/** Puts the last good document back. The quarantined copy stays. */
export function restoreBackup(): Promise<void> {
  return enqueue(async () => {
    const backup = await LocalStorage.getItem<string>(BACKUP_KEY);
    if (typeof backup !== "string" || !parseDocument(backup)) throw new StoreError("No usable backup exists.");
    await LocalStorage.setItem(STORAGE_KEY, backup);
  });
}

/** Starts empty after explicit confirmation. Examples stay deleted; the quarantined copy stays. */
export function resetStore(): Promise<void> {
  return enqueue(async () => {
    const parsed = fresh();
    parsed.state.seededExamples = createExamplePrompts(Date.now()).map((example) => example.id);
    await LocalStorage.setItem(STORAGE_KEY, serializeState(parsed));
    lastIssues = [];
  });
}

export function getPrompts(): Promise<PromptDef[]> {
  return read((state) => state.prompts);
}

export function getPrompt(id: string): Promise<PromptDef | undefined> {
  return read((state) => state.prompts.find((prompt) => prompt.id === id));
}

export type PromptDraft = Omit<PromptDef, "id" | "createdAt" | "updatedAt" | "lastUsedAt">;

export function createPrompt(draft: PromptDraft): Promise<PromptDef> {
  return mutate((state) => {
    const now = Date.now();
    const prompt: PromptDef = { ...draft, id: randomUUID(), createdAt: now, updatedAt: now };
    state.prompts.push(prompt);
    return prompt;
  });
}

function findPrompt(state: PersistedState, id: string): PromptDef {
  const prompt = state.prompts.find((entry) => entry.id === id);
  if (!prompt) throw new StoreError("Prompt Not Found");
  return prompt;
}

/** The ID is frozen because quicklinks store it. Keys set to undefined remove optional fields. */
export function updatePrompt(id: string, patch: Partial<PromptDraft>): Promise<PromptDef> {
  return mutate((state) => {
    const prompt = findPrompt(state, id);
    Object.assign(prompt, patch, { id, updatedAt: Date.now() });
    return prompt;
  });
}

/** Deleting a missing prompt is fine: the goal state is already reached. */
export function deletePrompt(id: string): Promise<void> {
  return mutate((state) => {
    state.prompts = state.prompts.filter((prompt) => prompt.id !== id);
  });
}

export function duplicatePrompt(id: string): Promise<PromptDef> {
  return mutate((state) => {
    const source = findPrompt(state, id);
    const now = Date.now();
    const copy: PromptDef = {
      ...source,
      id: randomUUID(),
      name: `${source.name} Copy`,
      createdAt: now,
      updatedAt: now,
    };
    delete copy.lastUsedAt;
    state.prompts.push(copy);
    return copy;
  });
}

/** Silently ignores a prompt that was deleted while it ran: a finished run should not fail on bookkeeping. */
export function markPromptUsed(id: string, usedAt: number = Date.now()): Promise<void> {
  return mutate((state) => {
    const prompt = state.prompts.find((entry) => entry.id === id);
    if (prompt) prompt.lastUsedAt = usedAt;
  });
}

export function getSnippets(): Promise<TextSnippet[]> {
  return read((state) => state.snippets);
}

function assertSnippetNameUsable(state: PersistedState, name: string, ownId?: string): void {
  if (!isQuotableSnippetName(name)) throw new StoreError(UNQUOTABLE_SNIPPET_NAME);
  if (state.snippets.some((snippet) => snippet.name === name && snippet.id !== ownId)) {
    throw new StoreError(`A snippet named "${name}" already exists.`);
  }
}

/** Names must be unique and quotable because templates reference snippets by name. */
export function createSnippet(draft: Pick<TextSnippet, "name" | "text">): Promise<TextSnippet> {
  return mutate((state) => {
    assertSnippetNameUsable(state, draft.name);
    const snippet: TextSnippet = { ...draft, id: randomUUID(), updatedAt: Date.now() };
    state.snippets.push(snippet);
    return snippet;
  });
}

export function updateSnippet(id: string, patch: Partial<Pick<TextSnippet, "name" | "text">>): Promise<TextSnippet> {
  return mutate((state) => {
    const snippet = state.snippets.find((entry) => entry.id === id);
    if (!snippet) throw new StoreError("Snippet Not Found");
    if (patch.name !== undefined) assertSnippetNameUsable(state, patch.name, id);
    Object.assign(snippet, patch, { updatedAt: Date.now() });
    return snippet;
  });
}

export function deleteSnippet(id: string): Promise<void> {
  return mutate((state) => {
    state.snippets = state.snippets.filter((snippet) => snippet.id !== id);
  });
}

export function getDefaultModel(): Promise<DefaultModel | undefined> {
  return read((state) => state.defaultModel);
}

export function setDefaultModel(model: DefaultModel | undefined): Promise<void> {
  return mutate((state) => {
    if (model) state.defaultModel = model;
    else delete state.defaultModel;
  });
}

export function getFavorites(): Promise<ModelRef[]> {
  return read((state) => state.favorites);
}

export function setFavorites(favorites: readonly ModelRef[]): Promise<void> {
  return mutate((state) => {
    state.favorites = [...favorites];
  });
}

function sameModel(a: ModelRef, b: ModelRef): boolean {
  return a.provider === b.provider && a.modelId === b.modelId;
}

/** Returns whether the model is a favorite afterwards. */
export function toggleFavorite(model: ModelRef): Promise<boolean> {
  return mutate((state) => {
    const remaining = state.favorites.filter((entry) => !sameModel(entry, model));
    const added = remaining.length === state.favorites.length;
    state.favorites = added ? [...remaining, model] : remaining;
    return added;
  });
}

/** Everything a run needs from storage in one read: each load parses and validates the whole document. */
export function getRunSettings(): Promise<Pick<PersistedState, "defaultModel" | "openRouterPrivacy">> {
  return read(({ defaultModel, openRouterPrivacy }) => ({ defaultModel, openRouterPrivacy }));
}

export function getOpenRouterPrivacy(): Promise<OpenRouterPrivacy> {
  return read((state) => state.openRouterPrivacy);
}

export function setOpenRouterPrivacy(privacy: OpenRouterPrivacy): Promise<void> {
  return mutate((state) => {
    state.openRouterPrivacy = privacy;
  });
}

export function exportAll(now: number = Date.now()): Promise<ExportDocument> {
  return read((state) => buildExport(state, now));
}

/** Applies a plan against the current data, so a change made while the dialog was open is not lost. */
export function applyImport(plan: ImportPlan, options: ApplyOptions): Promise<ImportSummary> {
  return mutate((state) => {
    const outcome = applyImportPlan(plan, state, options);
    state.prompts = outcome.prompts;
    state.snippets = outcome.snippets;
    if (outcome.settings) Object.assign(state, outcome.settings);
    return outcome.summary;
  });
}

/**
 * Maps a Raycast icon name (`globe-01`) to a key of the `Icon` enum (`Globe`), for `ImportOptions.resolveIcon`. Enum
 * values carry a size suffix that ray.so's names lack, so that suffix is ignored.
 */
export function raycastIconKey(name: string): string | undefined {
  if (name in Icon) return name;
  return Object.entries(Icon).find(([, value]) => value === name || value === `${name}-16`)?.[0];
}

export { CURRENT_SCHEMA_VERSION };
