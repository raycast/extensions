export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type PricingTier = Record<string, JsonValue> & {
  cost: string;
  min?: number;
  max?: number;
};

export type ImagePricingVariant = Record<string, JsonValue> & {
  cost: string;
  size?: string;
  quality?: string;
  operation?: string;
  style?: string;
};

export type VideoDurationPricing = Record<string, JsonValue> & {
  cost_per_second: string;
  costPerSecond: string;
  resolution?: string;
  mode?: string;
  audio?: boolean;
  voice_control?: boolean;
  voiceControl?: boolean;
};

export type VideoTokenRate = Record<string, JsonValue> & {
  cost_per_million_tokens: string;
  costPerMillionTokens: string;
};

export type VideoTokenPricing = Record<string, JsonValue> & {
  no_video_input?: VideoTokenRate;
  noVideoInput?: VideoTokenRate;
  with_video_input?: VideoTokenRate;
  withVideoInput?: VideoTokenRate;
  notes?: string;
};

export type ServiceTierRate = Record<string, JsonValue> & {
  input?: string;
  output?: string;
  input_cache_read?: string;
  inputCacheRead?: string;
  input_cache_write?: string;
  inputCacheWrite?: string;
};

export type ServiceTierPricing = Record<string, JsonValue> & {
  priority?: ServiceTierRate;
  flex?: ServiceTierRate;
};

export type ModelPricing = Record<string, JsonValue> & {
  input?: string;
  output?: string;
  input_cache_read?: string;
  inputCacheRead?: string;
  input_cache_write?: string;
  inputCacheWrite?: string;
  web_search?: string;
  webSearch?: string;
  maps_search?: string;
  mapsSearch?: string;
  image?: string;
  image_dimension_quality_pricing?: ImagePricingVariant[];
  imageDimensionQualityPricing?: ImagePricingVariant[];
  video_duration_pricing?: VideoDurationPricing[];
  videoDurationPricing?: VideoDurationPricing[];
  video_token_pricing?: VideoTokenPricing;
  videoTokenPricing?: VideoTokenPricing;
  speech_input_character_cost?: string;
  speechInputCharacterCost?: string;
  transcription_duration_cost_per_second?: string;
  transcriptionDurationCostPerSecond?: string;
  service_tiers?: ServiceTierPricing;
  serviceTiers?: ServiceTierPricing;
  input_tiers?: PricingTier[];
  inputTiers?: PricingTier[];
  output_tiers?: PricingTier[];
  outputTiers?: PricingTier[];
  input_cache_read_tiers?: PricingTier[];
  inputCacheReadTiers?: PricingTier[];
  input_cache_write_tiers?: PricingTier[];
  inputCacheWriteTiers?: PricingTier[];
};

export type VideoCapabilities = Record<string, JsonValue> & {
  supported_operations?: string[];
  supportedOperations?: string[];
  supported_resolutions?: string[];
  supportedResolutions?: string[];
  supported_aspect_ratios?: string[];
  supportedAspectRatios?: string[];
  supported_durations_seconds?: number[];
  supportedDurationsSeconds?: number[];
  supported_fps?: number[];
  supportedFps?: number[];
  generate_audio?: boolean;
  generateAudio?: boolean;
  max_sample_count?: number;
  maxSampleCount?: number;
  input_limits?: Record<string, JsonValue>;
  inputLimits?: Record<string, JsonValue>;
};

export interface AIGatewayModel {
  id: string;
  object: "model";
  created: number;
  released?: number;
  ownedBy: string;
  name: string;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
  type?: string;
  tags: string[];
  pricing?: ModelPricing;
  videoCapabilities?: VideoCapabilities;
}

export interface ModelCatalog {
  object: "list";
  data: AIGatewayModel[];
}

export interface ModelArchitecture {
  tokenizer: string | null;
  instructType: string | null;
  modality: string;
  inputModalities: string[];
  outputModalities: string[];
}

export type EndpointPricing = Record<string, JsonValue> & {
  prompt?: string;
  completion?: string;
  request?: string;
  image?: string;
  image_output?: string;
  imageOutput?: string;
  web_search?: string;
  webSearch?: string;
  internal_reasoning?: string;
  internalReasoning?: string;
  input_cache_read?: string;
  inputCacheRead?: string;
  input_cache_write?: string;
  inputCacheWrite?: string;
  image_dimension_quality_pricing?: ImagePricingVariant[];
  imageDimensionQualityPricing?: ImagePricingVariant[];
  video_duration_pricing?: VideoDurationPricing[];
  videoDurationPricing?: VideoDurationPricing[];
  video_token_pricing?: VideoTokenPricing;
  videoTokenPricing?: VideoTokenPricing;
  speech_input_character_cost?: string;
  speechInputCharacterCost?: string;
  transcription_duration_cost_per_second?: string;
  transcriptionDurationCostPerSecond?: string;
  discount?: number;
};

export interface EndpointMetricPercentiles {
  p50: number;
  p95: number;
}

export interface ModelEndpoint {
  name: string;
  modelName: string;
  providerName: string;
  contextLength?: number;
  pricing: EndpointPricing;
  tags: string[];
  quantization?: string | null;
  maxCompletionTokens?: number | null;
  maxPromptTokens?: number | null;
  supportedParameters: string[];
  status: number;
  uptimeLast15Minutes?: number | null;
  uptimeLastHour?: number | null;
  uptimeLastDay?: number | null;
  latencyLastHour?: EndpointMetricPercentiles | null;
  throughputLastHour?: EndpointMetricPercentiles | null;
  supportsImplicitCaching?: boolean;
}

export interface ModelEndpointDetails {
  id: string;
  name: string;
  created: number;
  released?: number;
  description?: string;
  architecture: ModelArchitecture;
  endpoints: ModelEndpoint[];
  videoCapabilities?: VideoCapabilities;
}

export type LeaderboardDataset = "models" | "labs" | "providers";
export type LeaderboardModality = "all" | "text" | "image" | "video";
export type LeaderboardMetric = "tokens" | "requests" | "spend" | "imageCount" | "videoCount";
export type LeaderboardProviderRanking = "Token Volume" | "Spend";

interface LeaderboardExportBase {
  license: string;
  licenseUrl: string;
}

export interface DailyShareRow {
  date: string;
  group: "model" | "lab";
  name: string;
  metric: LeaderboardMetric;
  modality: LeaderboardModality;
  sharePercent: number;
}

export interface DailyShareLeaderboard extends LeaderboardExportBase {
  dataset: "models" | "labs";
  modality: LeaderboardModality;
  rows: DailyShareRow[];
}

export interface RankedProviderRow {
  rank: number;
  name: string;
  rankedBy: LeaderboardProviderRanking;
  url?: string;
  description?: string;
}

export interface ProviderLeaderboard extends LeaderboardExportBase {
  dataset: "providers";
  rows: RankedProviderRow[];
}

export type LeaderboardExport = DailyShareLeaderboard | ProviderLeaderboard;

export type ChatMessageRole = "system" | "developer" | "user" | "assistant" | "tool";

export interface ChatCompletionRequestMessage {
  role: ChatMessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionRequestMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string | string[];
  seed?: number;
  user?: string;
}

export interface ChatFunctionCall {
  name: string;
  arguments: string;
}

export interface ChatToolCall {
  id: string;
  type: "function";
  function: ChatFunctionCall;
}

export interface ChatCompletionMessage {
  role: "assistant";
  content: string | null;
  refusal?: string | null;
  toolCalls?: ChatToolCall[];
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finishReason: string | null;
  logprobs?: JsonValue | null;
}

export interface ChatTokenDetails {
  cachedTokens?: number;
  reasoningTokens?: number;
  audioTokens?: number;
  acceptedPredictionTokens?: number;
  rejectedPredictionTokens?: number;
}

export interface ChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptTokensDetails?: ChatTokenDetails;
  completionTokensDetails?: ChatTokenDetails;
}

export interface ChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
  systemFingerprint?: string | null;
  provider?: string;
  providerMetadata?: Record<string, JsonValue>;
  gatewayMetadata?: Record<string, JsonValue>;
}
