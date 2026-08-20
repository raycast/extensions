import type { AvailableModel } from "../api/models";
import type { Model } from "../type";
import { findNewestModelInTier, getMaxTokensForModel, shortModelName, type ModelTier } from "./models";

/**
 * Starter presets, defined against model *families* rather than pinned ids so they
 * resolve to whatever the newest Opus/Sonnet/Haiku is at seed time.
 */
type PresetSeed = {
  id: string;
  tier: ModelTier;
  /** Suffix appended to the resolved model's short display name, e.g. "Opus 5 · Deep Reasoning". */
  label: string;
  prompt: string;
};

/**
 * Seeded presets leave temperature at the default. Sampling parameters were removed on
 * Claude Opus 4.7 and later, so a preset pinned to a non-default temperature would 400
 * against every current model — the steering belongs in the prompt instead.
 */
const DEFAULT_TEMPERATURE = "1";

const PRESET_SEEDS: PresetSeed[] = [
  {
    id: "preset-deep-reasoning",
    tier: "opus",
    label: "Deep Reasoning",
    // No "work step by step" or "double-check" instruction: Anthropic's Opus 5 prompting
    // guidance says the model verifies its own work unprompted, and telling it to do so
    // "cause[s] over-verification … removing them reduces wasted tokens with no loss in
    // quality." Depth is requested as an output property instead of a procedure.
    prompt:
      "You are a careful, rigorous thinking partner. State your assumptions, and flag where you " +
      "are uncertain rather than guessing. Give an in-depth answer rather than a high-level summary.",
  },
  {
    id: "preset-balanced",
    tier: "sonnet",
    label: "Balanced",
    // Conciseness wording taken from Anthropic's Opus 5 prompting guidance, which notes
    // that lowering effort reduces *thinking* without reliably shortening the visible
    // response — length has to be prompted for explicitly.
    prompt:
      "Keep responses focused, brief, and concise. Keep disclaimers and caveats short, and spend " +
      "most of the response on the main answer. When asked to explain something, give a high-level " +
      "summary unless an in-depth explanation is specifically requested.",
  },
  {
    id: "preset-quick-answer",
    tier: "haiku",
    label: "Quick Answer",
    prompt:
      "Answer in as few words as the question honestly allows — a sentence or two where that " +
      "suffices. Lead with the answer itself: no preamble, and no restating the question.",
  },
  {
    id: "preset-code",
    tier: "sonnet",
    label: "Code",
    // Scope-discipline wording follows Anthropic's Opus 5 guidance: the model can expand
    // a task's scope on its own, and constraining it explicitly is the documented fix.
    prompt:
      "You are a senior software engineer. Return working code with no placeholder comments, and " +
      "explain trade-offs only where a choice is non-obvious. Deliver what was asked, at the scope " +
      "intended: make routine judgment calls yourself, and check in only when different readings of " +
      "the request would lead to materially different work. If the request seems mistaken or a better " +
      "approach exists, say so in a sentence and continue with the task as asked.",
  },
];

/**
 * Builds the starter presets from the live model list. Seeds whose family isn't
 * available are dropped rather than pinned to a guessed id, so an account without Opus
 * access doesn't get a preset that errors on first use.
 */
export function buildSeedPresets(availableModels: AvailableModel[], timestamp: string): Model[] {
  return PRESET_SEEDS.flatMap((seed) => {
    const model = findNewestModelInTier(availableModels, seed.tier);
    if (!model) return [];

    return [
      {
        id: seed.id,
        // Stored without the "Claude" prefix — every model here is a Claude model, so it
        // only costs space in the picker. Display code strips it too, for user-set names.
        name: `${shortModelName(model.display_name)} · ${seed.label}`,
        prompt: seed.prompt,
        option: model.id,
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: getMaxTokensForModel(model.id, availableModels).toString(),
        pinned: false,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ];
  });
}

/** Every id this module can seed — used to tell a seeded preset from a user-made one. */
export const SEEDED_PRESET_IDS: string[] = PRESET_SEEDS.map((seed) => seed.id);
