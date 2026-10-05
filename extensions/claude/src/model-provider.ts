import { AI, getPreferenceValues, LocalStorage } from "@raycast/api";
import { createAnthropic, type AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { jsonSchema, streamText, type ModelMessage, type ToolSet } from "ai";
import {
  EFFORT_LEVELS,
  fetchAvailableModels,
  getCachedModels,
  type AvailableModel,
  type EffortLevel,
} from "./api/models";
import type { Model } from "./type";
import { getMaxTokensForModel, supportsTemperature } from "./utils/models";

/**
 * Raycast AI model provider (`ai.modelProvider` in package.json).
 *
 * Makes the Claude models on the user's own Anthropic key, and each saved Preset, appear
 * wherever Raycast lets the user pick a model — AI Chat, Quick AI, AI Commands. Raycast
 * gates extension-provided models behind Pro and a per-extension "Allow AI Models" toggle,
 * so none of this runs until the user turns it on.
 *
 * Two kinds of entry, told apart by id:
 * - a live model, whose id is the Anthropic model id as-is;
 * - a Preset, whose id is `PRESET_ID_PREFIX` + the preset's own id. Selecting it applies
 *   the preset's system prompt, model, output limit, and temperature.
 */

/** Distinguishes a Preset entry from a live model. No Anthropic model id starts with this. */
const PRESET_ID_PREFIX = "preset:";

/** The storage key `useModel`'s collection store writes Presets to. */
const PRESETS_KEY = "models";

/**
 * Required by Anthropic to set `thinking.block_binding` — see `blockBinding` below. The
 * AI SDK does not add this header itself, and sending the field without it is a 400.
 */
const THINKING_BINDING_BETA = "thinking-binding-controls-2026-08-01";

/**
 * Where a model's own API default effort is not `high`, Raycast's effort picker must open
 * on that value — otherwise merely choosing this provider would silently spend more than the
 * same model does everywhere else. The API reports which levels a model accepts but not its
 * default, so this cannot come from `capabilities`.
 *
 * ponytail: a hand-kept table. Add a row when a model ships with a non-`high` default.
 */
const DEFAULT_EFFORT_EXCEPTIONS: Record<string, EffortLevel> = {
  "claude-opus-5-5": "medium",
};

/** Raycast accepts these four, and they are exactly the image types Anthropic accepts. */
const VISION_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

/** Effort levels a model advertises, in ascending order. Empty when it takes no effort. */
function supportedEffortLevels(model: AvailableModel): EffortLevel[] {
  const effort = model.capabilities?.effort;
  if (!effort?.supported) return [];
  return EFFORT_LEVELS.filter((level) => effort[level]?.supported);
}

function supportsAdaptiveThinking(model: AvailableModel): boolean {
  return model.capabilities?.thinking?.types?.adaptive?.supported === true;
}

function defaultEffortFor(modelId: string, levels: EffortLevel[]): string {
  const preferred = DEFAULT_EFFORT_EXCEPTIONS[modelId] ?? "high";
  return levels.includes(preferred) ? preferred : levels[levels.length - 1];
}

/**
 * Capabilities declared from the API's own `capabilities` tree. A model missing from the
 * live list (the hardcoded fallback, or a stale cache) declares only what every Claude
 * model has — Raycast fails a registration that claims something it then cannot deliver.
 */
function capabilitiesFor(model: AvailableModel): AI.RegisteredModel["capabilities"] {
  const levels = supportedEffortLevels(model);
  return {
    systemMessage: { supported: true },
    streaming: { supported: true },
    tools: { supported: true },
    temperature: { supported: supportsTemperature(model.id) },
    ...(model.capabilities?.image_input?.supported ? { vision: { mediaTypes: [...VISION_MEDIA_TYPES] } } : {}),
    ...(levels.length > 0
      ? { reasoningEffort: { supported: true, options: levels, default: defaultEffortFor(model.id, levels) } }
      : {}),
  };
}

async function readPresets(): Promise<Model[]> {
  const raw = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Model[]) : [];
  } catch {
    // An unreadable presets key must not take the bare models down with it.
    return [];
  }
}

export const getModels: AI.GetModels = async () => {
  const liveModels = await fetchAvailableModels();
  const byId = new Map(liveModels.map((model) => [model.id, model]));

  const models: AI.RegisteredModel[] = liveModels.map((model) => ({
    id: model.id,
    title: model.display_name,
    description: "Through your Anthropic API key",
    capabilities: capabilitiesFor(model),
    ...(model.max_input_tokens ? { contextWindow: model.max_input_tokens } : {}),
  }));

  // The built-in default preset is left out: its prompt is the generic default and its
  // model is the newest Sonnet, so it would be a second, indistinguishable copy of an entry
  // already in the list above.
  for (const preset of await readPresets()) {
    if (preset.id === "default") continue;
    const underlying = byId.get(preset.option) ?? { id: preset.option, display_name: preset.option, created_at: "" };
    models.push({
      id: `${PRESET_ID_PREFIX}${preset.id}`,
      title: preset.name,
      description: `Preset · ${underlying.display_name}`,
      capabilities: capabilitiesFor(underlying),
      ...(underlying.max_input_tokens ? { contextWindow: underlying.max_input_tokens } : {}),
    });
  }

  return models;
};

/** What a request resolves to once a Preset (if any) has been applied. */
interface ResolvedTarget {
  modelId: string;
  presetPrompt?: string;
  presetMaxTokens?: number;
  presetTemperature?: number;
}

async function resolveTarget(registeredId: string): Promise<ResolvedTarget> {
  if (!registeredId.startsWith(PRESET_ID_PREFIX)) return { modelId: registeredId };

  const presetId = registeredId.slice(PRESET_ID_PREFIX.length);
  const preset = (await readPresets()).find((candidate) => candidate.id === presetId);
  // A preset deleted after Raycast last refreshed the list. Failing loudly beats quietly
  // answering on some other model with none of the instructions the user picked it for.
  if (!preset) throw new Error("This preset no longer exists. Pick another model, or recreate the preset.");

  const maxTokens = Number(preset.max_tokens);
  const temperature = Number(preset.temperature);
  return {
    modelId: preset.option,
    presetPrompt: preset.prompt,
    presetMaxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : undefined,
    presetTemperature: Number.isFinite(temperature) ? temperature : undefined,
  };
}

/**
 * Raycast's history can carry `role: "system"` messages. Passed through, the AI SDK sends
 * them as mid-conversation system messages, which only some Claude models accept — so they
 * are folded into the top-level system prompt, which every model accepts.
 */
function splitSystem(messages: AI.ModelMessage[]): { systemParts: string[]; rest: AI.ModelMessage[] } {
  const systemParts: string[] = [];
  const rest: AI.ModelMessage[] = [];
  for (const message of messages) {
    if (message.role === "system") systemParts.push(message.content);
    else rest.push(message);
  }
  return { systemParts, rest };
}

/** Tool input schemas arrive as plain JSON Schema; the AI SDK wants them wrapped. */
function toToolSet(tools: AI.ModelRequest["tools"]): ToolSet | undefined {
  if (!tools) return undefined;
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        description: tool.description,
        inputSchema: jsonSchema(
          (tool.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
        ),
      },
    ]),
  );
}

export const streamCompletion: AI.StreamCompletion = async (model, request) => {
  const target = await resolveTarget(model.id);
  // The cache `getModels` keeps fresh, not a network fetch: this runs on every message, and
  // a round trip to /v1/models before each one is latency the user waits through for a list
  // that almost never changes mid-conversation. Fetched only when no cache exists yet.
  const liveModels = (await getCachedModels()) ?? (await fetchAvailableModels());
  const liveModel = liveModels.find((candidate) => candidate.id === target.modelId) ?? {
    id: target.modelId,
    display_name: target.modelId,
    created_at: "",
  };

  const { systemParts, rest } = splitSystem(request.messages ?? []);
  // The preset's own instructions lead; whatever Raycast adds (an AI Command's prompt, a
  // chat's instructions) follows, so the preset frames the conversation rather than being
  // appended to someone else's framing.
  const system = [target.presetPrompt, request.system, ...systemParts].filter(Boolean).join("\n\n") || undefined;

  // A preset's temperature is the user's explicit choice, so it wins over Raycast's. Either
  // way it is sent only where the model accepts it: sampling parameters are a 400 on Claude
  // Opus 4.7 and later.
  const requestedTemperature = target.presetTemperature ?? request.temperature;
  const temperature = supportsTemperature(target.modelId) ? requestedTemperature : undefined;

  // Streaming carries no output ceiling of its own, so the model's full limit applies
  // unless a preset narrows it.
  const maxOutputTokens = target.presetMaxTokens ?? getMaxTokensForModel(target.modelId, liveModels);

  const effortLevels = supportedEffortLevels(liveModel);
  const requestedEffort = request.providerOptions?.raycast?.reasoningEffort;
  const effort = effortLevels.find((level) => level === requestedEffort);

  // The API takes no temperature while thinking is on — the AI SDK drops it with only a
  // console warning. So on the models that still accept a temperature (4.6 and earlier,
  // where thinking is optional), a deliberate one turns thinking off rather than being
  // silently discarded: a preset saved at 0.3 must actually run at 0.3. 1 is the API's
  // default and the only value thinking allows, so it does not count as deliberate.
  const wantsTemperature = temperature !== undefined && temperature !== 1;
  const adaptive = supportsAdaptiveThinking(liveModel) && !wantsTemperature;
  const anthropicOptions = {
    ...(effort ? { effort } : {}),
    ...(adaptive
      ? {
          thinking: {
            type: "adaptive",
            // The default, "omitted", streams empty reasoning — Raycast would show a long
            // silent pause where it could show what the model is weighing.
            display: "summarized",
            // Raycast rebuilds the history it replays. If that ever changes an earlier turn,
            // a signed thinking block from it no longer verifies, and the API would reject
            // every later message in the conversation. Dropping the stale block costs one
            // turn of re-planning; failing would make the chat unusable.
            blockBinding: { prefixMismatchBehavior: "drop_block" },
          },
        }
      : {}),
  } satisfies AnthropicLanguageModelOptions;

  const { apiKey } = getPreferenceValues<Preferences>();
  const anthropic = createAnthropic({ apiKey });

  return streamText({
    model: anthropic(target.modelId),
    system,
    messages: rest as ModelMessage[],
    maxOutputTokens,
    temperature: wantsTemperature ? temperature : undefined,
    tools: toToolSet(request.tools),
    // Forcing a tool call (`any`) is a 400 on Claude Opus 5.5, Sonnet 5.5, and Fable 5.1,
    // and Raycast executes the tools either way. "auto" with the tools present is the form
    // every Claude model accepts.
    toolChoice: request.toolChoice ? "auto" : undefined,
    headers: adaptive ? { "anthropic-beta": THINKING_BINDING_BETA } : undefined,
    providerOptions: { anthropic: anthropicOptions },
  });
};
