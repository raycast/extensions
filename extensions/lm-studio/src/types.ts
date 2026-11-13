export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** A JSON Schema accepted by LM Studio's OpenAI-compatible endpoint. */
export type JsonSchema = Record<string, unknown>;

export type ModelType = "llm" | "embedding";

export type ReasoningLevel = "off" | "low" | "medium" | "high" | "on";

export interface ModelQuantization {
  name: string | null;
  bitsPerWeight: number | null;
}

export interface ModelInstanceConfig {
  contextLength: number;
  evalBatchSize?: number;
  parallel?: number;
  flashAttention?: boolean;
  numExperts?: number;
  offloadKvCacheToGpu?: boolean;
}

export interface LoadedModelInstance {
  id: string;
  config: ModelInstanceConfig;
}

export interface ModelCapabilities {
  vision: boolean;
  trainedForToolUse: boolean;
  reasoning?: {
    allowedOptions: ReasoningLevel[];
    default: ReasoningLevel;
  };
}

/** Camel-cased representation of a native `GET /api/v1/models` model. */
export interface LMStudioModel {
  type: ModelType;
  publisher: string;
  key: string;
  displayName: string;
  architecture?: string | null;
  quantization: ModelQuantization | null;
  sizeBytes: number;
  paramsString: string | null;
  loadedInstances: LoadedModelInstance[];
  maxContextLength: number;
  format: "gguf" | "mlx" | null;
  capabilities?: ModelCapabilities;
  description?: string | null;
  variants?: string[];
  selectedVariant?: string;
}

export interface LoadModelRequest {
  model: string;
  contextLength?: number;
  evalBatchSize?: number;
  flashAttention?: boolean;
  numExperts?: number;
  offloadKvCacheToGpu?: boolean;
  echoLoadConfig?: boolean;
}

export interface LoadModelResult {
  type: ModelType;
  instanceId: string;
  loadTimeSeconds: number;
  status: "loaded";
  loadConfig?: ModelInstanceConfig;
}

export interface UnloadModelResult {
  instanceId: string;
}

export interface DownloadModelRequest {
  model: string;
  quantization?: string;
}

export type DownloadStatusValue = "downloading" | "paused" | "completed" | "failed" | "already_downloaded";

export interface DownloadStatus {
  jobId?: string;
  status: DownloadStatusValue;
  bytesPerSecond?: number;
  estimatedCompletion?: string;
  completedAt?: string;
  totalSizeBytes?: number;
  downloadedBytes?: number;
  startedAt?: string;
}

export interface ChatMessageInput {
  type: "message";
  content: string;
}

export interface ChatImageInput {
  type: "image";
  dataUrl: string;
}

export type ChatInput = string | Array<ChatMessageInput | ChatImageInput>;

export interface PluginIntegration {
  type: "plugin";
  id: string;
  /** Intentionally required so enabling a plugin never implicitly enables every tool. */
  allowedTools: string[];
}

export type ChatIntegration = PluginIntegration;

export type ToolProviderInfo = { type: "plugin"; pluginId: string } | { type: "ephemeral_mcp"; serverLabel: string };

export interface ChatMessageOutput {
  type: "message";
  content: string;
}

export interface ChatReasoningOutput {
  type: "reasoning";
  content: string;
}

export interface ChatToolCallOutput {
  type: "tool_call";
  tool: string;
  arguments: JsonObject;
  output: string;
  providerInfo: ToolProviderInfo;
}

export interface InvalidToolCallMetadata {
  type: "invalid_name" | "invalid_arguments";
  toolName: string;
}

export interface ChatInvalidToolCallOutput {
  type: "invalid_tool_call";
  reason: string;
  metadata: InvalidToolCallMetadata;
  arguments?: JsonObject;
  providerInfo?: ToolProviderInfo;
}

export type ChatOutput = ChatMessageOutput | ChatReasoningOutput | ChatToolCallOutput | ChatInvalidToolCallOutput;

export interface ChatStats {
  inputTokens: number;
  totalOutputTokens: number;
  reasoningOutputTokens: number;
  tokensPerSecond: number;
  timeToFirstTokenSeconds: number;
  modelLoadTimeSeconds?: number;
}

export interface ChatErrorInfo {
  type:
    | "invalid_request"
    | "unknown"
    | "mcp_connection_error"
    | "plugin_connection_error"
    | "not_implemented"
    | "model_not_found"
    | "job_not_found"
    | "internal_error"
    | (string & {});
  message: string;
  code?: string;
  param?: string;
}

/**
 * Aggregated native chat result. `text`, `reasoning`, and `toolCalls` are
 * derived conveniences; `output` preserves the ordered native output.
 */
export interface ChatResult {
  modelInstanceId: string;
  output: ChatOutput[];
  stats: ChatStats;
  responseId?: string;
  text: string;
  reasoning: string;
  toolCalls: ChatToolCallOutput[];
  errors: ChatErrorInfo[];
}

export interface ChatRequest {
  model: string;
  input: ChatInput;
  systemPrompt?: string;
  integrations?: ChatIntegration[];
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  repeatPenalty?: number;
  maxOutputTokens?: number;
  reasoning?: ReasoningLevel;
  contextLength?: number;
  store?: boolean;
  previousResponseId?: string;
  signal?: AbortSignal;
  onEvent?: (event: ChatEvent) => void | Promise<void>;
}

type EmptyChatEventType =
  | "prompt_processing.start"
  | "prompt_processing.end"
  | "reasoning.start"
  | "reasoning.end"
  | "message.start"
  | "message.end";

export type ChatEvent =
  | { type: "chat.start"; modelInstanceId: string }
  | { type: "model_load.start"; modelInstanceId: string }
  | { type: "model_load.progress"; modelInstanceId: string; progress: number }
  | {
      type: "model_load.end";
      modelInstanceId: string;
      loadTimeSeconds: number;
    }
  | { type: EmptyChatEventType }
  | { type: "prompt_processing.progress"; progress: number }
  | { type: "reasoning.delta"; content: string }
  | { type: "message.delta"; content: string }
  | {
      type: "tool_call.start";
      tool: string;
      providerInfo: ToolProviderInfo;
    }
  | {
      type: "tool_call.arguments";
      tool: string;
      arguments: JsonObject;
      providerInfo: ToolProviderInfo;
    }
  | {
      type: "tool_call.success";
      tool: string;
      arguments: JsonObject;
      output: string;
      providerInfo: ToolProviderInfo;
    }
  | {
      type: "tool_call.failure";
      reason: string;
      metadata: InvalidToolCallMetadata;
      arguments?: JsonObject;
      providerInfo?: ToolProviderInfo;
    }
  | { type: "error"; error: ChatErrorInfo }
  | { type: "chat.end"; result: ChatResult }
  | { type: "unknown"; event: string; data: JsonObject };

export interface StructuredOutputMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StructuredOutputRequest {
  model: string;
  messages: StructuredOutputMessage[];
  schema: JsonSchema;
  schemaName?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface EmbeddingsRequest {
  model: string;
  input: string | string[];
  signal?: AbortSignal;
}

export interface EmbeddingData {
  object: string;
  index: number;
  embedding: number[];
}

export interface EmbeddingsResult {
  object?: string;
  model?: string;
  data: EmbeddingData[];
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface GenerationSettings {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  reasoning?: ReasoningLevel;
  showReasoning: boolean;
  plugin?: PluginIntegration;
}

export interface ConversationAttachment {
  id: string;
  name: string;
  path: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
}

export type ConversationTurnStatus = "pending" | "completed" | "cancelled" | "error";

export interface ConversationTurn {
  id: string;
  parentId: string | null;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  attachments?: ConversationAttachment[];
  toolCalls?: ChatToolCallOutput[];
  stats?: ChatStats;
  responseId?: string;
  /** Stateful LM Studio response chain this turn belongs to. */
  chainVersion?: number;
  model?: string;
  status: ConversationTurnStatus;
  error?: string;
  createdAt: string;
}

/** Turns form a persistent tree; activeLeafId selects the visible branch. */
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  activeLeafId: string | null;
  /** Incremented when model or system prompt changes to reset server-side state. */
  chainVersion: number;
  settings: GenerationSettings;
  turns: ConversationTurn[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  turnCount: number;
  preview: string;
}
