/**
 * The persisted document and its hand-written validators.
 *
 * Validators report per entry instead of throwing. Stored data keeps fields this version does not know, so a
 * downgrade or a rewrite by an older build loses nothing. Imports drop them instead (`keepUnknown` off): an import is
 * untrusted input, and the allowlist is also what keeps foreign fields out of exports.
 */

import { isRecord } from "../core/guards";
import type {
  CreativityLevel,
  DefaultModel,
  ModelRef,
  OpenRouterPrivacy,
  OutputMode,
  PrivacyOverride,
  PromptDef,
  ProviderId,
  ReasoningLevel,
  TextSnippet,
} from "../core/types";

export const CURRENT_SCHEMA_VERSION = 2;

export const DEFAULT_OPENROUTER_PRIVACY: OpenRouterPrivacy = { mode: "strict", ignoreProviders: [] };

export interface PersistedState {
  schemaVersion: number;
  /**
   * IDs of the bundled examples already added. Each is added once, so a deleted example stays deleted while one from a
   * later version still arrives. Lives in this document so that it is written atomically with the seeded prompts.
   */
  seededExamples: string[];
  prompts: PromptDef[];
  snippets: TextSnippet[];
  defaultModel?: DefaultModel;
  favorites: ModelRef[];
  openRouterPrivacy: OpenRouterPrivacy;
}

export interface SchemaIssue {
  /** Where the problem is, for example `prompts[3].output`. Never contains user text. */
  path: string;
  message: string;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; issues: SchemaIssue[] };

export interface ValidatorOptions {
  keepUnknown?: boolean;
}

const PROVIDERS: readonly ProviderId[] = ["anthropic", "openai", "gemini", "openrouter"];
const REASONING: readonly ReasoningLevel[] = ["default", "off", "low", "medium", "high"];
const CREATIVITY: readonly CreativityLevel[] = ["default", "none", "low", "medium", "high", "maximum"];
const OUTPUTS: readonly OutputMode[] = ["preview", "replace", "copy", "insertAfter"];
const PRIVACY: readonly PrivacyOverride[] = ["default", "strict"];
const PRIVACY_MODES: readonly OpenRouterPrivacy["mode"][] = ["standard", "strict"];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/** Collects issues while reading fields, so one pass reports everything wrong with an entry. */
class FieldReader {
  readonly issues: SchemaIssue[] = [];

  constructor(
    private readonly raw: Record<string, unknown>,
    private readonly path: string,
  ) {}

  private fail(field: string, message: string): void {
    this.issues.push({ path: `${this.path}.${field}`, message });
  }

  requiredString(field: string): string {
    const value = this.raw[field];
    if (typeof value === "string" && value.length > 0) return value;
    this.fail(field, "must be a non-empty string");
    return "";
  }

  string(field: string): string | undefined {
    const value = this.raw[field];
    if (value === undefined || typeof value === "string") return value;
    this.fail(field, "must be a string");
    return undefined;
  }

  number(field: string): number | undefined {
    const value = this.raw[field];
    if (value === undefined || (typeof value === "number" && Number.isFinite(value))) return value;
    this.fail(field, "must be a number");
    return undefined;
  }

  boolean(field: string, fallback: boolean): boolean {
    const value = this.raw[field];
    if (value === undefined) return fallback;
    if (typeof value === "boolean") return value;
    this.fail(field, "must be a boolean");
    return fallback;
  }

  oneOf<T extends string>(field: string, allowed: readonly T[], fallback: T): T {
    const value = this.raw[field];
    if (value === undefined) return fallback;
    if (isOneOf(value, allowed)) return value;
    this.fail(field, `must be one of: ${allowed.join(", ")}`);
    return fallback;
  }

  optionalOneOf<T extends string>(field: string, allowed: readonly T[]): T | undefined {
    const value = this.raw[field];
    if (value === undefined || isOneOf(value, allowed)) return value;
    this.fail(field, `must be one of: ${allowed.join(", ")}`);
    return undefined;
  }

  strings(field: string): string[] {
    const value = this.raw[field];
    if (value === undefined) return [];
    if (isStringArray(value)) return value;
    this.fail(field, "must be a list of strings");
    return [];
  }

  addIssues(issues: readonly SchemaIssue[]): void {
    this.issues.push(...issues);
  }
}

function notAnObject<T>(path: string): Validated<T> {
  return { ok: false, issues: [{ path, message: "must be an object" }] };
}

export function validateModelRef(raw: unknown, path = "model"): Validated<ModelRef> {
  if (!isRecord(raw)) return notAnObject(path);
  const reader = new FieldReader(raw, path);
  const provider = raw.provider;
  if (!isOneOf(provider, PROVIDERS)) {
    return { ok: false, issues: [{ path: `${path}.provider`, message: `must be one of: ${PROVIDERS.join(", ")}` }] };
  }
  const modelId = reader.requiredString("modelId");
  return reader.issues.length > 0 ? { ok: false, issues: reader.issues } : { ok: true, value: { provider, modelId } };
}

export function validatePromptDef(raw: unknown, path = "prompt", options: ValidatorOptions = {}): Validated<PromptDef> {
  if (!isRecord(raw)) return notAnObject(path);
  const reader = new FieldReader(raw, path);

  let model: ModelRef | undefined;
  if (raw.model !== undefined) {
    const result = validateModelRef(raw.model, `${path}.model`);
    if (result.ok) model = result.value;
    else reader.addIssues(result.issues);
  }

  // Missing optional settings get the same defaults as a new prompt, so hand-written imports stay short.
  const known: PromptDef = {
    id: reader.requiredString("id"),
    name: reader.requiredString("name"),
    icon: reader.string("icon"),
    template: reader.requiredString("template"),
    model,
    privacy: reader.optionalOneOf("privacy", PRIVACY),
    reasoning: reader.oneOf("reasoning", REASONING, "default"),
    creativity: reader.oneOf("creativity", CREATIVITY, "default"),
    tags: reader.strings("tags"),
    output: reader.oneOf("output", OUTPUTS, "preview"),
    highlightChanges: reader.boolean("highlightChanges", false),
    enabled: reader.boolean("enabled", true),
    lastUsedAt: reader.number("lastUsedAt"),
    createdAt: reader.number("createdAt") ?? 0,
    updatedAt: reader.number("updatedAt") ?? 0,
  };

  if (reader.issues.length > 0) return { ok: false, issues: reader.issues };
  return { ok: true, value: withoutUndefined(options.keepUnknown ? { ...raw, ...known } : known) };
}

export function validateTextSnippet(
  raw: unknown,
  path = "snippet",
  options: ValidatorOptions = {},
): Validated<TextSnippet> {
  if (!isRecord(raw)) return notAnObject(path);
  const reader = new FieldReader(raw, path);
  const known: TextSnippet = {
    id: reader.requiredString("id"),
    name: reader.requiredString("name"),
    // A snippet may be empty, but it has to be text.
    text: reader.string("text") ?? "",
    updatedAt: reader.number("updatedAt") ?? 0,
  };
  if (typeof raw.text !== "string") reader.addIssues([{ path: `${path}.text`, message: "must be a string" }]);
  if (reader.issues.length > 0) return { ok: false, issues: reader.issues };
  return { ok: true, value: options.keepUnknown ? { ...raw, ...known } : known };
}

export function validateDefaultModel(raw: unknown, path = "defaultModel"): Validated<DefaultModel> {
  if (!isRecord(raw)) return notAnObject(path);
  const ref = validateModelRef(raw.ref, `${path}.ref`);
  if (!ref.ok) return ref;
  const reader = new FieldReader(raw, path);
  const reasoning = reader.oneOf("reasoning", REASONING, "default");
  return reader.issues.length > 0
    ? { ok: false, issues: reader.issues }
    : { ok: true, value: { ref: ref.value, reasoning } };
}

export function validateOpenRouterPrivacy(raw: unknown, path = "openRouterPrivacy"): Validated<OpenRouterPrivacy> {
  if (!isRecord(raw)) return notAnObject(path);
  const reader = new FieldReader(raw, path);
  const mode = reader.oneOf("mode", PRIVACY_MODES, DEFAULT_OPENROUTER_PRIVACY.mode);
  const ignoreProviders = reader.strings("ignoreProviders");
  return reader.issues.length > 0
    ? { ok: false, issues: reader.issues }
    : { ok: true, value: { mode, ignoreProviders } };
}

/** Optional fields must be absent rather than undefined, so stored documents and test comparisons stay clean. */
function withoutUndefined<T extends object>(value: T): T {
  const copy = { ...value };
  for (const key of Object.keys(copy) as (keyof T)[]) {
    if (copy[key] === undefined) delete copy[key];
  }
  return copy;
}

export type Migration = (document: Record<string, unknown>) => Record<string, unknown>;

/** The examples of schema version 1, which only pre-release builds wrote. */
const VERSION_1_EXAMPLES: ReadonlySet<unknown> = new Set([
  "example-simplify",
  "example-translate-en",
  "example-summarize",
]);

/**
 * Key `n` upgrades a document from version `n` to `n + 1`. Add one entry per schema change and raise
 * `CURRENT_SCHEMA_VERSION`; never edit an entry once it has shipped.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Version 0 is any document without a version. Its shape equals version 1.
  0: (document) => document,
  // Version 1 only existed in pre-release builds. Its three examples make way for the redesigned set, edited or not,
  // and the list of added examples starts empty, so every current example is added once. IDs stay, and so do
  // quicklinks.
  1: (document) => {
    const next: Record<string, unknown> = { ...document, seededExamples: [] };
    delete next.examplesSeeded;
    if (Array.isArray(document.prompts)) {
      next.prompts = document.prompts.filter((prompt) => !(isRecord(prompt) && VERSION_1_EXAMPLES.has(prompt.id)));
    }
    return next;
  },
};

export type MigrateResult =
  | {
      ok: true;
      document: Record<string, unknown>;
      fromVersion: number;
      /** Written by a newer build: read what is understood and keep the version on write. */
      isFuture: boolean;
    }
  | { ok: false; message: string };

export function migrate(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  targetVersion: number = CURRENT_SCHEMA_VERSION,
): MigrateResult {
  if (!isRecord(raw)) return { ok: false, message: "The stored data is not an object." };

  const fromVersion = raw.schemaVersion ?? 0;
  if (typeof fromVersion !== "number" || !Number.isInteger(fromVersion) || fromVersion < 0) {
    return { ok: false, message: "The stored schema version is invalid." };
  }
  if (fromVersion > targetVersion) return { ok: true, document: raw, fromVersion, isFuture: true };

  let document = raw;
  for (let version = fromVersion; version < targetVersion; version += 1) {
    const step = migrations[version];
    if (!step) return { ok: false, message: `No migration from schema version ${version}.` };
    try {
      document = { ...step(document), schemaVersion: version + 1 };
    } catch {
      return { ok: false, message: `Migration from schema version ${version} failed.` };
    }
  }
  return { ok: true, document, fromVersion, isFuture: false };
}

export interface ValidatedList<T> {
  valid: T[];
  /** Original entries, so that a rewrite keeps data this build cannot read. */
  invalid: unknown[];
  issues: SchemaIssue[];
}

/** Later entries with an ID already seen count as invalid: quicklinks and updates address entries by ID. */
export function validateList<T extends { id: string }>(
  raw: unknown,
  path: string,
  validate: (entry: unknown, path: string) => Validated<T>,
): ValidatedList<T> {
  const result: ValidatedList<T> = { valid: [], invalid: [], issues: [] };
  if (raw === undefined) return result;
  if (!Array.isArray(raw)) {
    result.issues.push({ path, message: "must be a list" });
    return result;
  }

  const seen = new Set<string>();
  raw.forEach((entry: unknown, index) => {
    const entryPath = `${path}[${index}]`;
    const validated = validate(entry, entryPath);
    if (!validated.ok) {
      result.invalid.push(entry);
      result.issues.push(...validated.issues);
    } else if (seen.has(validated.value.id)) {
      result.invalid.push(entry);
      result.issues.push({ path: `${entryPath}.id`, message: "duplicates an earlier entry" });
    } else {
      seen.add(validated.value.id);
      result.valid.push(validated.value);
    }
  });
  return result;
}

export interface ParsedState {
  state: PersistedState;
  /** Unreadable entries. `serializeState` writes them back so that nothing is lost. */
  invalidPrompts: unknown[];
  invalidSnippets: unknown[];
  /** Unreadable settings, kept so that an older version does not erase data a newer one wrote. */
  invalidSettings?: InvalidSettings;
  issues: SchemaIssue[];
}

export interface InvalidSettings {
  defaultModel?: unknown;
  favorites?: unknown[];
  openRouterPrivacy?: unknown;
}

export function createEmptyState(): PersistedState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    seededExamples: [],
    prompts: [],
    snippets: [],
    favorites: [],
    openRouterPrivacy: { ...DEFAULT_OPENROUTER_PRIVACY, ignoreProviders: [] },
  };
}

/** Validates a migrated document. Returns undefined only when its top-level shape is unusable. */
export function parsePersistedState(document: Record<string, unknown>): ParsedState | undefined {
  if (
    (document.prompts !== undefined && !Array.isArray(document.prompts)) ||
    (document.snippets !== undefined && !Array.isArray(document.snippets))
  ) {
    return undefined;
  }

  const keepUnknown: ValidatorOptions = { keepUnknown: true };
  const prompts = validateList(document.prompts, "prompts", (entry, path) =>
    validatePromptDef(entry, path, keepUnknown),
  );
  const snippets = validateList(document.snippets, "snippets", (entry, path) =>
    validateTextSnippet(entry, path, keepUnknown),
  );
  const issues = [...prompts.issues, ...snippets.issues];

  const invalidSettings: InvalidSettings = {};
  let defaultModel: DefaultModel | undefined;
  if (document.defaultModel !== undefined) {
    const result = validateDefaultModel(document.defaultModel);
    if (result.ok) {
      defaultModel = result.value;
    } else {
      issues.push(...result.issues);
      invalidSettings.defaultModel = document.defaultModel;
    }
  }

  const favorites: ModelRef[] = [];
  if (Array.isArray(document.favorites)) {
    document.favorites.forEach((entry: unknown, index) => {
      const result = validateModelRef(entry, `favorites[${index}]`);
      if (result.ok) {
        favorites.push(result.value);
      } else {
        issues.push(...result.issues);
        (invalidSettings.favorites ??= []).push(entry);
      }
    });
  }

  let openRouterPrivacy = createEmptyState().openRouterPrivacy;
  if (document.openRouterPrivacy !== undefined) {
    const result = validateOpenRouterPrivacy(document.openRouterPrivacy);
    if (result.ok) {
      openRouterPrivacy = result.value;
    } else {
      issues.push(...result.issues);
      invalidSettings.openRouterPrivacy = document.openRouterPrivacy;
    }
  }

  const state: PersistedState = {
    ...document,
    schemaVersion: typeof document.schemaVersion === "number" ? document.schemaVersion : CURRENT_SCHEMA_VERSION,
    seededExamples: Array.isArray(document.seededExamples)
      ? document.seededExamples.filter((id): id is string => typeof id === "string")
      : [],
    prompts: prompts.valid,
    snippets: snippets.valid,
    favorites,
    openRouterPrivacy,
  };
  if (defaultModel) state.defaultModel = defaultModel;
  else delete state.defaultModel;

  return { state, invalidPrompts: prompts.invalid, invalidSnippets: snippets.invalid, invalidSettings, issues };
}

export function serializeState(
  parsed: Pick<ParsedState, "state" | "invalidPrompts" | "invalidSnippets" | "invalidSettings">,
): string {
  const { state, invalidSettings: invalid = {} } = parsed;
  // A setting the user changed since wins over the unreadable value; an untouched default does not.
  const privacyUntouched =
    JSON.stringify(state.openRouterPrivacy) === JSON.stringify(createEmptyState().openRouterPrivacy);
  return JSON.stringify({
    ...state,
    prompts: [...state.prompts, ...parsed.invalidPrompts],
    snippets: [...state.snippets, ...parsed.invalidSnippets],
    defaultModel: state.defaultModel ?? invalid.defaultModel,
    favorites: [...state.favorites, ...(invalid.favorites ?? [])],
    openRouterPrivacy:
      invalid.openRouterPrivacy !== undefined && privacyUntouched ? invalid.openRouterPrivacy : state.openRouterPrivacy,
  });
}
