import type {
  ChatErrorInfo,
  ChatEvent,
  ChatInput,
  ChatIntegration,
  ChatInvalidToolCallOutput,
  ChatOutput,
  ChatRequest,
  ChatResult,
  ChatStats,
  ChatToolCallOutput,
  DownloadModelRequest,
  DownloadStatus,
  EmbeddingsRequest,
  EmbeddingsResult,
  JsonObject,
  JsonValue,
  LMStudioModel,
  LoadModelRequest,
  LoadModelResult,
  ModelCapabilities,
  ModelInstanceConfig,
  ModelQuantization,
  ModelType,
  ReasoningLevel,
  StructuredOutputRequest,
  ToolProviderInfo,
  UnloadModelResult,
} from "../types";

export interface LMStudioClientOptions {
  baseUrl: string;
  apiToken?: string;
  /** Primarily useful for deterministic tests. */
  fetch?: typeof globalThis.fetch;
}

export interface WaitForDownloadOptions {
  signal?: AbortSignal;
  intervalMs?: number;
  onProgress?: (status: DownloadStatus) => void | Promise<void>;
}

export interface RawServerSentEvent {
  event: string;
  data: string;
  id?: string;
}

interface NativeModelInstanceConfig {
  context_length: number;
  eval_batch_size?: number;
  parallel?: number;
  flash_attention?: boolean;
  num_experts?: number;
  offload_kv_cache_to_gpu?: boolean;
}

interface NativeModel {
  type: ModelType;
  publisher: string;
  key: string;
  display_name: string;
  architecture?: string | null;
  quantization: { name: string | null; bits_per_weight: number | null } | null;
  size_bytes: number;
  params_string: string | null;
  loaded_instances: Array<{
    id: string;
    config: NativeModelInstanceConfig;
  }>;
  max_context_length: number;
  format: "gguf" | "mlx" | null;
  capabilities?: {
    vision: boolean;
    trained_for_tool_use: boolean;
    reasoning?: {
      allowed_options: ReasoningLevel[];
      default: ReasoningLevel;
    };
  };
  description?: string | null;
  variants?: string[];
  selected_variant?: string;
}

interface NativeProviderInfo {
  type: "plugin" | "ephemeral_mcp";
  plugin_id?: string;
  server_label?: string;
}

interface NativeChatStats {
  input_tokens: number;
  total_output_tokens: number;
  reasoning_output_tokens: number;
  tokens_per_second: number;
  time_to_first_token_seconds: number;
  model_load_time_seconds?: number;
}

interface NativeChatResult {
  model_instance_id: string;
  output: Array<Record<string, unknown>>;
  stats: NativeChatStats;
  response_id?: string;
}

interface NativeErrorBody {
  error?: {
    type?: string;
    message?: string;
    code?: string;
    param?: string;
  };
  message?: string;
}

export class LMStudioError extends Error {
  readonly status?: number;
  readonly type?: string;
  readonly code?: string;
  readonly param?: string;

  constructor(
    message: string,
    details: {
      status?: number;
      type?: string;
      code?: string;
      param?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "LMStudioError";
    this.status = details.status;
    this.type = details.type;
    this.code = details.code;
    this.param = details.param;
  }
}

export class LMStudioProtocolError extends LMStudioError {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "LMStudioProtocolError";
  }
}

/**
 * Incremental SSE frame parser. It deliberately does not parse JSON so it can
 * also be used to diagnose a malformed server response.
 */
export class ServerSentEventParser {
  private buffer = "";

  push(chunk: string): RawServerSentEvent[] {
    this.buffer += chunk;
    const events: RawServerSentEvent[] = [];

    while (true) {
      const boundary = this.buffer.search(/\r?\n\r?\n/);
      if (boundary < 0) break;

      const separator = this.buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0];
      if (!separator) break;

      const frame = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + separator.length);
      const event = parseSseFrame(frame);
      if (event) events.push(event);
    }

    return events;
  }

  finish(): RawServerSentEvent[] {
    const frame = this.buffer;
    this.buffer = "";
    const event = parseSseFrame(frame);
    return event ? [event] : [];
  }
}

function parseSseFrame(frame: string): RawServerSentEvent | undefined {
  if (!frame.trim()) return undefined;

  let event = "message";
  let id: string | undefined;
  const data: string[] = [];

  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    let value = separator < 0 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    else if (field === "id") id = value;
  }

  if (data.length === 0) return undefined;
  return { event, data: data.join("\n"), ...(id === undefined ? {} : { id }) };
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new LMStudioError("LM Studio server URL is required.");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch (error) {
    throw new LMStudioError("LM Studio server URL is not valid.", {
      cause: error,
    });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new LMStudioError("LM Studio server URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new LMStudioError("Put credentials in the API token preference, not in the server URL.");
  }
  if (url.search || url.hash) {
    throw new LMStudioError("LM Studio server URL cannot contain a query or fragment.");
  }

  url.pathname = url.pathname.replace(/\/(?:api\/v1|v1)\/?$/i, "").replace(/\/+$/, "");
  return url.toString().replace(/\/+$/, "");
}

export function filterModelsByType(models: LMStudioModel[], type: ModelType): LMStudioModel[] {
  return models.filter((model) => model.type === type);
}

export function modelSupportsVision(model: LMStudioModel): boolean {
  return model.type === "llm" && model.capabilities?.vision === true;
}

export function modelSupportsTools(model: LMStudioModel): boolean {
  return model.type === "llm" && model.capabilities?.trainedForToolUse === true;
}

export function modelSupportsReasoning(model: LMStudioModel, reasoning: ReasoningLevel): boolean {
  return model.capabilities?.reasoning?.allowedOptions.includes(reasoning) === true;
}

export class LMStudioClient {
  readonly baseUrl: string;
  private readonly apiToken?: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: LMStudioClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.apiToken = options.apiToken?.trim() || undefined;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new LMStudioError("This environment does not provide fetch.");
    }
  }

  async listModels(signal?: AbortSignal): Promise<LMStudioModel[]> {
    const result = await this.requestJson<{ models?: NativeModel[] }>("/api/v1/models", { signal });
    if (!Array.isArray(result.models)) {
      throw new LMStudioProtocolError("LM Studio returned an invalid model list.");
    }

    return result.models.map(fromNativeModel).sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  async listChatModels(signal?: AbortSignal): Promise<LMStudioModel[]> {
    return filterModelsByType(await this.listModels(signal), "llm");
  }

  async listEmbeddingModels(signal?: AbortSignal): Promise<LMStudioModel[]> {
    return filterModelsByType(await this.listModels(signal), "embedding");
  }

  async loadModel(request: LoadModelRequest, signal?: AbortSignal): Promise<LoadModelResult> {
    requireNonEmpty(request.model, "Model identifier");
    const result = await this.requestJson<{
      type: ModelType;
      instance_id: string;
      load_time_seconds: number;
      status: "loaded";
      load_config?: NativeModelInstanceConfig;
    }>("/api/v1/models/load", {
      method: "POST",
      signal,
      body: JSON.stringify({
        model: request.model,
        context_length: request.contextLength,
        eval_batch_size: request.evalBatchSize,
        flash_attention: request.flashAttention,
        num_experts: request.numExperts,
        offload_kv_cache_to_gpu: request.offloadKvCacheToGpu,
        echo_load_config: request.echoLoadConfig,
      }),
    });

    return {
      type: result.type,
      instanceId: result.instance_id,
      loadTimeSeconds: result.load_time_seconds,
      status: result.status,
      ...(result.load_config ? { loadConfig: fromNativeInstanceConfig(result.load_config) } : {}),
    };
  }

  async unloadModel(instanceId: string, signal?: AbortSignal): Promise<UnloadModelResult> {
    requireNonEmpty(instanceId, "Model instance identifier");
    const result = await this.requestJson<{ instance_id: string }>("/api/v1/models/unload", {
      method: "POST",
      signal,
      body: JSON.stringify({ instance_id: instanceId }),
    });
    return { instanceId: result.instance_id };
  }

  async downloadModel(request: DownloadModelRequest, signal?: AbortSignal): Promise<DownloadStatus> {
    requireNonEmpty(request.model, "Model identifier or Hugging Face URL");
    const result = await this.requestJson<Record<string, unknown>>("/api/v1/models/download", {
      method: "POST",
      signal,
      body: JSON.stringify({
        model: request.model,
        quantization: request.quantization,
      }),
    });
    return fromNativeDownloadStatus(result);
  }

  async getDownloadStatus(jobId: string, signal?: AbortSignal): Promise<DownloadStatus> {
    requireNonEmpty(jobId, "Download job identifier");
    const result = await this.requestJson<Record<string, unknown>>(
      `/api/v1/models/download/status/${encodeURIComponent(jobId)}`,
      { signal },
    );
    return fromNativeDownloadStatus(result);
  }

  async waitForDownload(jobId: string, options: WaitForDownloadOptions = {}): Promise<DownloadStatus> {
    const intervalMs = options.intervalMs ?? 1_000;
    if (!Number.isFinite(intervalMs) || intervalMs < 100) {
      throw new LMStudioError("Download polling interval must be at least 100 ms.");
    }

    while (true) {
      const status = await this.getDownloadStatus(jobId, options.signal);
      await options.onProgress?.(status);
      if (status.status !== "downloading") return status;
      await abortableDelay(intervalMs, options.signal);
    }
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    validateChatRequest(request);
    const response = await this.fetchImpl(`${this.baseUrl}/api/v1/chat`, {
      method: "POST",
      headers: this.headers({ Accept: "text/event-stream" }),
      signal: request.signal,
      body: JSON.stringify({
        model: request.model,
        input: toNativeChatInput(request.input),
        system_prompt: request.systemPrompt,
        integrations: request.integrations?.map(toNativeIntegration),
        stream: true,
        temperature: request.temperature,
        top_p: request.topP,
        top_k: request.topK,
        min_p: request.minP,
        repeat_penalty: request.repeatPenalty,
        max_output_tokens: request.maxOutputTokens,
        reasoning: request.reasoning,
        context_length: request.contextLength,
        store: request.store,
        previous_response_id: request.previousResponseId,
      }),
    });

    if (!response.ok) throw await errorFromResponse(response);
    if (!response.body) {
      throw new LMStudioProtocolError("LM Studio returned an empty chat stream.");
    }

    const parser = new ServerSentEventParser();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    const errors: ChatErrorInfo[] = [];
    let finalResult: ChatResult | undefined;

    const consume = async (rawEvents: RawServerSentEvent[]) => {
      for (const rawEvent of rawEvents) {
        const event = parseChatEvent(rawEvent, errors);
        if (event.type === "error") errors.push(event.error);
        if (event.type === "chat.end") finalResult = event.result;
        await request.onEvent?.(event);
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await consume(parser.push(decoder.decode(value, { stream: true })));
      }
      await consume(parser.push(decoder.decode()));
      await consume(parser.finish());
    } catch (error) {
      try {
        await reader.cancel(error);
      } catch {
        // Preserve the original stream or callback error.
      }
      throw error;
    } finally {
      reader.releaseLock();
    }

    if (finalResult) return finalResult;
    const lastError = errors.at(-1);
    if (lastError) {
      throw new LMStudioError(lastError.message, {
        type: lastError.type,
        code: lastError.code,
        param: lastError.param,
      });
    }
    throw new LMStudioProtocolError("LM Studio ended the stream before sending the required chat.end event.");
  }

  async structuredOutput<T = JsonValue>(request: StructuredOutputRequest): Promise<T> {
    requireNonEmpty(request.model, "Model identifier");
    if (!request.schema || typeof request.schema !== "object" || Array.isArray(request.schema)) {
      throw new LMStudioError("A JSON Schema object is required.");
    }
    if (request.messages.length === 0) {
      throw new LMStudioError("At least one structured-output message is required.");
    }
    if (request.maxTokens !== undefined && (!Number.isInteger(request.maxTokens) || request.maxTokens < 1)) {
      throw new LMStudioError("Maximum output tokens must be a positive integer.");
    }

    const response = await this.requestJson<{
      choices?: Array<{
        message?: { content?: string; reasoning_content?: string };
      }>;
    }>("/v1/chat/completions", {
      method: "POST",
      signal: request.signal,
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: normalizedSchemaName(request.schemaName),
            strict: true,
            schema: request.schema,
          },
        },
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: false,
      }),
    });

    const message = response.choices?.[0]?.message;
    // Some reasoning models served by LM Studio currently place constrained
    // JSON in reasoning_content and return an empty content string.
    const content = message?.content?.trim() ? message.content : message?.reasoning_content;
    if (typeof content !== "string" || !content.trim()) {
      throw new LMStudioProtocolError("LM Studio returned no structured response content.");
    }
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new LMStudioProtocolError("LM Studio returned structured output that is not valid JSON.", error);
    }
  }

  async embeddings(request: EmbeddingsRequest): Promise<EmbeddingsResult> {
    requireNonEmpty(request.model, "Embedding model identifier");
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    if (inputs.length === 0 || inputs.some((input) => !input.trim())) {
      throw new LMStudioError("Embedding input cannot be empty.");
    }
    const result = await this.requestJson<{
      object?: string;
      model?: string;
      data?: Array<{ object?: string; index?: number; embedding?: number[] }>;
      usage?: { prompt_tokens?: number; total_tokens?: number };
    }>("/v1/embeddings", {
      method: "POST",
      signal: request.signal,
      body: JSON.stringify({ model: request.model, input: request.input }),
    });

    if (!Array.isArray(result.data)) {
      throw new LMStudioProtocolError("LM Studio returned invalid embedding data.");
    }
    const data = result.data.map((item, position) => {
      if (!Array.isArray(item.embedding)) {
        throw new LMStudioProtocolError("LM Studio returned an invalid embedding vector.");
      }
      return {
        object: item.object ?? "embedding",
        index: item.index ?? position,
        embedding: item.embedding,
      };
    });
    data.sort((left, right) => left.index - right.index);

    return {
      ...(result.object ? { object: result.object } : {}),
      ...(result.model ? { model: result.model } : {}),
      data,
      ...(result.usage
        ? {
            usage: {
              promptTokens: result.usage.prompt_tokens ?? 0,
              totalTokens: result.usage.total_tokens ?? 0,
            },
          }
        : {}),
    };
  }

  private headers(additional: Record<string, string> = {}): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
      ...additional,
    };
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: this.headers((init.headers as Record<string, string> | undefined) ?? {}),
    });
    if (!response.ok) throw await errorFromResponse(response);
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new LMStudioProtocolError("LM Studio returned invalid JSON.", error);
    }
  }
}

export function parseChatEvent(rawEvent: RawServerSentEvent, priorErrors: ChatErrorInfo[] = []): ChatEvent {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawEvent.data) as Record<string, unknown>;
  } catch (error) {
    throw new LMStudioProtocolError(`LM Studio sent invalid JSON for the ${rawEvent.event} event.`, error);
  }

  const type = typeof data.type === "string" ? data.type : rawEvent.event;
  switch (type) {
    case "chat.start":
    case "model_load.start":
      return {
        type,
        modelInstanceId: stringField(data, "model_instance_id", type),
      };
    case "model_load.progress":
      return {
        type,
        modelInstanceId: stringField(data, "model_instance_id", type),
        progress: numberField(data, "progress", type),
      };
    case "model_load.end":
      return {
        type,
        modelInstanceId: stringField(data, "model_instance_id", type),
        loadTimeSeconds: numberField(data, "load_time_seconds", type),
      };
    case "prompt_processing.start":
    case "prompt_processing.end":
    case "reasoning.start":
    case "reasoning.end":
    case "message.start":
    case "message.end":
      return { type };
    case "prompt_processing.progress":
      return { type, progress: numberField(data, "progress", type) };
    case "reasoning.delta":
    case "message.delta":
      return { type, content: stringField(data, "content", type) };
    case "tool_call.start":
      return {
        type,
        tool: stringField(data, "tool", type),
        providerInfo: fromNativeProvider(data.provider_info, type),
      };
    case "tool_call.arguments":
      return {
        type,
        tool: stringField(data, "tool", type),
        arguments: objectField(data, "arguments", type),
        providerInfo: fromNativeProvider(data.provider_info, type),
      };
    case "tool_call.success":
      return {
        type,
        tool: stringField(data, "tool", type),
        arguments: objectField(data, "arguments", type),
        output: stringField(data, "output", type),
        providerInfo: fromNativeProvider(data.provider_info, type),
      };
    case "tool_call.failure":
      return {
        type,
        reason: stringField(data, "reason", type),
        metadata: fromNativeInvalidMetadata(data.metadata, type),
        ...(isObject(data.arguments) ? { arguments: data.arguments as unknown as JsonObject } : {}),
        ...(isObject(data.provider_info) ? { providerInfo: fromNativeProvider(data.provider_info, type) } : {}),
      };
    case "error":
      return { type, error: fromNativeError(data.error) };
    case "chat.end": {
      if (!isObject(data.result)) {
        throw new LMStudioProtocolError("LM Studio sent an invalid chat.end result.");
      }
      return {
        type,
        result: fromNativeChatResult(data.result as unknown as NativeChatResult, priorErrors),
      };
    }
    default:
      return { type: "unknown", event: type, data: data as JsonObject };
  }
}

function validateChatRequest(request: ChatRequest): void {
  requireNonEmpty(request.model, "Model identifier");
  if (typeof request.input === "string") {
    requireNonEmpty(request.input, "Chat input");
  } else if (request.input.length === 0) {
    throw new LMStudioError("Chat input cannot be empty.");
  } else {
    for (const item of request.input) {
      if (item.type === "message") {
        requireNonEmpty(item.content, "Message input");
      } else if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(item.dataUrl)) {
        throw new LMStudioError("Image input must be a base64 JPEG, PNG, or WebP data URL.");
      }
    }
  }
  if (request.previousResponseId && !request.previousResponseId.startsWith("resp_")) {
    throw new LMStudioError("Previous response identifier must start with resp_.");
  }
  if (
    request.temperature !== undefined &&
    (!Number.isFinite(request.temperature) || request.temperature < 0 || request.temperature > 1)
  ) {
    throw new LMStudioError("Temperature must be between 0 and 1.");
  }
  if (
    request.maxOutputTokens !== undefined &&
    (!Number.isInteger(request.maxOutputTokens) || request.maxOutputTokens < 1)
  ) {
    throw new LMStudioError("Maximum output tokens must be a positive integer.");
  }
  for (const integration of request.integrations ?? []) {
    requireNonEmpty(integration.id, "Plugin identifier");
    if (integration.allowedTools.length === 0 || integration.allowedTools.some((tool) => !tool.trim())) {
      throw new LMStudioError(`Plugin ${integration.id} must explicitly allow valid tool names.`);
    }
  }
}

function toNativeChatInput(
  input: ChatInput,
): string | Array<{ type: "image"; data_url: string } | { type: "text"; content: string }> {
  if (typeof input === "string") return input;
  return input.map((item) =>
    item.type === "image" ? { type: "image", data_url: item.dataUrl } : { type: "text", content: item.content },
  );
}

function toNativeIntegration(integration: ChatIntegration): Record<string, unknown> {
  return {
    type: integration.type,
    id: integration.id,
    allowed_tools: integration.allowedTools,
  };
}

function fromNativeModel(model: NativeModel): LMStudioModel {
  const capabilities: ModelCapabilities | undefined = model.capabilities
    ? {
        vision: model.capabilities.vision,
        trainedForToolUse: model.capabilities.trained_for_tool_use,
        ...(model.capabilities.reasoning
          ? {
              reasoning: {
                allowedOptions: model.capabilities.reasoning.allowed_options,
                default: model.capabilities.reasoning.default,
              },
            }
          : {}),
      }
    : undefined;
  const quantization: ModelQuantization | null = model.quantization
    ? {
        name: model.quantization.name,
        bitsPerWeight: model.quantization.bits_per_weight,
      }
    : null;

  return {
    type: model.type,
    publisher: model.publisher,
    key: model.key,
    displayName: model.display_name,
    ...(model.architecture === undefined ? {} : { architecture: model.architecture }),
    quantization,
    sizeBytes: model.size_bytes,
    paramsString: model.params_string,
    loadedInstances: (model.loaded_instances ?? []).map((instance) => ({
      id: instance.id,
      config: fromNativeInstanceConfig(instance.config),
    })),
    maxContextLength: model.max_context_length,
    format: model.format,
    ...(capabilities ? { capabilities } : {}),
    ...(model.description === undefined ? {} : { description: model.description }),
    ...(model.variants === undefined ? {} : { variants: model.variants }),
    ...(model.selected_variant === undefined ? {} : { selectedVariant: model.selected_variant }),
  };
}

function fromNativeInstanceConfig(config: NativeModelInstanceConfig): ModelInstanceConfig {
  return {
    contextLength: config.context_length,
    ...(config.eval_batch_size === undefined ? {} : { evalBatchSize: config.eval_batch_size }),
    ...(config.parallel === undefined ? {} : { parallel: config.parallel }),
    ...(config.flash_attention === undefined ? {} : { flashAttention: config.flash_attention }),
    ...(config.num_experts === undefined ? {} : { numExperts: config.num_experts }),
    ...(config.offload_kv_cache_to_gpu === undefined ? {} : { offloadKvCacheToGpu: config.offload_kv_cache_to_gpu }),
  };
}

function fromNativeDownloadStatus(status: Record<string, unknown>): DownloadStatus {
  if (typeof status.status !== "string") {
    throw new LMStudioProtocolError("LM Studio returned an invalid download status.");
  }
  const allowedStatuses = ["downloading", "paused", "completed", "failed", "already_downloaded"] as const;
  if (!allowedStatuses.includes(status.status as (typeof allowedStatuses)[number])) {
    throw new LMStudioProtocolError(`LM Studio returned an unknown download status: ${status.status}.`);
  }
  return {
    ...(typeof status.job_id === "string" ? { jobId: status.job_id } : {}),
    status: status.status as DownloadStatus["status"],
    ...(typeof status.bytes_per_second === "number" ? { bytesPerSecond: status.bytes_per_second } : {}),
    ...(typeof status.estimated_completion === "string" ? { estimatedCompletion: status.estimated_completion } : {}),
    ...(typeof status.completed_at === "string" ? { completedAt: status.completed_at } : {}),
    ...(typeof status.total_size_bytes === "number" ? { totalSizeBytes: status.total_size_bytes } : {}),
    ...(typeof status.downloaded_bytes === "number" ? { downloadedBytes: status.downloaded_bytes } : {}),
    ...(typeof status.started_at === "string" ? { startedAt: status.started_at } : {}),
  };
}

function fromNativeChatResult(result: NativeChatResult, errors: ChatErrorInfo[]): ChatResult {
  if (typeof result.model_instance_id !== "string" || !Array.isArray(result.output) || !isObject(result.stats)) {
    throw new LMStudioProtocolError("LM Studio returned an invalid aggregated chat result.");
  }
  const output = result.output.map((item) => {
    if (!isObject(item)) {
      throw new LMStudioProtocolError("LM Studio returned an invalid chat output.");
    }
    return fromNativeChatOutput(item);
  });
  const stats = fromNativeChatStats(result.stats);
  return {
    modelInstanceId: result.model_instance_id,
    output,
    stats,
    ...(result.response_id ? { responseId: result.response_id } : {}),
    text: output
      .filter((item): item is Extract<ChatOutput, { type: "message" }> => item.type === "message")
      .map((item) => item.content)
      .join(""),
    reasoning: output
      .filter((item): item is Extract<ChatOutput, { type: "reasoning" }> => item.type === "reasoning")
      .map((item) => item.content)
      .join(""),
    toolCalls: output.filter((item): item is ChatToolCallOutput => item.type === "tool_call"),
    errors: [...errors],
  };
}

function fromNativeChatOutput(item: Record<string, unknown>): ChatOutput {
  if (item.type === "message" || item.type === "reasoning") {
    return {
      type: item.type,
      content: stringField(item, "content", `${item.type} output`),
    };
  }
  if (item.type === "tool_call") {
    return {
      type: "tool_call",
      tool: stringField(item, "tool", "tool_call output"),
      arguments: objectField(item, "arguments", "tool_call output"),
      output: stringField(item, "output", "tool_call output"),
      providerInfo: fromNativeProvider(item.provider_info, "tool_call output"),
    };
  }
  if (item.type === "invalid_tool_call") {
    const output: ChatInvalidToolCallOutput = {
      type: "invalid_tool_call",
      reason: stringField(item, "reason", "invalid_tool_call output"),
      metadata: fromNativeInvalidMetadata(item.metadata, "invalid_tool_call output"),
    };
    if (isObject(item.arguments)) output.arguments = item.arguments as JsonObject;
    if (isObject(item.provider_info)) {
      output.providerInfo = fromNativeProvider(item.provider_info, "invalid_tool_call output");
    }
    return output;
  }
  throw new LMStudioProtocolError(`LM Studio returned an unknown chat output type: ${String(item.type)}.`);
}

function fromNativeChatStats(stats: NativeChatStats): ChatStats {
  const raw = stats as unknown as Record<string, unknown>;
  return {
    inputTokens: numberField(raw, "input_tokens", "chat stats"),
    totalOutputTokens: numberField(raw, "total_output_tokens", "chat stats"),
    reasoningOutputTokens: numberField(raw, "reasoning_output_tokens", "chat stats"),
    tokensPerSecond: numberField(raw, "tokens_per_second", "chat stats"),
    timeToFirstTokenSeconds: numberField(raw, "time_to_first_token_seconds", "chat stats"),
    ...(stats.model_load_time_seconds === undefined
      ? {}
      : {
          modelLoadTimeSeconds: numberField(raw, "model_load_time_seconds", "chat stats"),
        }),
  };
}

function fromNativeProvider(value: unknown, context: string): ToolProviderInfo {
  if (!isObject(value)) {
    throw new LMStudioProtocolError(`LM Studio sent invalid provider info in ${context}.`);
  }
  const provider = value as unknown as NativeProviderInfo;
  if (provider.type === "plugin" && typeof provider.plugin_id === "string") {
    return { type: "plugin", pluginId: provider.plugin_id };
  }
  if (provider.type === "ephemeral_mcp" && typeof provider.server_label === "string") {
    return { type: "ephemeral_mcp", serverLabel: provider.server_label };
  }
  throw new LMStudioProtocolError(`LM Studio sent unknown provider info in ${context}.`);
}

function fromNativeInvalidMetadata(value: unknown, context: string): ChatInvalidToolCallOutput["metadata"] {
  if (!isObject(value)) {
    throw new LMStudioProtocolError(`LM Studio sent invalid tool metadata in ${context}.`);
  }
  if (value.type !== "invalid_name" && value.type !== "invalid_arguments") {
    throw new LMStudioProtocolError(`LM Studio sent unknown tool metadata in ${context}.`);
  }
  return {
    type: value.type,
    toolName: stringField(value, "tool_name", context),
  };
}

function fromNativeError(value: unknown): ChatErrorInfo {
  if (!isObject(value) || typeof value.message !== "string") {
    throw new LMStudioProtocolError("LM Studio sent an invalid error event.");
  }
  return {
    type: typeof value.type === "string" ? value.type : "unknown",
    message: value.message,
    ...(typeof value.code === "string" ? { code: value.code } : {}),
    ...(typeof value.param === "string" ? { param: value.param } : {}),
  };
}

async function errorFromResponse(response: Response): Promise<LMStudioError> {
  const fallback = `LM Studio returned ${response.status} ${response.statusText}.`;
  let body: NativeErrorBody | undefined;
  try {
    body = (await response.json()) as NativeErrorBody;
  } catch {
    return new LMStudioError(fallback, { status: response.status });
  }
  return new LMStudioError(body.error?.message || body.message || fallback, {
    status: response.status,
    type: body.error?.type,
    code: body.error?.code,
    param: body.error?.param,
  });
}

function normalizedSchemaName(name?: string): string {
  const normalized = (name?.trim() || "structured_response").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return normalized || "structured_response";
}

function requireNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new LMStudioError(`${label} is required.`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(data: Record<string, unknown>, field: string, context: string): string {
  const value = data[field];
  if (typeof value !== "string") {
    throw new LMStudioProtocolError(`LM Studio sent an invalid ${field} field in ${context}.`);
  }
  return value;
}

function numberField(data: Record<string, unknown>, field: string, context: string): number {
  const value = data[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new LMStudioProtocolError(`LM Studio sent an invalid ${field} field in ${context}.`);
  }
  return value;
}

function objectField(data: Record<string, unknown>, field: string, context: string): JsonObject {
  const value = data[field];
  if (!isObject(value)) {
    throw new LMStudioProtocolError(`LM Studio sent an invalid ${field} field in ${context}.`);
  }
  return value as JsonObject;
}

function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException("The operation was aborted.", "AbortError"));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
