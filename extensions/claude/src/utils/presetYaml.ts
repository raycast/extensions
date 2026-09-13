import * as yaml from "js-yaml";
import { v4 as uuidv4 } from "uuid";
import type { AvailableModel } from "../api/models";
import type { Model } from "../type";
import { getMaxTokensForModel, supportsTemperature } from "./models";

/** Current native-format version. Bump if the shape ever changes incompatibly. */
export const PRESET_YAML_VERSION = 1;

/**
 * The accepted temperature range, shared by the interactive form
 * (`src/views/model/form.tsx`'s validator) and the YAML import gate below.
 *
 * Exported and reused rather than duplicated as literals in both places: the import
 * accepting a value the form rejects is exactly the defect this fixes, and two
 * independent copies of "0 to 1" is how that defect comes back. Anthropic's API rejects
 * anything outside this range, so a preset carrying one is dead on arrival.
 */
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 1;

/**
 * One preset row as it appears in the native YAML file. Deliberately narrower than
 * `Model`: no `id`, no timestamps — those are runtime bookkeeping the file format has no
 * business carrying, and are minted/stamped fresh on import. `temperature` is optional
 * because export omits it for models that reject sampling parameters (the temperature
 * trap) — see `modelToPresetYamlEntry`.
 */
export interface PresetYamlEntry {
  name: string;
  model: string;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
}

/** The document shape written to / read from a `.yaml` preset file. */
export interface PresetYamlDocument {
  version: number;
  presets: PresetYamlEntry[];
}

/**
 * Converts a runtime `Model` into a YAML-file row. Export omits `temperature` unless the
 * model actually supports it — the counterpart to the import-side drop-with-warning gate
 * in `importPresetsFromYaml`. Keeping both sides of the gate is what stops the trap from
 * regressing: a model that rejects sampling parameters never round-trips a `temperature`
 * value through this format at all.
 */
export function modelToPresetYamlEntry(model: Model): PresetYamlEntry {
  const entry: PresetYamlEntry = {
    name: model.name,
    model: model.option,
    prompt: model.prompt,
  };

  if (supportsTemperature(model.option)) {
    entry.temperature = Number(model.temperature);
  }

  const maxTokens = Number(model.max_tokens);
  if (Number.isFinite(maxTokens) && maxTokens > 0) {
    entry.max_tokens = maxTokens;
  }

  return entry;
}

/**
 * Serializes presets (skipping the built-in `"default"` row — it is not user data, it is
 * re-seeded/re-pointed by `useModel` on every install) to the native YAML document.
 *
 * `noRefs: true` keeps the output diffable: without it, `js-yaml` would emit YAML anchors
 * for any two rows that happen to be reference-equal, which is both unlikely to matter
 * here and exactly the kind of incidental structure that makes a diff unreadable.
 */
export function exportPresetsToYaml(models: Model[]): string {
  const document: PresetYamlDocument = {
    version: PRESET_YAML_VERSION,
    presets: models.filter((model) => model.id !== "default").map(modelToPresetYamlEntry),
  };

  const header =
    '# Claude presets — exported from the Raycast "Presets" command.\n' +
    "# `temperature` is omitted for models that reject sampling parameters (Opus 4.7+).\n";

  return header + yaml.dump(document, { indent: 2, lineWidth: 120, noRefs: true });
}

/** Outcome of validating/importing one YAML row, and why it landed where it did. */
export type ImportRowOutcome =
  | { status: "imported"; model: Model; warning?: string }
  | { status: "replaced"; model: Model; warning?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export interface ImportPresetsResult {
  outcomes: ImportRowOutcome[];
  models: Model[];
  tally: { imported: number; replaced: number; skipped: number; failed: number };
}

/** How to handle a YAML row whose `name` matches an existing preset. */
export type RepeatImportPolicy = "replace" | "skip";

/**
 * Type-guards + defaults a single parsed-YAML row into a `PresetYamlEntry`, or returns
 * null when the row is unusable (missing/wrong-typed required fields). Field-guarded
 * rather than schema-validated: an invalid row is skipped, not fatal to the whole file.
 */
function coercePresetYamlEntry(raw: unknown): PresetYamlEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;

  if (typeof row.name !== "string" || row.name.trim() === "") return null;
  if (typeof row.model !== "string" || row.model.trim() === "") return null;
  if (typeof row.prompt !== "string") return null;

  const entry: PresetYamlEntry = { name: row.name, model: row.model, prompt: row.prompt };

  if (row.temperature !== undefined) {
    // Out-of-range temperature is rejected at the SAME coercion gate that already rejects
    // a non-positive `max_tokens`, and for the same reason: the interactive form
    // constrains temperature to 0–1 (`src/views/model/form.tsx`), so a YAML file carrying
    // `-1` or `2` produced a preset the form could never have created and that fails
    // EVERY request with a 400 — a preset that looks imported successfully and is dead on
    // arrival. Rejecting the row surfaces it as a `failed` outcome the user can see and
    // fix, rather than silently clamping to a value they did not ask for (the same
    // reasoning that made `max_tokens: 0` a rejection instead of a silent ceiling).
    if (typeof row.temperature !== "number" || Number.isNaN(row.temperature)) return null;
    if (row.temperature < TEMPERATURE_MIN || row.temperature > TEMPERATURE_MAX) return null;
    entry.temperature = row.temperature;
  }
  if (row.max_tokens !== undefined) {
    // A non-positive max_tokens (0 or negative) is not a value to interpret — reject the
    // row outright here, at the same coercion gate that already rejects a string-typed or
    // NaN value, rather than letting it fall through to the clamp logic below where it
    // would (silently) land on the model's ceiling. See importPresetsFromYaml's history:
    // that silent path used to hand a user who typed `max_tokens: 0` the OPPOSITE of what
    // they asked for, indistinguishable from having omitted the field.
    if (typeof row.max_tokens !== "number" || Number.isNaN(row.max_tokens) || row.max_tokens <= 0) return null;
    entry.max_tokens = row.max_tokens;
  }

  return entry;
}

/**
 * Normalizes a preset name for MATCHING only (trim + case-fold) — never for storage or
 * display, which always keep the user's original casing/whitespace. Both name-collision
 * call sites (`importPresetsFromYaml`'s per-row dedupe and `countNameCollisions`'s
 * pre-flight count) route through this one function so they can't independently drift on
 * what counts as "the same name" — a case- or whitespace-differing near-miss ("imported"
 * vs "Imported ") must be invisible to neither.
 */
function normalizePresetName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The single `js-yaml` load call for the whole import path. `js-yaml`'s loader parses
 * both YAML and JSON (JSON is a YAML subset), so this doubles as the format-detection
 * parse `ModelImportForm` needs to tell a native YAML document from a bare Raycast Agent
 * JSON array — callers should use THIS, not a second `yaml.load`/`import("js-yaml")` of
 * their own, so the file is only ever parsed once per import attempt.
 */
export function parseYamlOrJson(text: string): unknown {
  return yaml.load(text);
}

/**
 * Validates an already-parsed value (from `parseYamlOrJson`) as a native preset
 * document, without importing anything yet. Throws when it isn't a `{ presets: [...] }`
 * shape (the file isn't ours). Individual row problems are NOT thrown here; they surface
 * later as `skipped`/`failed` outcomes from `importPresetsFromYaml`.
 */
export function parsePresetYamlDocument(parsed: unknown): unknown[] {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("presets" in parsed) ||
    !Array.isArray((parsed as { presets: unknown }).presets)
  ) {
    throw new Error("Not a valid Claude presets YAML file (missing a `presets` list).");
  }
  return (parsed as { presets: unknown[] }).presets;
}

/**
 * Validates and converts the parsed YAML rows into runtime `Model`s, applying every rule
 * the cases that must be handled: id generation, repeat-import dedupe by name, unknown-model
 * fallback, numeric clamping, and the temperature-drop gate. Returns a full outcome per
 * row (never throws for a single bad row) plus the resulting preset list, so the caller
 * can both persist `models` and report the `tally` to the user.
 *
 * `existingModels` is the current preset list (used for name-based dedupe);
 * `availableModels` is the live Anthropic model list (used for the unknown-model
 * fallback and max-token clamping); `defaultModel` is what an unknown model falls back
 * to. `repeatPolicy` decides what happens to a name collision — callers that haven't
 * asked the user yet should pass `"skip"` to get a dry-run count of collisions, then
 * re-run with the user's choice.
 */
export function importPresetsFromYaml(
  rawRows: unknown[],
  existingModels: Model[],
  availableModels: AvailableModel[],
  defaultModel: Model,
  repeatPolicy: RepeatImportPolicy,
  now: () => string = () => new Date().toISOString(),
): ImportPresetsResult {
  const outcomes: ImportRowOutcome[] = [];
  // Mutable working copy: later rows in the same file must see earlier rows' effects
  // (e.g. two rows importing under the same name within one file), and rows within one
  // import must dedupe against each other exactly as they would against pre-existing data.
  let working = [...existingModels];

  for (const raw of rawRows) {
    const entry = coercePresetYamlEntry(raw);
    if (!entry) {
      outcomes.push({ status: "failed", reason: "Row is missing a required field (name, model, or prompt)." });
      continue;
    }

    const existingByName = working.find((model) => normalizePresetName(model.name) === normalizePresetName(entry.name));
    if (existingByName && repeatPolicy === "skip") {
      outcomes.push({ status: "skipped", reason: `A preset named "${entry.name}" already exists.` });
      continue;
    }

    let warning: string | undefined;

    // Unknown model: fall back to the default preset's model rather than persisting a
    // preset that 400s on first use.
    const isKnownModel = availableModels.length === 0 || availableModels.some((model) => model.id === entry.model);
    const resolvedModelId = isKnownModel ? entry.model : defaultModel.option;
    if (!isKnownModel) {
      warning = `Unknown model "${entry.model}" — fell back to ${defaultModel.option}.`;
    }

    // Temperature-drop gate: a model that rejects sampling parameters never gets a
    // persisted `temperature`, regardless of what the file says.
    const modelSupportsTemperature = supportsTemperature(resolvedModelId);
    let temperature = "1";
    if (entry.temperature !== undefined) {
      if (modelSupportsTemperature) {
        temperature = String(entry.temperature);
      } else {
        const dropWarning = `Temperature ${entry.temperature} dropped — ${resolvedModelId} does not accept sampling parameters.`;
        warning = warning ? `${warning} ${dropWarning}` : dropWarning;
      }
    }

    // Numeric clamping: reuse the same ceiling the form validates against, rather than
    // relying on the request path's silent 4096 fallback (which would quietly change
    // behavior instead of surfacing it at import time). A non-positive value never
    // reaches here at all — `coercePresetYamlEntry` rejects it as a malformed row, the
    // same as a string-typed or NaN value, rather than letting it silently resolve to
    // the ceiling below.
    const ceiling = getMaxTokensForModel(resolvedModelId, availableModels);
    let maxTokens = ceiling;
    if (entry.max_tokens !== undefined) {
      if (entry.max_tokens > ceiling) {
        maxTokens = ceiling;
        const clampWarning = `Max tokens ${entry.max_tokens} clamped to ${ceiling} (model ceiling).`;
        warning = warning ? `${warning} ${clampWarning}` : clampWarning;
      } else {
        maxTokens = Math.floor(entry.max_tokens);
      }
    }

    const timestamp = now();
    const isReplace = Boolean(existingByName) && repeatPolicy === "replace";

    const model: Model = {
      id: isReplace ? (existingByName as Model).id : uuidv4(),
      name: entry.name,
      prompt: entry.prompt,
      option: resolvedModelId,
      temperature,
      max_tokens: String(maxTokens),
      pinned: isReplace ? (existingByName as Model).pinned : false,
      created_at: isReplace ? (existingByName as Model).created_at : timestamp,
      updated_at: timestamp,
    };

    working = isReplace ? working.map((m) => (m.id === model.id ? model : m)) : [...working, model];

    outcomes.push({ status: isReplace ? "replaced" : "imported", model, warning });
  }

  const tally = outcomes.reduce(
    (acc, outcome) => {
      if (outcome.status === "imported") acc.imported += 1;
      else if (outcome.status === "replaced") acc.replaced += 1;
      else if (outcome.status === "skipped") acc.skipped += 1;
      else acc.failed += 1;
      return acc;
    },
    { imported: 0, replaced: 0, skipped: 0, failed: 0 },
  );

  return { outcomes, models: working, tally };
}

/**
 * Counts how many rows in a would-be import already collide by name with existing
 * presets — used to decide whether to ask the user replace-or-skip at all before doing
 * any real work.
 */
export function countNameCollisions(rawRows: unknown[], existingModels: Model[]): number {
  // Same `normalizePresetName` the actual import path (`importPresetsFromYaml`) uses for
  // its per-row dedupe — routing both through one function is what stops this pre-flight
  // count and the real import from disagreeing about what counts as a collision. A
  // disagreement here is exactly what would make a near-miss name invisible: this count
  // gates whether the user ever sees the replace-or-skip prompt at all.
  const existingNames = new Set(existingModels.map((model) => normalizePresetName(model.name)));
  let collisions = 0;
  for (const raw of rawRows) {
    const entry = coercePresetYamlEntry(raw);
    if (entry && existingNames.has(normalizePresetName(entry.name))) collisions += 1;
  }
  return collisions;
}
