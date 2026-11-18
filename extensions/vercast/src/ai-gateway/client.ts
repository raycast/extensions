import {
  AIGatewayError,
  createHttpError,
  createMalformedResponseError,
  createNetworkError,
  readApiErrorHint,
  type AIGatewayOperation,
} from "./errors";
import {
  parseChatCompletion,
  parseLeaderboardExport,
  parseModelCatalog,
  parseModelEndpointDetails,
  ResponseParseError,
} from "./parsers";
import type {
  ChatCompletion,
  ChatCompletionRequest,
  JsonValue,
  LeaderboardDataset,
  LeaderboardExport,
  LeaderboardModality,
  ModelCatalog,
  ModelEndpointDetails,
} from "./types";
import { getChatCompletionsUrl, getLeaderboardUrl, getModelCatalogUrl, getModelEndpointsUrl } from "./urls";

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface ChatCompletionOptions extends RequestOptions {
  apiKey: string;
}

async function fetchResponse(url: string, init: RequestInit, operation: AIGatewayOperation): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw createNetworkError(operation, error);
  }
}

async function readUnknownJson(response: Response, operation: AIGatewayOperation): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    throw createMalformedResponseError(operation, "the body is not valid JSON", error);
  }
}

async function readErrorHint(response: Response): Promise<ReturnType<typeof readApiErrorHint>> {
  try {
    const text = await response.text();
    if (!text) {
      return {};
    }
    const value: unknown = JSON.parse(text);
    return readApiErrorHint(value);
  } catch {
    return {};
  }
}

async function requireSuccessfulJson(response: Response, operation: AIGatewayOperation): Promise<unknown> {
  if (!response.ok) {
    throw createHttpError(response.status, operation, await readErrorHint(response));
  }
  return readUnknownJson(response, operation);
}

function parseResponse<T>(operation: AIGatewayOperation, value: unknown, parser: (input: unknown) => T): T {
  try {
    return parser(value);
  } catch (error) {
    if (error instanceof ResponseParseError) {
      throw createMalformedResponseError(operation, error.message, error);
    }
    throw error;
  }
}

export async function fetchModelCatalog(options: RequestOptions = {}): Promise<ModelCatalog> {
  const operation = "catalog";
  const response = await fetchResponse(
    getModelCatalogUrl(),
    { method: "GET", headers: { Accept: "application/json" }, signal: options.signal },
    operation,
  );
  return parseResponse(operation, await requireSuccessfulJson(response, operation), parseModelCatalog);
}

export async function fetchModelEndpoints(
  modelId: string,
  options: RequestOptions = {},
): Promise<ModelEndpointDetails> {
  const operation = "model_endpoints";
  if (modelId.trim().length === 0) {
    throw new AIGatewayError({
      kind: "unsupported_model",
      operation,
      message: "A model ID is required.",
    });
  }
  const response = await fetchResponse(
    getModelEndpointsUrl(modelId),
    { method: "GET", headers: { Accept: "application/json" }, signal: options.signal },
    operation,
  );
  return parseResponse(operation, await requireSuccessfulJson(response, operation), parseModelEndpointDetails);
}

export async function fetchLeaderboard(
  dataset: LeaderboardDataset,
  modality?: LeaderboardModality,
  options: RequestOptions = {},
): Promise<LeaderboardExport> {
  const operation = "leaderboard";
  const response = await fetchResponse(
    getLeaderboardUrl(dataset, modality),
    { method: "GET", headers: { Accept: "application/json" }, signal: options.signal },
    operation,
  );
  const parsed = parseResponse(operation, await requireSuccessfulJson(response, operation), parseLeaderboardExport);
  if (parsed.dataset !== dataset) {
    throw createMalformedResponseError(operation, `response.dataset does not match requested dataset "${dataset}"`);
  }
  return parsed;
}

function chatRequestBody(request: ChatCompletionRequest): Record<string, JsonValue> {
  const body: Record<string, JsonValue> = {
    model: request.model,
    stream: false,
    messages: request.messages.map((message) => {
      const item: Record<string, JsonValue> = {
        role: message.role,
        content: message.content,
      };
      if (message.name !== undefined) item.name = message.name;
      if (message.toolCallId !== undefined) item.tool_call_id = message.toolCallId;
      return item;
    }),
  };
  if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.topP !== undefined) body.top_p = request.topP;
  if (request.stop !== undefined) body.stop = request.stop;
  if (request.seed !== undefined) body.seed = request.seed;
  if (request.user !== undefined) body.user = request.user;
  return body;
}

export async function createChatCompletion(
  request: ChatCompletionRequest,
  options: ChatCompletionOptions,
): Promise<ChatCompletion> {
  const operation = "chat_completion";
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new AIGatewayError({
      kind: "authentication",
      operation,
      message: "An AI Gateway API key is required.",
    });
  }
  if (!request.model.trim()) {
    throw new AIGatewayError({
      kind: "unsupported_model",
      operation,
      message: "A model ID is required.",
    });
  }
  if (request.messages.length === 0) {
    throw new AIGatewayError({
      kind: "invalid_request",
      operation,
      message: "At least one chat message is required.",
    });
  }

  const response = await fetchResponse(
    getChatCompletionsUrl(),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chatRequestBody(request)),
      signal: options.signal,
    },
    operation,
  );
  return parseResponse(operation, await requireSuccessfulJson(response, operation), parseChatCompletion);
}
