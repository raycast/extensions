import type {
  AIGatewayModel,
  ChatCompletion,
  ChatCompletionChoice,
  ChatCompletionMessage,
  ChatCompletionUsage,
  ChatTokenDetails,
  DailyShareLeaderboard,
  DailyShareRow,
  EndpointMetricPercentiles,
  EndpointPricing,
  ImagePricingVariant,
  JsonValue,
  LeaderboardExport,
  LeaderboardMetric,
  LeaderboardModality,
  LeaderboardProviderRanking,
  ModelArchitecture,
  ModelCatalog,
  ModelEndpoint,
  ModelEndpointDetails,
  ModelPricing,
  PricingTier,
  ProviderLeaderboard,
  RankedProviderRow,
  ServiceTierPricing,
  ServiceTierRate,
  VideoDurationPricing,
  VideoCapabilities,
  VideoTokenPricing,
  VideoTokenRate,
} from "./types";

export class ResponseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResponseParseError";
  }
}

function fail(path: string, expected: string): never {
  throw new ResponseParseError(`${path} must be ${expected}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "an object");
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    return fail(path, "an array");
  }
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string") {
    return fail(path, "a string");
  }
  return value;
}

function nonEmptyString(value: unknown, path: string): string {
  const parsed = string(value, path);
  if (parsed.trim().length === 0) {
    return fail(path, "a non-empty string");
  }
  return parsed;
}

function number(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(path, "a finite number");
  }
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    return fail(path, "a boolean");
  }
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

function nullableNumber(value: unknown, path: string): number | null {
  return value === null ? null : number(value, path);
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : string(value, path);
}

function optionalNumber(value: unknown, path: string): number | undefined {
  return value === undefined ? undefined : number(value, path);
}

function optionalNullableNumber(value: unknown, path: string): number | null | undefined {
  return value === undefined ? undefined : nullableNumber(value, path);
}

function optionalNullableString(value: unknown, path: string): string | null | undefined {
  return value === undefined ? undefined : nullableString(value, path);
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
  return value === undefined ? undefined : boolean(value, path);
}

function stringArray(value: unknown, path: string): string[] {
  return array(value, path).map((item, index) => string(item, `${path}[${index}]`));
}

function numberArray(value: unknown, path: string): number[] {
  return array(value, path).map((item, index) => number(item, `${path}[${index}]`));
}

function jsonValue(value: unknown, path: string): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => jsonValue(item, `${path}[${index}]`));
  }
  if (typeof value === "object") {
    const result: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = jsonValue(item, `${path}.${key}`);
    }
    return result;
  }
  return fail(path, "valid JSON");
}

function jsonRecord(value: unknown, path: string): Record<string, JsonValue> {
  const parsed = jsonValue(value, path);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return fail(path, "an object");
  }
  return parsed;
}

function modelPricing(value: unknown, path: string): ModelPricing {
  const result = jsonRecord(value, path);
  optionalString(result.input, `${path}.input`);
  optionalString(result.output, `${path}.output`);
  const inputCacheRead = optionalString(result.input_cache_read, `${path}.input_cache_read`);
  const inputCacheWrite = optionalString(result.input_cache_write, `${path}.input_cache_write`);
  const webSearch = optionalString(result.web_search, `${path}.web_search`);
  const mapsSearch = optionalString(result.maps_search, `${path}.maps_search`);
  optionalString(result.image, `${path}.image`);
  const speechInputCharacterCost = optionalString(
    result.speech_input_character_cost,
    `${path}.speech_input_character_cost`,
  );
  const transcriptionDurationCostPerSecond = optionalString(
    result.transcription_duration_cost_per_second,
    `${path}.transcription_duration_cost_per_second`,
  );
  const inputTiers =
    result.input_tiers === undefined ? undefined : pricingTiers(result.input_tiers, `${path}.input_tiers`);
  const outputTiers =
    result.output_tiers === undefined ? undefined : pricingTiers(result.output_tiers, `${path}.output_tiers`);
  const inputCacheReadTiers =
    result.input_cache_read_tiers === undefined
      ? undefined
      : pricingTiers(result.input_cache_read_tiers, `${path}.input_cache_read_tiers`);
  const inputCacheWriteTiers =
    result.input_cache_write_tiers === undefined
      ? undefined
      : pricingTiers(result.input_cache_write_tiers, `${path}.input_cache_write_tiers`);
  const imageDimensionQualityPricing =
    result.image_dimension_quality_pricing === undefined
      ? undefined
      : imagePricingVariants(result.image_dimension_quality_pricing, `${path}.image_dimension_quality_pricing`);
  const videoDurationPricing =
    result.video_duration_pricing === undefined
      ? undefined
      : videoDurationPrices(result.video_duration_pricing, `${path}.video_duration_pricing`);
  const videoTokenPricing =
    result.video_token_pricing === undefined
      ? undefined
      : videoTokenPrices(result.video_token_pricing, `${path}.video_token_pricing`);
  const serviceTiers =
    result.service_tiers === undefined ? undefined : serviceTierPricing(result.service_tiers, `${path}.service_tiers`);

  if (inputCacheRead !== undefined) result.inputCacheRead = inputCacheRead;
  if (inputCacheWrite !== undefined) result.inputCacheWrite = inputCacheWrite;
  if (webSearch !== undefined) result.webSearch = webSearch;
  if (mapsSearch !== undefined) result.mapsSearch = mapsSearch;
  if (speechInputCharacterCost !== undefined) result.speechInputCharacterCost = speechInputCharacterCost;
  if (transcriptionDurationCostPerSecond !== undefined) {
    result.transcriptionDurationCostPerSecond = transcriptionDurationCostPerSecond;
  }
  if (inputTiers !== undefined) result.inputTiers = inputTiers;
  if (outputTiers !== undefined) result.outputTiers = outputTiers;
  if (inputCacheReadTiers !== undefined) result.inputCacheReadTiers = inputCacheReadTiers;
  if (inputCacheWriteTiers !== undefined) result.inputCacheWriteTiers = inputCacheWriteTiers;
  if (imageDimensionQualityPricing !== undefined) result.imageDimensionQualityPricing = imageDimensionQualityPricing;
  if (videoDurationPricing !== undefined) result.videoDurationPricing = videoDurationPricing;
  if (videoTokenPricing !== undefined) result.videoTokenPricing = videoTokenPricing;
  if (serviceTiers !== undefined) result.serviceTiers = serviceTiers;
  return result as ModelPricing;
}

function pricingTiers(value: unknown, path: string): PricingTier[] {
  return array(value, path).map((value, index) => {
    const tierPath = `${path}[${index}]`;
    const tier = jsonRecord(value, tierPath);
    string(tier.cost, `${tierPath}.cost`);
    optionalNumber(tier.min, `${tierPath}.min`);
    optionalNumber(tier.max, `${tierPath}.max`);
    return tier as PricingTier;
  });
}

function imagePricingVariants(value: unknown, path: string): ImagePricingVariant[] {
  return array(value, path).map((value, index) => {
    const itemPath = `${path}[${index}]`;
    const item = jsonRecord(value, itemPath);
    string(item.cost, `${itemPath}.cost`);
    optionalString(item.size, `${itemPath}.size`);
    optionalString(item.quality, `${itemPath}.quality`);
    optionalString(item.operation, `${itemPath}.operation`);
    optionalString(item.style, `${itemPath}.style`);
    return item as ImagePricingVariant;
  });
}

function videoDurationPrices(value: unknown, path: string): VideoDurationPricing[] {
  return array(value, path).map((value, index) => {
    const itemPath = `${path}[${index}]`;
    const item = jsonRecord(value, itemPath);
    const costPerSecond = string(item.cost_per_second, `${itemPath}.cost_per_second`);
    optionalString(item.resolution, `${itemPath}.resolution`);
    optionalString(item.mode, `${itemPath}.mode`);
    optionalBoolean(item.audio, `${itemPath}.audio`);
    const voiceControl = optionalBoolean(item.voice_control, `${itemPath}.voice_control`);
    item.costPerSecond = costPerSecond;
    if (voiceControl !== undefined) item.voiceControl = voiceControl;
    return item as VideoDurationPricing;
  });
}

function videoTokenRate(value: unknown, path: string): VideoTokenRate {
  const item = jsonRecord(value, path);
  const costPerMillionTokens = string(item.cost_per_million_tokens, `${path}.cost_per_million_tokens`);
  item.costPerMillionTokens = costPerMillionTokens;
  return item as VideoTokenRate;
}

function videoTokenPrices(value: unknown, path: string): VideoTokenPricing {
  const result = jsonRecord(value, path);
  const noVideoInput =
    result.no_video_input === undefined ? undefined : videoTokenRate(result.no_video_input, `${path}.no_video_input`);
  const withVideoInput =
    result.with_video_input === undefined
      ? undefined
      : videoTokenRate(result.with_video_input, `${path}.with_video_input`);
  optionalString(result.notes, `${path}.notes`);
  if (noVideoInput !== undefined) result.noVideoInput = noVideoInput;
  if (withVideoInput !== undefined) result.withVideoInput = withVideoInput;
  return result as VideoTokenPricing;
}

function serviceTierRate(value: unknown, path: string): ServiceTierRate {
  const result = jsonRecord(value, path);
  optionalString(result.input, `${path}.input`);
  optionalString(result.output, `${path}.output`);
  const inputCacheRead = optionalString(result.input_cache_read, `${path}.input_cache_read`);
  const inputCacheWrite = optionalString(result.input_cache_write, `${path}.input_cache_write`);
  if (inputCacheRead !== undefined) result.inputCacheRead = inputCacheRead;
  if (inputCacheWrite !== undefined) result.inputCacheWrite = inputCacheWrite;
  return result as ServiceTierRate;
}

function serviceTierPricing(value: unknown, path: string): ServiceTierPricing {
  const result = jsonRecord(value, path);
  const priority = result.priority === undefined ? undefined : serviceTierRate(result.priority, `${path}.priority`);
  const flex = result.flex === undefined ? undefined : serviceTierRate(result.flex, `${path}.flex`);
  if (priority !== undefined) result.priority = priority;
  if (flex !== undefined) result.flex = flex;
  return result as ServiceTierPricing;
}

function videoCapabilities(value: unknown, path: string): VideoCapabilities {
  const result = jsonRecord(value, path);
  const supportedOperations =
    result.supported_operations === undefined
      ? undefined
      : stringArray(result.supported_operations, `${path}.supported_operations`);
  const supportedResolutions =
    result.supported_resolutions === undefined
      ? undefined
      : stringArray(result.supported_resolutions, `${path}.supported_resolutions`);
  const supportedAspectRatios =
    result.supported_aspect_ratios === undefined
      ? undefined
      : stringArray(result.supported_aspect_ratios, `${path}.supported_aspect_ratios`);
  const supportedDurationsSeconds =
    result.supported_durations_seconds === undefined
      ? undefined
      : numberArray(result.supported_durations_seconds, `${path}.supported_durations_seconds`);
  const supportedFps =
    result.supported_fps === undefined ? undefined : numberArray(result.supported_fps, `${path}.supported_fps`);
  const generateAudio = optionalBoolean(result.generate_audio, `${path}.generate_audio`);
  const maxSampleCount = optionalNumber(result.max_sample_count, `${path}.max_sample_count`);
  const inputLimits =
    result.input_limits === undefined ? undefined : jsonRecord(result.input_limits, `${path}.input_limits`);

  if (supportedOperations !== undefined) result.supportedOperations = supportedOperations;
  if (supportedResolutions !== undefined) result.supportedResolutions = supportedResolutions;
  if (supportedAspectRatios !== undefined) result.supportedAspectRatios = supportedAspectRatios;
  if (supportedDurationsSeconds !== undefined) result.supportedDurationsSeconds = supportedDurationsSeconds;
  if (supportedFps !== undefined) result.supportedFps = supportedFps;
  if (generateAudio !== undefined) result.generateAudio = generateAudio;
  if (maxSampleCount !== undefined) result.maxSampleCount = maxSampleCount;
  if (inputLimits !== undefined) result.inputLimits = inputLimits;
  return result as VideoCapabilities;
}

function model(value: unknown, path: string): AIGatewayModel {
  const item = record(value, path);
  if (item.object !== "model") {
    return fail(`${path}.object`, '"model"');
  }

  return {
    id: nonEmptyString(item.id, `${path}.id`),
    object: "model",
    created: number(item.created, `${path}.created`),
    released: optionalNumber(item.released, `${path}.released`),
    ownedBy: nonEmptyString(item.owned_by, `${path}.owned_by`),
    name: nonEmptyString(item.name, `${path}.name`),
    description: optionalString(item.description, `${path}.description`),
    contextWindow: optionalNumber(item.context_window, `${path}.context_window`),
    maxTokens: optionalNumber(item.max_tokens, `${path}.max_tokens`),
    type: optionalString(item.type, `${path}.type`),
    tags: item.tags === undefined ? [] : stringArray(item.tags, `${path}.tags`),
    pricing: item.pricing === undefined ? undefined : modelPricing(item.pricing, `${path}.pricing`),
    videoCapabilities:
      item.video_capabilities === undefined || item.video_capabilities === null
        ? undefined
        : videoCapabilities(item.video_capabilities, `${path}.video_capabilities`),
  };
}

export function parseModelCatalog(value: unknown): ModelCatalog {
  const root = record(value, "response");
  if (root.object !== "list") {
    return fail("response.object", '"list"');
  }
  return {
    object: "list",
    data: array(root.data, "response.data").map((item, index) => model(item, `response.data[${index}]`)),
  };
}

function architecture(value: unknown, path: string): ModelArchitecture {
  const item = record(value, path);
  return {
    tokenizer: nullableString(item.tokenizer, `${path}.tokenizer`),
    instructType: nullableString(item.instruct_type, `${path}.instruct_type`),
    modality: string(item.modality, `${path}.modality`),
    inputModalities: stringArray(item.input_modalities, `${path}.input_modalities`),
    outputModalities: stringArray(item.output_modalities, `${path}.output_modalities`),
  };
}

function endpointPricing(value: unknown, path: string): EndpointPricing {
  const result = jsonRecord(value, path);
  optionalString(result.prompt, `${path}.prompt`);
  optionalString(result.completion, `${path}.completion`);
  optionalString(result.request, `${path}.request`);
  optionalString(result.image, `${path}.image`);
  const imageOutput = optionalString(result.image_output, `${path}.image_output`);
  const webSearch = optionalString(result.web_search, `${path}.web_search`);
  const internalReasoning = optionalString(result.internal_reasoning, `${path}.internal_reasoning`);
  const inputCacheRead = optionalString(result.input_cache_read, `${path}.input_cache_read`);
  const inputCacheWrite = optionalString(result.input_cache_write, `${path}.input_cache_write`);
  const speechInputCharacterCost = optionalString(
    result.speech_input_character_cost,
    `${path}.speech_input_character_cost`,
  );
  const transcriptionDurationCostPerSecond = optionalString(
    result.transcription_duration_cost_per_second,
    `${path}.transcription_duration_cost_per_second`,
  );
  const imageDimensionQualityPricing =
    result.image_dimension_quality_pricing === undefined
      ? undefined
      : imagePricingVariants(result.image_dimension_quality_pricing, `${path}.image_dimension_quality_pricing`);
  const videoDurationPricing =
    result.video_duration_pricing === undefined
      ? undefined
      : videoDurationPrices(result.video_duration_pricing, `${path}.video_duration_pricing`);
  const videoTokenPricing =
    result.video_token_pricing === undefined
      ? undefined
      : videoTokenPrices(result.video_token_pricing, `${path}.video_token_pricing`);
  optionalNumber(result.discount, `${path}.discount`);

  if (imageOutput !== undefined) result.imageOutput = imageOutput;
  if (webSearch !== undefined) result.webSearch = webSearch;
  if (internalReasoning !== undefined) result.internalReasoning = internalReasoning;
  if (inputCacheRead !== undefined) result.inputCacheRead = inputCacheRead;
  if (inputCacheWrite !== undefined) result.inputCacheWrite = inputCacheWrite;
  if (speechInputCharacterCost !== undefined) result.speechInputCharacterCost = speechInputCharacterCost;
  if (transcriptionDurationCostPerSecond !== undefined) {
    result.transcriptionDurationCostPerSecond = transcriptionDurationCostPerSecond;
  }
  if (imageDimensionQualityPricing !== undefined) result.imageDimensionQualityPricing = imageDimensionQualityPricing;
  if (videoDurationPricing !== undefined) result.videoDurationPricing = videoDurationPricing;
  if (videoTokenPricing !== undefined) result.videoTokenPricing = videoTokenPricing;
  return result as EndpointPricing;
}

function percentiles(value: unknown, path: string): EndpointMetricPercentiles {
  const item = record(value, path);
  return {
    p50: number(item.p50, `${path}.p50`),
    p95: number(item.p95, `${path}.p95`),
  };
}

function endpoint(value: unknown, path: string): ModelEndpoint {
  const item = record(value, path);
  return {
    name: nonEmptyString(item.name, `${path}.name`),
    modelName: nonEmptyString(item.model_name, `${path}.model_name`),
    providerName: nonEmptyString(item.provider_name, `${path}.provider_name`),
    contextLength: optionalNumber(item.context_length, `${path}.context_length`),
    pricing: endpointPricing(item.pricing, `${path}.pricing`),
    tags: item.tags === undefined ? [] : stringArray(item.tags, `${path}.tags`),
    quantization: optionalNullableString(item.quantization, `${path}.quantization`),
    maxCompletionTokens: optionalNullableNumber(item.max_completion_tokens, `${path}.max_completion_tokens`),
    maxPromptTokens: optionalNullableNumber(item.max_prompt_tokens, `${path}.max_prompt_tokens`),
    supportedParameters:
      item.supported_parameters === undefined
        ? []
        : stringArray(item.supported_parameters, `${path}.supported_parameters`),
    status: number(item.status, `${path}.status`),
    uptimeLast15Minutes: optionalNullableNumber(item.uptime_last_15m, `${path}.uptime_last_15m`),
    uptimeLastHour: optionalNullableNumber(item.uptime_last_1h, `${path}.uptime_last_1h`),
    uptimeLastDay: optionalNullableNumber(item.uptime_last_1d, `${path}.uptime_last_1d`),
    latencyLastHour:
      item.latency_last_1h === undefined || item.latency_last_1h === null
        ? item.latency_last_1h
        : percentiles(item.latency_last_1h, `${path}.latency_last_1h`),
    throughputLastHour:
      item.throughput_last_1h === undefined || item.throughput_last_1h === null
        ? item.throughput_last_1h
        : percentiles(item.throughput_last_1h, `${path}.throughput_last_1h`),
    supportsImplicitCaching: optionalBoolean(item.supports_implicit_caching, `${path}.supports_implicit_caching`),
  };
}

export function parseModelEndpointDetails(value: unknown): ModelEndpointDetails {
  const root = record(value, "response");
  const data = record(root.data, "response.data");
  return {
    id: nonEmptyString(data.id, "response.data.id"),
    name: nonEmptyString(data.name, "response.data.name"),
    created: number(data.created, "response.data.created"),
    released: optionalNumber(data.released, "response.data.released"),
    description: optionalString(data.description, "response.data.description"),
    architecture: architecture(data.architecture, "response.data.architecture"),
    endpoints: array(data.endpoints, "response.data.endpoints").map((item, index) =>
      endpoint(item, `response.data.endpoints[${index}]`),
    ),
    videoCapabilities:
      data.video_capabilities === undefined || data.video_capabilities === null
        ? undefined
        : videoCapabilities(data.video_capabilities, "response.data.video_capabilities"),
  };
}

function leaderboardMetric(value: unknown, path: string): LeaderboardMetric {
  if (
    value !== "tokens" &&
    value !== "requests" &&
    value !== "spend" &&
    value !== "imageCount" &&
    value !== "videoCount"
  ) {
    return fail(path, '"tokens", "requests", "spend", "imageCount", or "videoCount"');
  }
  return value;
}

function leaderboardModality(value: unknown, path: string): LeaderboardModality {
  if (value !== "all" && value !== "text" && value !== "image" && value !== "video") {
    return fail(path, '"all", "text", "image", or "video"');
  }
  return value;
}

function leaderboardProviderRanking(value: unknown, path: string): LeaderboardProviderRanking {
  if (value !== "Token Volume" && value !== "Spend") {
    return fail(path, '"Token Volume" or "Spend"');
  }
  return value;
}

function dailyShareRow(
  value: unknown,
  path: string,
  dataset: "models" | "labs",
  modality: LeaderboardModality,
): DailyShareRow {
  const item = record(value, path);
  const expectedGroup = dataset === "models" ? "model" : "lab";
  if (item.group !== expectedGroup) {
    return fail(`${path}.group`, `"${expectedGroup}"`);
  }
  const date = string(item.date, `${path}.date`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail(`${path}.date`, "an ISO calendar date");
  }
  const rowModality = leaderboardModality(item.modality, `${path}.modality`);
  if (rowModality !== modality) {
    return fail(`${path}.modality`, `the root modality "${modality}"`);
  }
  return {
    date,
    group: expectedGroup,
    name: nonEmptyString(item.name, `${path}.name`),
    metric: leaderboardMetric(item.metric, `${path}.metric`),
    modality: rowModality,
    sharePercent: number(item.share_percent, `${path}.share_percent`),
  };
}

function rankedProviderRow(value: unknown, path: string): RankedProviderRow {
  const item = record(value, path);
  return {
    rank: number(item.rank, `${path}.rank`),
    name: nonEmptyString(item.name, `${path}.name`),
    rankedBy: leaderboardProviderRanking(item.ranked_by, `${path}.ranked_by`),
    url: optionalString(item.url, `${path}.url`),
    description: optionalString(item.description, `${path}.description`),
  };
}

export function parseLeaderboardExport(value: unknown): LeaderboardExport {
  const root = record(value, "response");
  const license = nonEmptyString(root.license, "response.license");
  const licenseUrl = nonEmptyString(root.license_url, "response.license_url");
  const rows = array(root.rows, "response.rows");

  if (root.dataset === "models" || root.dataset === "labs") {
    const dataset = root.dataset;
    const modality = leaderboardModality(root.modality, "response.modality");
    const result: DailyShareLeaderboard = {
      dataset,
      modality,
      license,
      licenseUrl,
      rows: rows.map((item, index) => dailyShareRow(item, `response.rows[${index}]`, dataset, modality)),
    };
    return result;
  }
  if (root.dataset === "providers") {
    const result: ProviderLeaderboard = {
      dataset: "providers",
      license,
      licenseUrl,
      rows: rows.map((item, index) => rankedProviderRow(item, `response.rows[${index}]`)),
    };
    return result;
  }
  return fail("response.dataset", '"models", "labs", or "providers"');
}

function tokenDetails(value: unknown, path: string): ChatTokenDetails {
  const item = record(value, path);
  return {
    cachedTokens: optionalNumber(item.cached_tokens, `${path}.cached_tokens`),
    reasoningTokens: optionalNumber(item.reasoning_tokens, `${path}.reasoning_tokens`),
    audioTokens: optionalNumber(item.audio_tokens, `${path}.audio_tokens`),
    acceptedPredictionTokens: optionalNumber(item.accepted_prediction_tokens, `${path}.accepted_prediction_tokens`),
    rejectedPredictionTokens: optionalNumber(item.rejected_prediction_tokens, `${path}.rejected_prediction_tokens`),
  };
}

function chatUsage(value: unknown, path: string): ChatCompletionUsage {
  const item = record(value, path);
  return {
    promptTokens: number(item.prompt_tokens, `${path}.prompt_tokens`),
    completionTokens: number(item.completion_tokens, `${path}.completion_tokens`),
    totalTokens: number(item.total_tokens, `${path}.total_tokens`),
    promptTokensDetails:
      item.prompt_tokens_details === undefined
        ? undefined
        : tokenDetails(item.prompt_tokens_details, `${path}.prompt_tokens_details`),
    completionTokensDetails:
      item.completion_tokens_details === undefined
        ? undefined
        : tokenDetails(item.completion_tokens_details, `${path}.completion_tokens_details`),
  };
}

function chatMessage(value: unknown, path: string): ChatCompletionMessage {
  const item = record(value, path);
  if (item.role !== "assistant") {
    return fail(`${path}.role`, '"assistant"');
  }
  const toolCalls =
    item.tool_calls === undefined
      ? undefined
      : array(item.tool_calls, `${path}.tool_calls`).map((value, index) => {
          const toolPath = `${path}.tool_calls[${index}]`;
          const tool = record(value, toolPath);
          if (tool.type !== "function") {
            return fail(`${toolPath}.type`, '"function"');
          }
          const call = record(tool.function, `${toolPath}.function`);
          return {
            id: nonEmptyString(tool.id, `${toolPath}.id`),
            type: "function" as const,
            function: {
              name: nonEmptyString(call.name, `${toolPath}.function.name`),
              arguments: string(call.arguments, `${toolPath}.function.arguments`),
            },
          };
        });

  return {
    role: "assistant",
    content: nullableString(item.content, `${path}.content`),
    refusal: item.refusal === undefined ? undefined : nullableString(item.refusal, `${path}.refusal`),
    toolCalls,
  };
}

function chatChoice(value: unknown, path: string): ChatCompletionChoice {
  const item = record(value, path);
  return {
    index: number(item.index, `${path}.index`),
    message: chatMessage(item.message, `${path}.message`),
    finishReason: nullableString(item.finish_reason, `${path}.finish_reason`),
    logprobs:
      item.logprobs === undefined
        ? undefined
        : item.logprobs === null
          ? null
          : jsonValue(item.logprobs, `${path}.logprobs`),
  };
}

export function parseChatCompletion(value: unknown): ChatCompletion {
  const root = record(value, "response");
  if (root.object !== "chat.completion") {
    return fail("response.object", '"chat.completion"');
  }

  const provider = optionalString(root.provider, "response.provider");
  const providerMetadata =
    root.provider_metadata === undefined ? undefined : jsonRecord(root.provider_metadata, "response.provider_metadata");
  const gatewayMetadata =
    root.gateway_metadata === undefined ? undefined : jsonRecord(root.gateway_metadata, "response.gateway_metadata");

  return {
    id: nonEmptyString(root.id, "response.id"),
    object: "chat.completion",
    created: number(root.created, "response.created"),
    model: nonEmptyString(root.model, "response.model"),
    choices: array(root.choices, "response.choices").map((item, index) =>
      chatChoice(item, `response.choices[${index}]`),
    ),
    usage: root.usage === undefined ? undefined : chatUsage(root.usage, "response.usage"),
    systemFingerprint:
      root.system_fingerprint === undefined
        ? undefined
        : nullableString(root.system_fingerprint, "response.system_fingerprint"),
    provider,
    providerMetadata,
    gatewayMetadata,
  };
}
