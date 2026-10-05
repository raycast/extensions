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
import { getMaxTokensForModel, shortModelName, supportsTemperature } from "./utils/models";

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

/**
 * The output cap applied when the Models API advertised no ceiling for the target model.
 * It is the largest output any current Claude model accepts, so it never lowers a valid
 * limit on any model shipping today, while still bounding a corrupt one (a stored "1e9").
 *
 * ponytail: a newly released model with a SMALLER ceiling and no advertised metadata could
 * still be sent more than it accepts. The cure is the metadata, which every current model
 * reports; this only covers its absence.
 */
const UNADVERTISED_OUTPUT_CAP = 128_000;

/** What Ask sends for a stored limit it cannot use (`Number(x) || 4096` in `buildModelRequestParams`). */
const LEGACY_UNUSABLE_LIMIT_TOKENS = 4096;

/**
 * Anthropic's documented substitute for a forced tool call on models that reject one: `auto`
 * plus an instruction naming the requirement. Raycast asked for a tool call to be required;
 * this is as close as those models allow, rather than silently making it optional.
 */
const REQUIRED_TOOL_INSTRUCTION =
  "Respond by calling one of the provided tools. Do not answer in text without making a tool call.";

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
  // The alias or its dated snapshot ("claude-opus-5-5-YYYYMMDD") — not a bare prefix, which
  // would also catch a different model such as "claude-opus-5-50".
  const exception = Object.entries(DEFAULT_EFFORT_EXCEPTIONS).find(
    ([alias]) => modelId === alias || new RegExp(`^${alias}-\\d{8}$`).test(modelId),
  );
  const preferred = exception?.[1] ?? "high";
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

/**
 * A preset named exactly like a live model ("Sonnet 5.5") would show as a second, identical
 * row that behaves differently. That is always true of the built-in default, which is
 * auto-named after its model, and can be true of any preset the user names that way. Where
 * the collision exists the preset is marked — "· Default" for the built-in one, "· Preset"
 * otherwise; hiding it instead was tried twice and each time hid a default the user had
 * customized. Presets whose names are unique keep them. Display only; stored names are
 * untouched.
 */
function presetTitle(preset: Model, liveTitles: Set<string>): string {
  if (!liveTitles.has(preset.name)) return preset.name;
  return `${preset.name} · ${preset.id === "default" ? "Default" : "Preset"}`;
}

async function readPresets(): Promise<Model[]> {
  const raw = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Row by row: one malformed preset (a hand-edited store, an interrupted write) must not
    // throw out of `getModels` and take every bare model down with it.
    const isScalar = (value: unknown) => value === undefined || typeof value === "string" || typeof value === "number";
    return parsed.filter(
      (row): row is Model =>
        typeof row === "object" &&
        row !== null &&
        typeof row.id === "string" &&
        row.id.length > 0 &&
        typeof row.name === "string" &&
        row.name.length > 0 &&
        typeof row.option === "string" &&
        row.option.length > 0 &&
        (row.prompt === undefined || typeof row.prompt === "string") &&
        isScalar(row.max_tokens) &&
        isScalar(row.temperature),
    );
  } catch {
    // An unreadable presets key must not take the bare models down with it.
    return [];
  }
}

export const getModels: AI.GetModels = async () => {
  const liveModels = await fetchAvailableModels({ throwOnAuthError: true });
  const byId = new Map(liveModels.map((model) => [model.id, model]));

  // Titles drop the "Claude" prefix: Raycast already labels every row with the extension
  // name ("Claude"), and the rest of this extension shortens model names the same way.
  const models: AI.RegisteredModel[] = liveModels.map((model) => ({
    id: model.id,
    title: shortModelName(model.display_name),
    description: "Through your Anthropic API key",
    capabilities: capabilitiesFor(model),
    ...(model.max_input_tokens ? { contextWindow: model.max_input_tokens } : {}),
  }));

  // Every preset is listed, the built-in default included. Hiding an "unedited" default
  // was tried twice and each rule hid a default the user had in fact customized (first any
  // prompt, then any setting other than the prompt); one entry that resembles its
  // underlying model is a smaller cost than a preset that silently is not there.
  const liveTitles = new Set(models.map((model) => model.title));
  for (const preset of await readPresets()) {
    const underlying = byId.get(preset.option) ?? { id: preset.option, display_name: preset.option, created_at: "" };
    models.push({
      id: `${PRESET_ID_PREFIX}${preset.id}`,
      title: presetTitle(preset, liveTitles),
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
    // A stored limit that is present but unusable (a legacy "0" the old form accepted) gets
    // the same 4096 Ask gives it (`buildModelRequestParams`), so one preset does not answer
    // at 4,096 tokens in Ask and at the model's full ceiling in Raycast AI.
    presetMaxTokens:
      Number.isFinite(maxTokens) && maxTokens >= 1
        ? Math.floor(maxTokens)
        : preset.max_tokens === undefined || preset.max_tokens === ""
          ? undefined
          : LEGACY_UNUSABLE_LIMIT_TOKENS,
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
    else if (message.role === "assistant") rest.push(withoutAssistantFiles(message));
    else rest.push(message);
  }
  return { systemParts, rest };
}

/**
 * Anthropic accepts no files in an assistant turn, and the AI SDK drops them silently — a
 * turn that was only a file vanishes from the history Claude sees. A short text marker keeps
 * the turn and tells the model something was there that it cannot read.
 */
function withoutAssistantFiles(message: Extract<AI.ModelMessage, { role: "assistant" }>): AI.ModelMessage {
  if (!message.content.some((part) => part.type === "file")) return message;
  return {
    ...message,
    content: message.content.map((part) =>
      part.type === "file" ? { type: "text" as const, text: `[${part.mediaType} attachment, not shown]` } : part,
    ),
  };
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

  // Without a preset limit: the model's advertised ceiling, or a name-based estimate when
  // the API reported none. With one: clamped against the advertised ceiling when there is
  // one, and against UNADVERTISED_OUTPUT_CAP otherwise — never against the name-based
  // estimate, which silently cut a valid 100,000-token Opus 5.5 preset to 32,000. A cached
  // ceiling that is not a positive number is malformed and is ignored.
  const cachedCeiling = liveModels.find((candidate) => candidate.id === target.modelId)?.max_tokens;
  const advertisedCeiling = typeof cachedCeiling === "number" && cachedCeiling > 0 ? cachedCeiling : undefined;
  const maxOutputTokens = target.presetMaxTokens
    ? Math.min(target.presetMaxTokens, advertisedCeiling ?? UNADVERTISED_OUTPUT_CAP)
    : getMaxTokensForModel(target.modelId, liveModels);

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
            // Opus 4.7 and later default to "omitted", which streams empty reasoning — Raycast
            // would show a long silent pause where it could show what the model is weighing.
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

  // Forcing a tool call (`any`) is a 400 on Claude Opus 5.5, Sonnet 5.5, and Fable 5.1.
  // "required" is kept only where it is the long-standing request shape — a pre-4.7 model
  // with thinking off — and degrades to "auto" everywhere else rather than risk a rejected
  // request on a model or thinking combination this code has not verified. With "auto"
  // the model may decline to call a tool; Raycast executes whatever calls it makes.
  const canForceToolCall = !adaptive && supportsTemperature(target.modelId);

  const requiredDowngraded = request.toolChoice === "required" && !canForceToolCall;

  const { apiKey } = getPreferenceValues<Preferences>();
  const anthropic = createAnthropic({ apiKey });

  return streamText({
    model: anthropic(target.modelId),
    system: requiredDowngraded ? [system, REQUIRED_TOOL_INSTRUCTION].filter(Boolean).join("\n\n") : system,
    messages: rest as ModelMessage[],
    maxOutputTokens,
    temperature: wantsTemperature ? temperature : undefined,
    tools: toToolSet(request.tools),
    toolChoice: requiredDowngraded ? "auto" : request.toolChoice,
    headers: adaptive ? { "anthropic-beta": THINKING_BINDING_BETA } : undefined,
    providerOptions: { anthropic: anthropicOptions },
  });
};
