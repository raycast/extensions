/**
 * Export, import and the Raycast AI Commands import.
 *
 * Raycast's manual does not describe its JSON. The format below comes from the source of ray.so/prompts
 * (github.com/raycast/ray-so, `app/(navigation)/prompts/utils/actions.ts` and `utils/sanitizePromptContent.tsx`, read
 * 2026-11-02; the older repository github.com/raycast/prompts no longer exists):
 *   [{ "title": string, "prompt": string, "icon": string, "creativity": "none"|…|"maximum", "model": string }]
 * A shared entry may also carry `highlightEdits: boolean`. Icons are kebab-case names such as `globe-01`, and models
 * are Raycast's own IDs such as `anthropic-claude-haiku-5-5` or `openai-gpt-5.6-luna`. An export from the Raycast app
 * itself was not available; it is assumed to follow the same shape.
 */
import { renameSnippetReferences } from "./template/snippets";

import { createHash, randomUUID } from "node:crypto";
import { isRecord } from "../core/guards";
import type { CreativityLevel, ModelRef, PromptDef, ProviderId, TextSnippet } from "../core/types";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_OPENROUTER_PRIVACY,
  migrate,
  validateDefaultModel,
  validateList,
  validateModelRef,
  validateOpenRouterPrivacy,
  validatePromptDef,
  validateTextSnippet,
  type PersistedState,
} from "./schema";
import { allowedOutputModes, canHighlightChanges, validateTemplate } from "./template/validate";

export const EXPORT_FORMAT = "ai-commander-export";

/** Sanity limits: an import is a hand-picked file of prompts, and LocalStorage is not meant for bulk data. */
const MAX_IMPORT_CHARS = 10_000_000;
const MAX_IMPORT_ENTRIES = 5_000;
const BYTE_ORDER_MARK = 0xfeff;

export type TransferSettings = Pick<PersistedState, "defaultModel" | "favorites" | "openRouterPrivacy">;

export interface ExportDocument {
  format: typeof EXPORT_FORMAT;
  schemaVersion: number;
  exportedAt: number;
  prompts: PromptDef[];
  snippets: TextSnippet[];
  settings: TransferSettings;
}

export type ExportInput = Pick<
  PersistedState,
  "prompts" | "snippets" | "defaultModel" | "favorites" | "openRouterPrivacy"
>;

/** The file itself could not be used. Single bad entries are reported in `ParsedImport.issues` instead. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export interface ImportIssue {
  /** `prompts[2].output`, or a position such as `commands[2]`. */
  path: string;
  message: string;
  /** `skipped`: the entry was not imported. `warning`: imported, but needs attention. */
  severity: "skipped" | "warning";
}

export interface ParsedImport {
  source: "ai-commander" | "raycast";
  prompts: PromptDef[];
  snippets: TextSnippet[];
  /** Only in AI-Commander files. */
  settings?: TransferSettings;
  issues: ImportIssue[];
}

export interface ImportOptions {
  /** Models the user can reach. Without it every Raycast model falls back to the default model. */
  knownModels?: readonly ModelRef[];
  /** Maps a Raycast icon name to a key of the `Icon` enum; see `raycastIconKey` in `store.ts`. */
  resolveIcon?: (raycastIcon: string) => string | undefined;
  now?: number;
}

/**
 * The allowlist is the guarantee that no key can leak: only fields validated by the schema reach the file, whatever
 * else an object in storage may carry.
 */
export function buildExport(input: ExportInput, now: number = Date.now()): ExportDocument {
  const prompts = validateList(input.prompts, "prompts", (entry, path) => validatePromptDef(entry, path));
  const snippets = validateList(input.snippets, "snippets", (entry, path) => validateTextSnippet(entry, path));
  const privacy = validateOpenRouterPrivacy(input.openRouterPrivacy);
  const defaultModel = input.defaultModel ? validateDefaultModel(input.defaultModel) : undefined;
  const favorites = input.favorites.flatMap((entry) => {
    const result = validateModelRef(entry);
    return result.ok ? [result.value] : [];
  });

  return {
    format: EXPORT_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now,
    prompts: prompts.valid,
    snippets: snippets.valid,
    settings: {
      ...(defaultModel?.ok ? { defaultModel: defaultModel.value } : {}),
      favorites,
      openRouterPrivacy: privacy.ok ? privacy.value : DEFAULT_OPENROUTER_PRIVACY,
    },
  };
}

export function serializeExport(document: ExportDocument): string {
  return JSON.stringify(document, null, 2);
}

function parseNativeSettings(raw: unknown, issues: ImportIssue[]): TransferSettings | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    issues.push({ path: "settings", message: "must be an object", severity: "skipped" });
    return undefined;
  }

  const settings: TransferSettings = { favorites: [], openRouterPrivacy: DEFAULT_OPENROUTER_PRIVACY };
  if (raw.defaultModel !== undefined) {
    const result = validateDefaultModel(raw.defaultModel, "settings.defaultModel");
    if (result.ok) settings.defaultModel = result.value;
    else issues.push(...result.issues.map((issue) => ({ ...issue, severity: "skipped" as const })));
  }
  if (Array.isArray(raw.favorites)) {
    raw.favorites.forEach((entry: unknown, index) => {
      const result = validateModelRef(entry, `settings.favorites[${index}]`);
      if (result.ok) settings.favorites.push(result.value);
      else issues.push(...result.issues.map((issue) => ({ ...issue, severity: "skipped" as const })));
    });
  }
  if (raw.openRouterPrivacy !== undefined) {
    const result = validateOpenRouterPrivacy(raw.openRouterPrivacy, "settings.openRouterPrivacy");
    if (result.ok) settings.openRouterPrivacy = result.value;
    else issues.push(...result.issues.map((issue) => ({ ...issue, severity: "skipped" as const })));
  }
  return settings;
}

function templateWarning(path: string, template: string): ImportIssue | undefined {
  const first = validateTemplate(template).errors[0];
  return first ? { path: `${path}.template`, message: first.message, severity: "warning" } : undefined;
}

function parseNative(document: Record<string, unknown>): ParsedImport {
  const migrated = migrate(document);
  if (!migrated.ok) throw new ImportError(migrated.message);

  const issues: ImportIssue[] = [];
  if (migrated.isFuture) {
    issues.push({ path: "schemaVersion", message: "File comes from a newer version.", severity: "warning" });
  }

  const prompts = validateList(migrated.document.prompts, "prompts", (entry, path) => validatePromptDef(entry, path));
  const snippets = validateList(migrated.document.snippets, "snippets", (entry, path) =>
    validateTextSnippet(entry, path),
  );
  issues.push(...[...prompts.issues, ...snippets.issues].map((issue) => ({ ...issue, severity: "skipped" as const })));

  const importedPrompts = prompts.valid.map((prompt) => {
    const warning = templateWarning(`prompt "${prompt.id}"`, prompt.template);
    if (warning) issues.push(warning);
    return withValidOutput(prompt, issues);
  });

  return {
    source: "ai-commander",
    prompts: importedPrompts,
    snippets: snippets.valid,
    settings: parseNativeSettings(migrated.document.settings, issues),
    issues,
  };
}

/** A hand-edited file may ask to paste without `{selection}`, which would insert at the cursor of any app. */
function withValidOutput(prompt: PromptDef, issues: ImportIssue[]): PromptDef {
  const allowed = allowedOutputModes(prompt.template);
  const output = allowed.includes(prompt.output) ? prompt.output : "preview";
  const highlightChanges = prompt.highlightChanges && canHighlightChanges(prompt.template);
  if (output !== prompt.output) {
    issues.push({ path: `prompt "${prompt.id}"`, message: "Output changed to preview.", severity: "warning" });
  }
  return { ...prompt, output, highlightChanges };
}

const CREATIVITY_VALUES: readonly CreativityLevel[] = ["none", "low", "medium", "high", "maximum"];

const RAYCAST_MODEL_PREFIXES: readonly (readonly [string, ProviderId])[] = [
  ["anthropic-", "anthropic"],
  ["openai-", "openai"],
  ["google-", "gemini"],
];

/**
 * Raycast IDs are not provider IDs: `anthropic-claude-4-5-haiku` has no exact API twin, and other prefixes (`groq-`,
 * `mistral-`, `raycast-`, …) have no mapping to OpenRouter at all. So a model is kept only if the stripped ID exists
 * in the user's catalog. Everything else takes the default model: guessing would send text to an unintended model.
 * ray.so wraps some IDs in quotes, hence the quote removal.
 */
export function mapRaycastModel(raw: unknown, knownModels: readonly ModelRef[] = []): ModelRef | undefined {
  if (typeof raw !== "string") return undefined;
  const id = raw.replace(/^"(.*)"$/, "$1");
  for (const [prefix, provider] of RAYCAST_MODEL_PREFIXES) {
    if (!id.startsWith(prefix)) continue;
    const stripped = id.slice(prefix.length);
    const candidates = [stripped, stripped.replace(/-reasoning$/, "")];
    return knownModels.find((model) => model.provider === provider && candidates.includes(model.modelId));
  }
  return undefined;
}

/**
 * Raycast entries have no ID. A hash of the content makes a repeated import show up as a conflict instead of
 * silently duplicating every prompt.
 */
function raycastPromptId(title: string, prompt: string): string {
  return `raycast-${createHash("sha256").update(title).update("\0").update(prompt).digest("hex").slice(0, 16)}`;
}

function parseRaycastEntry(
  raw: unknown,
  path: string,
  options: ImportOptions,
  issues: ImportIssue[],
): PromptDef | undefined {
  if (!isRecord(raw)) {
    issues.push({ path, message: "must be an object", severity: "skipped" });
    return undefined;
  }
  const { title, prompt, creativity, icon, model, highlightEdits } = raw;
  if (typeof title !== "string" || title.trim() === "" || typeof prompt !== "string" || prompt.trim() === "") {
    issues.push({ path, message: "needs a title and a prompt", severity: "skipped" });
    return undefined;
  }

  const now = options.now ?? Date.now();
  const mapped = mapRaycastModel(model, options.knownModels);
  if (typeof model === "string" && !mapped) {
    issues.push({
      path: `${path}.model`,
      message: "Model not available, using the default model.",
      severity: "warning",
    });
  }

  // Raycast runs prompts without any input placeholder, this extension never does. They stay disabled until edited.
  const validation = validateTemplate(prompt);
  if (!validation.ok) {
    const message = validation.errors[0]?.message ?? "Invalid template.";
    issues.push({ path: `${path}.prompt`, message: `Disabled: ${message}`, severity: "warning" });
  }

  const resolvedIcon = typeof icon === "string" ? options.resolveIcon?.(icon) : undefined;
  return {
    id: raycastPromptId(title, prompt),
    name: title.trim(),
    ...(resolvedIcon ? { icon: resolvedIcon } : {}),
    template: prompt,
    ...(mapped ? { model: mapped } : {}),
    reasoning: "default",
    creativity: CREATIVITY_VALUES.find((level) => level === creativity) ?? "default",
    tags: [],
    output: "preview",
    highlightChanges: highlightEdits === true && canHighlightChanges(prompt),
    enabled: validation.ok,
    createdAt: now,
    updatedAt: now,
  };
}

function parseRaycast(entries: readonly unknown[], options: ImportOptions): ParsedImport {
  const issues: ImportIssue[] = [];
  const prompts = new Map<string, PromptDef>();
  entries.forEach((entry, index) => {
    const path = `commands[${index}]`;
    const prompt = parseRaycastEntry(entry, path, options, issues);
    if (!prompt) return;
    if (prompts.has(prompt.id)) issues.push({ path, message: "duplicates an earlier entry", severity: "skipped" });
    else prompts.set(prompt.id, prompt);
  });
  return { source: "raycast", prompts: [...prompts.values()], snippets: [], issues };
}

function isRaycastEntry(value: Record<string, unknown>): boolean {
  return "title" in value && "prompt" in value;
}

/** Detects the format and validates entry by entry. Throws `ImportError` when the file as a whole is unusable. */
export function parseImport(text: string, options: ImportOptions = {}): ParsedImport {
  if (text.length > MAX_IMPORT_CHARS) throw new ImportError("The file is too large.");

  let document: unknown;
  try {
    document = JSON.parse(text.charCodeAt(0) === BYTE_ORDER_MARK ? text.slice(1) : text);
  } catch {
    throw new ImportError("The file is not valid JSON.");
  }

  if (Array.isArray(document)) {
    if (document.length > MAX_IMPORT_ENTRIES) throw new ImportError("The file has too many entries.");
    return parseRaycast(document, options);
  }
  if (isRecord(document)) {
    if (isRaycastEntry(document)) return parseRaycast([document], options);
    const { prompts, snippets } = document;
    if (document.format === EXPORT_FORMAT || (document.schemaVersion !== undefined && Array.isArray(prompts))) {
      const count = (Array.isArray(prompts) ? prompts.length : 0) + (Array.isArray(snippets) ? snippets.length : 0);
      if (count > MAX_IMPORT_ENTRIES) throw new ImportError("The file has too many entries.");
      return parseNative(document);
    }
  }
  throw new ImportError("The file is neither an AI-Commander export nor a Raycast AI Commands file.");
}

export type ConflictAction = "overwrite" | "copy" | "skip";

export type ImportPlanEntry =
  | { kind: "prompt"; incoming: PromptDef; existing?: PromptDef }
  | { kind: "snippet"; incoming: TextSnippet; existing?: TextSnippet };

export interface ImportPlan {
  entries: ImportPlanEntry[];
  /** Entries with an `existing` counterpart: these need a decision. */
  conflicts: ImportPlanEntry[];
  settings?: TransferSettings;
}

export interface ImportTarget {
  prompts: readonly PromptDef[];
  snippets: readonly TextSnippet[];
}

/** Prompts conflict by ID. Snippets also by name, because templates reference them by name. */
export function planImport(parsed: ParsedImport, current: ImportTarget): ImportPlan {
  const entries: ImportPlanEntry[] = [
    ...parsed.prompts.map((incoming): ImportPlanEntry => {
      const existing = findExistingPrompt(current.prompts, incoming);
      return existing ? { kind: "prompt", incoming, existing } : { kind: "prompt", incoming };
    }),
    ...parsed.snippets.map((incoming): ImportPlanEntry => {
      const existing = findExistingSnippet(current.snippets, incoming);
      return existing ? { kind: "snippet", incoming, existing } : { kind: "snippet", incoming };
    }),
  ];
  return {
    entries,
    conflicts: entries.filter((entry) => entry.existing !== undefined),
    ...(parsed.settings ? { settings: parsed.settings } : {}),
  };
}

export interface ApplyOptions {
  /** One action for all conflicts, or a decision per entry. */
  resolve: ConflictAction | ((entry: ImportPlanEntry) => ConflictAction);
  /** Settings are only replaced on request: an import should not silently change the default model. */
  includeSettings?: boolean;
  now?: number;
  generateId?: () => string;
}

export interface ImportSummary {
  added: number;
  overwritten: number;
  copied: number;
  skipped: number;
}

export interface ImportOutcome {
  prompts: PromptDef[];
  snippets: TextSnippet[];
  settings?: TransferSettings;
  summary: ImportSummary;
}

function copyName(name: string, taken: ReadonlySet<string>): string {
  let candidate = `${name} Copy`;
  for (let counter = 2; taken.has(candidate); counter += 1) candidate = `${name} Copy ${counter}`;
  return candidate;
}

function findExistingPrompt(prompts: readonly PromptDef[], incoming: PromptDef): PromptDef | undefined {
  return prompts.find((prompt) => prompt.id === incoming.id);
}

/** Templates reference snippets by name, so a name match wins over an ID match. That keeps names unique. */
function findExistingSnippet(snippets: readonly TextSnippet[], incoming: TextSnippet): TextSnippet | undefined {
  return (
    snippets.find((snippet) => snippet.name === incoming.name) ?? snippets.find((snippet) => snippet.id === incoming.id)
  );
}

function resolveConflict(entry: ImportPlanEntry, resolve: ApplyOptions["resolve"]): ConflictAction {
  return typeof resolve === "function" ? resolve(entry) : resolve;
}

/**
 * Pure: returns the new collections. Overwriting keeps ID and usage, so existing quicklinks keep working. Conflicts
 * are looked up again here because `current` may be newer than the plan, and because entries of one file can collide
 * with each other.
 */
export function applyImportPlan(plan: ImportPlan, current: ImportTarget, options: ApplyOptions): ImportOutcome {
  const now = options.now ?? Date.now();
  const generateId = options.generateId ?? randomUUID;
  const prompts = [...current.prompts];
  const snippets = [...current.snippets];
  const summary: ImportSummary = { added: 0, overwritten: 0, copied: 0, skipped: 0 };
  // Incoming snippet name to the name of its copy. The prompts of the same file must use the copy.
  const renamed = new Map<string, string>();

  // Snippets first, so that the prompts can be pointed at renamed copies.
  for (const entry of plan.entries) {
    if (entry.kind !== "snippet") continue;
    const { incoming } = entry;
    const existing = findExistingSnippet(snippets, incoming);
    const action = existing ? resolveConflict({ ...entry, existing }, options.resolve) : undefined;
    if (action === "skip") {
      summary.skipped += 1;
    } else if (action === "overwrite" && existing) {
      snippets[snippets.indexOf(existing)] = { ...incoming, id: existing.id, updatedAt: now };
      summary.overwritten += 1;
    } else if (action === "copy") {
      const taken = new Set(snippets.map((snippet) => snippet.name));
      // A conflict by ID alone leaves the name free, and a kept name needs no rewritten references.
      const name = taken.has(incoming.name) ? copyName(incoming.name, taken) : incoming.name;
      if (name !== incoming.name) renamed.set(incoming.name, name);
      snippets.push({ ...incoming, id: generateId(), name, updatedAt: now });
      summary.copied += 1;
    } else {
      snippets.push(incoming);
      summary.added += 1;
    }
  }

  for (const entry of plan.entries) {
    if (entry.kind === "prompt") {
      const incoming =
        renamed.size === 0
          ? entry.incoming
          : { ...entry.incoming, template: renameSnippetReferences(entry.incoming.template, renamed) };
      const existing = findExistingPrompt(prompts, incoming);
      const action = existing ? resolveConflict({ ...entry, existing }, options.resolve) : undefined;
      if (action === "skip") {
        summary.skipped += 1;
      } else if (action === "overwrite" && existing) {
        const { id, createdAt, lastUsedAt } = existing;
        const merged: PromptDef = { ...incoming, id, createdAt, updatedAt: now };
        if (lastUsedAt === undefined) delete merged.lastUsedAt;
        else merged.lastUsedAt = lastUsedAt;
        prompts[prompts.indexOf(existing)] = merged;
        summary.overwritten += 1;
      } else if (action === "copy") {
        const name = copyName(incoming.name, new Set(prompts.map((prompt) => prompt.name)));
        const copy: PromptDef = { ...incoming, id: generateId(), name, createdAt: now, updatedAt: now };
        delete copy.lastUsedAt;
        prompts.push(copy);
        summary.copied += 1;
      } else {
        prompts.push(incoming);
        summary.added += 1;
      }
    }
  }

  return {
    prompts,
    snippets,
    ...(options.includeSettings && plan.settings ? { settings: plan.settings } : {}),
    summary,
  };
}
