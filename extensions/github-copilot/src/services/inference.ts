import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AI, Color, LocalStorage } from "@raycast/api";
import { jsonSchema, streamText, tool, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import { createHash } from "node:crypto";
import { authorizeModelProvider } from "../lib/oauth";

// Without this version header, Copilot ignores `Copilot-Session-Token` and rejects Auto models.
const API_VERSION = "2026-06-01";
const DEFAULT_API_URL = "https://api.githubcopilot.com";
const INTEGRATION_ID = "copilot-raycast";
const SESSION_REFRESH_MARGIN_MS = 5 * 60 * 1000;

// Keep cached account data separate without persisting the access token itself.
const cacheKey = (name: string, token: string): string =>
  `inference-v2-${name}-${createHash("sha256").update(token).digest("hex")}`;

export const AUTO_MODEL_ID = "auto";

const VISION_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type VisionMediaType = (typeof VISION_MEDIA_TYPES)[number];

type Endpoint = "messages" | "responses" | "chat";

interface CopilotModel {
  id: string;
  name: string;
  vendor?: string;
  model_picker_enabled?: boolean;
  supported_endpoints?: string[] | null;
  policy?: { state?: string };
  capabilities: {
    type?: string;
    limits?: {
      max_context_window_tokens?: number;
      max_output_tokens?: number;
      vision?: { supported_media_types?: string[] };
    };
    supports?: {
      adaptive_thinking?: boolean;
      reasoning_effort?: string[];
      streaming?: boolean;
      tool_calls?: boolean;
      vision?: boolean;
    };
  };
}

interface AutoSession {
  session_token: string;
  /** UNIX seconds. */
  expires_at: number;
  available_models: string[];
  selected_model: string;
}

class CopilotApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const toCopilotError = async (response: Response): Promise<CopilotApiError> => {
  // Error bodies are JSON for most failures, but 401s come back as plain text.
  const body = await response.text().catch(() => "");
  let message = body.trim();
  let code: string | undefined;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: string } };
    message = parsed.error?.message ?? message;
    code = parsed.error?.code;
  } catch {
    // Keep the plain text body
  }

  if (response.status === 401) {
    return new CopilotApiError(
      "Your GitHub session has expired. Open any GitHub Copilot command to sign in again.",
      401,
    );
  }
  if (response.status === 429) {
    return new CopilotApiError("GitHub Copilot rate limit or usage quota reached. Try again later.", 429);
  }
  if (code === "model_not_supported") {
    return new CopilotApiError("This model isn't available on your GitHub Copilot plan.", response.status);
  }
  return new CopilotApiError(
    `GitHub Copilot request failed (HTTP ${response.status})${message ? `: ${message}` : ""}`,
    response.status,
  );
};

const copilotFetch =
  (token: string, extraHeaders: Record<string, string> = {}): typeof fetch =>
  async (input, init) => {
    const headers = new Headers(init?.headers);
    // Set by the Anthropic provider; Copilot authenticates with the bearer token only
    headers.delete("x-api-key");
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-GitHub-Api-Version", API_VERSION);
    headers.set("Copilot-Integration-Id", INTEGRATION_ID);
    for (const [name, value] of Object.entries(extraHeaders)) {
      headers.set(name, value);
    }

    const response = await fetch(input, { ...init, headers });
    if (!response.ok) {
      throw await toCopilotError(response);
    }
    return response;
  };

const readJson = async <T>(key: string): Promise<T | undefined> => {
  const value = await LocalStorage.getItem<string>(key);
  return value ? (JSON.parse(value) as T) : undefined;
};

const fetchApiUrl = async (token: string): Promise<string> => {
  // Business and enterprise seats are served from a different host than individual ones
  const response = await fetch("https://api.github.com/copilot_internal/user", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw await toCopilotError(response);
  }
  const user = (await response.json()) as { endpoints?: { api?: string } };
  const apiUrl = user.endpoints?.api ?? DEFAULT_API_URL;
  await LocalStorage.setItem(cacheKey("api-url", token), apiUrl);
  return apiUrl;
};

const getApiUrl = async (token: string): Promise<string> =>
  (await LocalStorage.getItem<string>(cacheKey("api-url", token))) ?? fetchApiUrl(token);

const fetchCatalog = async (apiUrl: string, token: string): Promise<CopilotModel[]> => {
  const response = await copilotFetch(token)(`${apiUrl}/models`);
  const { data } = (await response.json()) as { data: CopilotModel[] };
  await LocalStorage.setItem(cacheKey("catalog", token), JSON.stringify(data));
  return data;
};

const findModel = async (apiUrl: string, token: string, id: string): Promise<CopilotModel> => {
  const cached = (await readJson<CopilotModel[]>(cacheKey("catalog", token)))?.find((model) => model.id === id);
  const model = cached ?? (await fetchCatalog(apiUrl, token)).find((model) => model.id === id);
  if (!model) {
    throw new Error(`GitHub Copilot no longer offers ${id}. Refresh the model list and pick another model.`);
  }
  return model;
};

const fetchAutoSession = async (apiUrl: string, token: string): Promise<AutoSession> => {
  const response = await copilotFetch(token)(`${apiUrl}/models/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auto_mode: { model_hints: ["auto"] } }),
  });
  const session = (await response.json()) as AutoSession;
  await LocalStorage.setItem(cacheKey("auto-session", token), JSON.stringify(session));
  return session;
};

const getAutoSession = async (apiUrl: string, token: string): Promise<AutoSession> => {
  const cached = await readJson<AutoSession>(cacheKey("auto-session", token));
  if (cached && cached.expires_at * 1000 - SESSION_REFRESH_MARGIN_MS > Date.now()) {
    return cached;
  }
  return fetchAutoSession(apiUrl, token);
};

const endpointFor = (model: CopilotModel): Endpoint | undefined => {
  const endpoints = model.supported_endpoints;
  // Older models don't list endpoints and only speak chat completions
  if (!endpoints) return "chat";
  if (endpoints.includes("/v1/messages")) return "messages";
  if (endpoints.includes("/responses")) return "responses";
  if (endpoints.includes("/chat/completions")) return "chat";
  return undefined;
};

const isVisionMediaType = (mediaType: string): mediaType is VisionMediaType =>
  (VISION_MEDIA_TYPES as readonly string[]).includes(mediaType);

const visionMediaTypesOf = (model: CopilotModel): VisionMediaType[] =>
  model.capabilities.supports?.vision
    ? (model.capabilities.limits?.vision?.supported_media_types ?? []).filter(isVisionMediaType)
    : [];

type Capabilities = NonNullable<AI.RegisteredModel["capabilities"]>;

const capabilitiesOf = (model: CopilotModel): Capabilities => {
  const supports = model.capabilities.supports ?? {};
  const efforts = supports.reasoning_effort ?? [];
  const mediaTypes = visionMediaTypesOf(model);

  return {
    systemMessage: { supported: true },
    streaming: { supported: supports.streaming ?? true },
    // Reasoning models reject a custom temperature
    temperature: { supported: efforts.length === 0 },
    tools: { supported: supports.tool_calls ?? false },
    ...(mediaTypes.length > 0 ? { vision: { mediaTypes } } : {}),
    ...(efforts.length > 0
      ? {
          reasoningEffort: {
            supported: true,
            options: efforts,
            default: efforts.includes("medium") ? "medium" : efforts[0],
          },
        }
      : {}),
  };
};

const MODEL_ICON = { source: "copilot.svg", tintColor: Color.PrimaryText };

const toRegisteredModel = (model: CopilotModel): AI.RegisteredModel => ({
  id: model.id,
  title: model.name,
  icon: MODEL_ICON,
  description: model.vendor,
  contextWindow: model.capabilities.limits?.max_context_window_tokens,
  capabilities: capabilitiesOf(model),
});

// Auto may route any request to any of its models, so only advertise what all of them support
const toAutoModel = (models: CopilotModel[]): AI.RegisteredModel => {
  const capabilities = models.map(capabilitiesOf);
  const mediaTypes = VISION_MEDIA_TYPES.filter((mediaType) =>
    capabilities.every((capability) => capability.vision?.mediaTypes.includes(mediaType)),
  );
  const contextWindows = models
    .map((model) => model.capabilities.limits?.max_context_window_tokens)
    .filter((contextWindow): contextWindow is number => contextWindow !== undefined);

  return {
    id: AUTO_MODEL_ID,
    title: "Auto",
    icon: MODEL_ICON,
    description: `GitHub Copilot picks from ${models.map((model) => model.name).join(", ")}`,
    contextWindow: contextWindows.length > 0 ? Math.min(...contextWindows) : undefined,
    capabilities: {
      systemMessage: { supported: true },
      streaming: { supported: capabilities.every((capability) => capability.streaming?.supported) },
      temperature: { supported: capabilities.every((capability) => capability.temperature?.supported) },
      tools: { supported: capabilities.every((capability) => capability.tools?.supported) },
      ...(mediaTypes.length > 0 ? { vision: { mediaTypes } } : {}),
    },
  };
};

export const getCopilotModels = async (): Promise<AI.RegisteredModel[]> => {
  const token = await authorizeModelProvider();
  const apiUrl = await fetchApiUrl(token);
  const catalog = await fetchCatalog(apiUrl, token);

  // Mirror the VS Code model picker: only models the plan lets the user pick directly
  const pickable = catalog.filter(
    (model) =>
      model.capabilities.type === "chat" &&
      model.model_picker_enabled &&
      model.policy?.state !== "disabled" &&
      endpointFor(model) !== undefined,
  );

  let session: AutoSession | undefined;
  try {
    session = await fetchAutoSession(apiUrl, token);
  } catch (error) {
    // Plans without Auto are rejected outright; anything else should keep the current models
    if (!(error instanceof CopilotApiError && (error.status === 403 || error.status === 404))) {
      throw error;
    }
  }

  const autoModels = (session?.available_models ?? [])
    .map((id) => catalog.find((model) => model.id === id))
    .filter((model): model is CopilotModel => model !== undefined && endpointFor(model) !== undefined);

  return [...(autoModels.length > 0 ? [toAutoModel(autoModels)] : []), ...pickable.map(toRegisteredModel)];
};

const toAiTools = (tools: AI.ModelToolSet | undefined): ToolSet | undefined => {
  if (!tools || Object.keys(tools).length === 0) return undefined;
  // Raycast executes tools and supplies their results on the next request
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema(
          (definition.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
        ),
      }),
    ]),
  );
};

const requestHeaders = (request: AI.ModelRequest): Record<string, string> => {
  const messages = request.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const hasImage = messages.some(
    (message) =>
      message.role === "user" &&
      message.content.some((part) => part.type === "file" && part.mediaType.startsWith("image/")),
  );

  return {
    // Tool round trips continue the user's turn and aren't billed as a new request
    "X-Initiator": lastMessage?.role === "user" ? "user" : "agent",
    ...(hasImage ? { "Copilot-Vision-Request": "true" } : {}),
  };
};

const createLanguageModel = (
  endpoint: Endpoint,
  apiUrl: string,
  token: string,
  modelId: string,
  fetch: typeof globalThis.fetch,
): LanguageModel => {
  switch (endpoint) {
    case "messages":
      return createAnthropic({ baseURL: `${apiUrl}/v1`, authToken: token, fetch })(modelId);
    case "responses":
      return createOpenAI({ baseURL: apiUrl, apiKey: token, fetch }).responses(modelId);
    case "chat":
      return createOpenAICompatible({ name: "copilot", baseURL: apiUrl, apiKey: token, fetch, includeUsage: true })(
        modelId,
      );
  }
};

type ProviderOptions = Parameters<typeof streamText>[0]["providerOptions"];

const providerOptionsFor = (
  endpoint: Endpoint,
  model: CopilotModel,
  reasoningEffort: string | undefined,
): ProviderOptions => {
  switch (endpoint) {
    case "messages":
      return {
        anthropic: {
          // Copilot's messages endpoint rejects the `eager_input_streaming` tool field
          toolStreaming: false,
          ...(reasoningEffort ? { effort: reasoningEffort } : {}),
          ...(reasoningEffort && model.capabilities.supports?.adaptive_thinking
            ? { thinking: { type: "adaptive" } }
            : {}),
        },
      };
    case "responses":
      return {
        openai: {
          store: false,
          ...(reasoningEffort ? { reasoningEffort } : {}),
          ...(reasoningEffort && reasoningEffort !== "none" ? { reasoningSummary: "auto" } : {}),
        },
      };
    case "chat":
      return reasoningEffort ? { copilot: { reasoningEffort } } : undefined;
  }
};

export const streamCopilotCompletion = async (model: AI.RegisteredModel, request: AI.ModelRequest) => {
  const token = await authorizeModelProvider();
  const apiUrl = await getApiUrl(token);

  let modelId = model.id;
  const headers = requestHeaders(request);
  if (model.id === AUTO_MODEL_ID) {
    const session = await getAutoSession(apiUrl, token);
    modelId = session.selected_model;
    headers["Copilot-Session-Token"] = session.session_token;
  }

  const copilotModel = await findModel(apiUrl, token, modelId);
  const endpoint = endpointFor(copilotModel);
  if (!endpoint) {
    throw new Error(`${copilotModel.name} can't be used for chat from Raycast.`);
  }

  // Raycast only sends efforts declared in the model's capabilities, so this is never set for Auto
  const reasoningEffort = request.providerOptions?.raycast.reasoningEffort;

  return streamText({
    model: createLanguageModel(endpoint, apiUrl, token, modelId, copilotFetch(token, headers)),
    system: request.system,
    messages: (request.messages ?? []) as ModelMessage[],
    // Copilot model IDs do not always match the AI SDK's built-in IDs. Without an
    // explicit limit, the SDK can request more output tokens than Copilot allows.
    maxOutputTokens: copilotModel.capabilities.limits?.max_output_tokens,
    temperature: model.capabilities?.temperature?.supported ? request.temperature : undefined,
    tools: toAiTools(request.tools),
    toolChoice: request.toolChoice,
    providerOptions: providerOptionsFor(endpoint, copilotModel, reasoningEffort),
    maxRetries: 0,
  });
};
