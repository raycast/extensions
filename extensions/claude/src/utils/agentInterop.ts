import { v4 as uuidv4 } from "uuid";
import type { AvailableModel } from "../api/models";
import type { Model } from "../type";
import { getMaxTokensForModel } from "./models";

// ─────────────────────────────────────────────────────────────────────────────
// PROVISIONAL — Raycast v2 "Agent" JSON interop.
//
// Raycast v2 renamed Presets → Agents. The shape below is reconstructed from two real
// ray.so export samples (not a live export we generated ourselves), and Anthropic's
// model-id suffix Raycast uses (`anthropic-claude-sonnet-4`) is likewise sample-derived,
// not confirmed against a fresh export — Raycast's own naming is known to lag the API's.
//
// Only the IMPORT direction ships. The export half (preset → Agent JSON) was removed
// before submission: its model-id mapping was never checked against a real exported file,
// and shipping an unverified mapping behind an unreachable function invites someone to
// wire it up later without knowing it was a guess. Import is the valuable direction
// anyway — it turns ray.so's preset library into Claude presets — and it fails safe,
// skipping any row whose model is not ours rather than inventing one.
// ─────────────────────────────────────────────────────────────────────────────

/** One entry in a Raycast v2 Agent export — a bare JSON array, no version wrapper. */
export interface RaycastAgent {
  name: string;
  instructions: string;
  icon: string;
  model: string;
  web_search: boolean;
  image_generation: boolean;
  /** Only seen in one of two known samples — optional. */
  creativity?: "low" | "medium" | "maximum";
}

/** Default icon used when exporting a preset as an Agent (matches the observed sample). */
const DEFAULT_AGENT_ICON = "raycast-logo-neg";

/** Prefix Raycast uses to namespace Anthropic models in Agent JSON (sample-derived). */
const ANTHROPIC_AGENT_PREFIX = "anthropic-";

/**
 * Strips Raycast's provider namespace from an Agent model id. Returns null for anything not in the `anthropic-` namespace
 * (`raycast-ray1`, `openai-*`, …) — those are a different provider and are not ours to
 * import, handled by the caller as a skip rather than a failure.
 */
export function fromAgentModelId(agentModelId: string): string | null {
  if (!agentModelId.startsWith(ANTHROPIC_AGENT_PREFIX)) return null;
  return agentModelId.slice(ANTHROPIC_AGENT_PREFIX.length);
}

/** Outcome of importing one Agent row. */
export type AgentImportOutcome =
  | { status: "imported"; model: Model; warning?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export interface ImportAgentsResult {
  outcomes: AgentImportOutcome[];
  models: Model[];
  tally: { imported: number; skipped: number; failed: number };
}

function coerceAgent(raw: unknown): RaycastAgent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.name !== "string" || row.name.trim() === "") return null;
  if (typeof row.instructions !== "string") return null;
  if (typeof row.model !== "string" || row.model.trim() === "") return null;
  return {
    name: row.name,
    instructions: row.instructions,
    icon: typeof row.icon === "string" ? row.icon : DEFAULT_AGENT_ICON,
    model: row.model,
    web_search: Boolean(row.web_search),
    image_generation: Boolean(row.image_generation),
  };
}

/**
 * Imports Raycast Agent JSON rows as our presets — the more valuable direction, per the
 * brief: it turns ray.so's preset library into usable Claude presets. Non-Anthropic
 * agents (`raycast-ray1`, `openai-*`, …) are skipped with a tallied count rather than
 * imported against a model we can't run. `instructions → prompt`, `name → name`,
 * `model →` our id when the `anthropic-` namespace maps to a Claude model, else falls
 * back to the default preset's model with a warning folded into the skip/imported
 * accounting the same way `importPresetsFromYaml` does.
 */
export function importAgentsAsPresets(
  rawRows: unknown[],
  availableModels: AvailableModel[],
  defaultModel: Model,
  now: () => string = () => new Date().toISOString(),
): ImportAgentsResult {
  const outcomes: AgentImportOutcome[] = [];
  const models: Model[] = [];

  for (const raw of rawRows) {
    const agent = coerceAgent(raw);
    if (!agent) {
      outcomes.push({ status: "failed", reason: "Row is missing a required field (name, instructions, or model)." });
      continue;
    }

    const ourModelId = fromAgentModelId(agent.model);
    if (ourModelId === null) {
      outcomes.push({ status: "skipped", reason: `"${agent.name}" uses a non-Anthropic model (${agent.model}).` });
      continue;
    }

    const isKnownModel = availableModels.length === 0 || availableModels.some((model) => model.id === ourModelId);
    const resolvedModelId = isKnownModel ? ourModelId : defaultModel.option;
    // Same unknown-model warning shape as the YAML path (`importPresetsFromYaml`) — a
    // fallen-back model must be visible to the caller, not just inferable by comparing
    // `model.option` against what the file said.
    const warning = isKnownModel ? undefined : `Unknown model "${ourModelId}" — fell back to ${defaultModel.option}.`;

    const timestamp = now();
    const model: Model = {
      id: uuidv4(),
      name: agent.name,
      prompt: agent.instructions,
      option: resolvedModelId,
      // Agent JSON carries no temperature-equivalent numeric value (`creativity` is a
      // different axis) — land on the default, same as a fresh preset from the form.
      temperature: "1",
      max_tokens: getMaxTokensForModel(resolvedModelId, availableModels).toString(),
      pinned: false,
      created_at: timestamp,
      updated_at: timestamp,
    };

    models.push(model);
    outcomes.push({ status: "imported", model, warning });
  }

  const tally = outcomes.reduce(
    (acc, outcome) => {
      if (outcome.status === "imported") acc.imported += 1;
      else if (outcome.status === "skipped") acc.skipped += 1;
      else acc.failed += 1;
      return acc;
    },
    { imported: 0, skipped: 0, failed: 0 },
  );

  return { outcomes, models, tally };
}
