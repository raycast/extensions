import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const FEATURE_STATES = ["disabled", "preview", "active"] as const;
export type FeatureState = (typeof FEATURE_STATES)[number];

export const FEATURE_IDS = [
  "portable-store",
  "raycast-library",
  "raycast-exact-search",
  "sqlite-search",
  "qmd-discovery",
  "openai-enhancement",
  "project-context",
  "context7-research",
  "web-research",
  "exa-research",
  "github-mcp-research",
  "anthropic-provider",
  "google-provider",
  "local-cli",
  "mcp-read",
  "mcp-write",
  "feedback",
  "optimization",
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export interface FeatureDefinition {
  id: FeatureId;
  title: string;
  description: string;
  activationOrder: number;
  defaultState: FeatureState;
  blocksLaterActivations: boolean;
}

export interface VerificationRecord {
  status: "passed";
  checkedAt: string;
  command: string;
}

export interface FeatureOverride {
  state: FeatureState;
  verification?: VerificationRecord;
  history?: FeatureHistoryEntry[];
}

export interface FeatureHistoryEntry {
  state: FeatureState;
  changedAt: string;
  verification?: VerificationRecord;
}

export interface FeatureStatus extends FeatureDefinition {
  requestedState: FeatureState;
  effectiveState: FeatureState;
  reason?: string;
  verification?: VerificationRecord;
  history: FeatureHistoryEntry[];
}

export const FEATURES: readonly FeatureDefinition[] = [
  feature(
    "portable-store",
    "Portable Markdown Store",
    "Readable files remain the recoverable source of truth.",
    0,
    "active",
  ),
  feature(
    "raycast-library",
    "Raycast Visual Library",
    "Browse and preview prompts visually.",
    0,
    "active",
  ),
  feature(
    "raycast-exact-search",
    "Raycast Exact Search",
    "Search titles, prompt text, tags, targets, and aliases.",
    0,
    "active",
  ),
  feature(
    "sqlite-search",
    "SQLite Search",
    "Use a rebuildable local database for fast filtering and full-text search.",
    1,
  ),
  feature(
    "qmd-discovery",
    "QMD Semantic Discovery",
    "Find prompts by meaning when the exact words differ.",
    2,
  ),
  feature(
    "openai-enhancement",
    "OpenAI Enhancement",
    "Turn rough thoughts into validated, editable prompts.",
    3,
  ),
  feature(
    "project-context",
    "Local Project Context",
    "Personalize enhancement from a selected Git project without modifying it.",
    4,
  ),
  feature(
    "context7-research",
    "Context7 Research",
    "Retrieve version-specific library and API documentation.",
    5,
  ),
  feature(
    "web-research",
    "Current Web Research",
    "Retrieve current facts from official and primary sources.",
    6,
  ),
  feature(
    "exa-research",
    "Exa Research",
    "Search broader technical pages, code, and papers.",
    7,
  ),
  feature(
    "github-mcp-research",
    "GitHub MCP Research",
    "Skipped by user choice. GitHub-specific research stays Disabled.",
    8,
    "disabled",
    false,
  ),
  feature(
    "anthropic-provider",
    "Anthropic Provider",
    "Skipped by user choice. Anthropic enhancement stays Disabled.",
    9,
    "disabled",
    false,
  ),
  feature(
    "google-provider",
    "Google Provider",
    "Skipped by user choice. Google enhancement stays Disabled.",
    10,
    "disabled",
    false,
  ),
  feature(
    "local-cli",
    "Local CLI",
    "Use the same prompt library from terminal-based coding tools.",
    11,
  ),
  feature(
    "mcp-read",
    "Read-only MCP",
    "Let coding agents search and retrieve prompts through local tools.",
    12,
  ),
  feature(
    "mcp-write",
    "MCP Mutations",
    "Create, update, archive, and enhance with explicit confirmation.",
    13,
  ),
  feature(
    "feedback",
    "Outcome Feedback",
    "Record optional ratings, corrections, and results for prompt versions.",
    14,
  ),
  feature(
    "optimization",
    "Prompt Optimization",
    "Compare candidates against saved evidence before human approval.",
    15,
  ),
];

export function featureConfigPath(): string {
  return join(
    homedir(),
    "Library",
    "Application Support",
    "Prompt Studio",
    "features.json",
  );
}

export async function loadFeatureStatuses(
  path = featureConfigPath(),
): Promise<FeatureStatus[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    return resolveFeatureStatuses(validateOverrides(parsed));
  } catch (error) {
    if (isMissingFile(error)) return resolveFeatureStatuses();
    throw error;
  }
}

export async function setFeatureState(
  id: FeatureId,
  state: FeatureState,
  verification?: VerificationRecord,
  path = featureConfigPath(),
): Promise<FeatureStatus[]> {
  const overrides = await loadOverrides(path);
  const existing = overrides[id];
  const entry: FeatureHistoryEntry = {
    state,
    changedAt: new Date().toISOString(),
    ...(verification ? { verification } : {}),
  };
  overrides[id] = {
    state,
    ...(verification ? { verification } : {}),
    history: [...(existing?.history ?? []), entry],
  };

  const statuses = resolveFeatureStatuses(overrides);
  const selected = getFeatureStatus(statuses, id);
  if (selected.effectiveState !== state) {
    throw new Error(
      selected.reason ?? `${selected.title} cannot become ${state}.`,
    );
  }
  await atomicWriteJson(path, overrides);
  return statuses;
}

export function resolveFeatureStatuses(
  overrides: Partial<Record<FeatureId, FeatureOverride>> = {},
): FeatureStatus[] {
  const resolved: FeatureStatus[] = [];

  for (const definition of FEATURES) {
    const override = overrides[definition.id];
    const requestedState = override?.state ?? definition.defaultState;
    let effectiveState = requestedState;
    let reason: string | undefined;

    if (definition.activationOrder > 0 && requestedState !== "disabled") {
      const previous = resolved.filter(
        (item) =>
          item.activationOrder > 0 &&
          item.activationOrder < definition.activationOrder &&
          item.blocksLaterActivations,
      );
      const incomplete = previous.find(
        (item) => item.effectiveState !== "active",
      );
      if (incomplete) {
        effectiveState = "disabled";
        reason = `${incomplete.title} must be active first.`;
      } else if (
        requestedState === "active" &&
        override?.verification?.status !== "passed"
      ) {
        effectiveState = "disabled";
        reason = "A passing verification record is required before activation.";
      }
    }

    const status: FeatureStatus = {
      ...definition,
      requestedState,
      effectiveState,
      history: override?.history ?? [],
    };
    if (reason) status.reason = reason;
    if (override?.verification) status.verification = override.verification;
    resolved.push(status);
  }

  return resolved;
}

export function getFeatureStatus(
  statuses: FeatureStatus[],
  id: FeatureId,
): FeatureStatus {
  const status = statuses.find((item) => item.id === id);
  if (!status) throw new Error(`Unknown feature: ${id}.`);
  return status;
}

function validateOverrides(
  value: unknown,
): Partial<Record<FeatureId, FeatureOverride>> {
  if (!isObject(value))
    throw new Error("Feature configuration must be a JSON object.");
  const result: Partial<Record<FeatureId, FeatureOverride>> = {};

  for (const [id, rawOverride] of Object.entries(value)) {
    if (!FEATURE_IDS.includes(id as FeatureId))
      throw new Error(`Unknown feature in configuration: ${id}.`);
    if (
      !isObject(rawOverride) ||
      !FEATURE_STATES.includes(rawOverride.state as FeatureState)
    ) {
      throw new Error(`Invalid state for feature: ${id}.`);
    }
    const override: FeatureOverride = {
      state: rawOverride.state as FeatureState,
    };
    if (rawOverride.verification !== undefined) {
      override.verification = validateVerification(
        rawOverride.verification,
        `${id}.verification`,
      );
    }
    if (rawOverride.history !== undefined) {
      if (!Array.isArray(rawOverride.history)) {
        throw new Error(`Invalid activation history for feature: ${id}.`);
      }
      override.history = rawOverride.history.map((rawEntry, index) => {
        if (
          !isObject(rawEntry) ||
          !FEATURE_STATES.includes(rawEntry.state as FeatureState)
        ) {
          throw new Error(`Invalid history entry for feature: ${id}.`);
        }
        const changedAt = requiredTimestamp(
          rawEntry.changedAt,
          `${id}.history[${index}].changedAt`,
        );
        const entry: FeatureHistoryEntry = {
          state: rawEntry.state as FeatureState,
          changedAt,
        };
        if (rawEntry.verification !== undefined) {
          entry.verification = validateVerification(
            rawEntry.verification,
            `${id}.history[${index}].verification`,
          );
        }
        return entry;
      });
    }
    result[id as FeatureId] = override;
  }

  return result;
}

async function loadOverrides(
  path: string,
): Promise<Partial<Record<FeatureId, FeatureOverride>>> {
  try {
    return validateOverrides(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (isMissingFile(error)) return {};
    throw error;
  }
}

async function atomicWriteJson(
  path: string,
  value: Partial<Record<FeatureId, FeatureOverride>>,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function validateVerification(
  value: unknown,
  field: string,
): VerificationRecord {
  if (!isObject(value) || value.status !== "passed") {
    throw new Error(`Invalid verification for ${field}.`);
  }
  return {
    status: "passed",
    checkedAt: requiredTimestamp(value.checkedAt, `${field}.checkedAt`),
    command: requiredString(value.command, `${field}.command`),
  };
}

function requiredTimestamp(value: unknown, field: string): string {
  const result = requiredString(value, field);
  if (Number.isNaN(Date.parse(result))) throw new Error(`${field} is invalid.`);
  return result;
}

function feature(
  id: FeatureId,
  title: string,
  description: string,
  activationOrder: number,
  defaultState: FeatureState = "disabled",
  blocksLaterActivations = true,
): FeatureDefinition {
  return {
    id,
    title,
    description,
    activationOrder,
    defaultState,
    blocksLaterActivations,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${field} must be a non-empty string.`);
  return value.trim();
}

function isMissingFile(error: unknown): boolean {
  return isObject(error) && error.code === "ENOENT";
}
