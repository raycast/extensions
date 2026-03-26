import { LocalStorage } from "@raycast/api";
import { logger } from "./logger";
import { PromptEvent } from "./promptEvents";
import {
  getProviderChatEndpoint,
  getProviderDefinition,
  getProviderHeaders,
  getProviderModelsEndpoint,
  normalizeCustomBaseUrl,
} from "./providerRegistry";

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type ChatCompletionMessage = {
  content?: string;
  reasoning_content?: string;
};

type ChatCompletionDelta = {
  content?: string;
  reasoning_content?: string;
  thinking?: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: ChatCompletionMessage;
    delta?: ChatCompletionDelta;
  }>;
};

type ProviderModelRecord = {
  id?: string;
};

type ProviderModelsResponse = {
  data?: ProviderModelRecord[];
};

type ReasoningControlVariant = "omit" | "reasoning-none" | "reasoning-low" | "qwen-disabled" | "glm-disabled";

type ReasoningControlAttempt = {
  variant: ReasoningControlVariant;
  params: Record<string, unknown>;
};

type ReasoningControlPlan = {
  cacheKey: string;
  attempts: ReasoningControlAttempt[];
  matchedRuleId: string | null;
  cachedVariant: ReasoningControlVariant | null;
};

type ReasoningRuleContext = {
  provider: string;
  model: string;
  endpoint: string;
  normalizedProvider: string;
  normalizedModel: string;
  normalizedEndpoint: string;
};

type ReasoningRule = {
  id: string;
  matches: (context: ReasoningRuleContext) => boolean;
  variants: ReasoningControlVariant[];
};

const REASONING_CONTROL_PARAMS: Record<ReasoningControlVariant, Record<string, unknown>> = {
  omit: {},
  "reasoning-none": { reasoning_effort: "none" },
  "reasoning-low": { reasoning_effort: "low" },
  "qwen-disabled": { enable_thinking: false },
  "glm-disabled": { thinking: { type: "disabled" } },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesModelFamily(normalizedModel: string, family: string): boolean {
  const escaped = escapeRegex(family);
  const pattern = new RegExp(`(^|[/:])${escaped}($|[-@:])`);
  return pattern.test(normalizedModel);
}

function supportsReasoningEffortNoneForChatCompletions(model: string): boolean {
  const normalizedModel = model.trim().toLowerCase();

  if (
    matchesModelFamily(normalizedModel, "gpt-5.1-codex") ||
    matchesModelFamily(normalizedModel, "gpt-5.2-codex") ||
    matchesModelFamily(normalizedModel, "gpt-5.3-codex") ||
    matchesModelFamily(normalizedModel, "gpt-5.4-codex") ||
    matchesModelFamily(normalizedModel, "gpt-5-pro") ||
    matchesModelFamily(normalizedModel, "gpt-5.2-pro") ||
    matchesModelFamily(normalizedModel, "gpt-5.4-pro")
  ) {
    return false;
  }

  return (
    matchesModelFamily(normalizedModel, "gpt-5.1") ||
    matchesModelFamily(normalizedModel, "gpt-5.2") ||
    matchesModelFamily(normalizedModel, "gpt-5.4")
  );
}

function isHighOnlyReasoningModel(model: string): boolean {
  const normalizedModel = model.trim().toLowerCase();
  return (
    matchesModelFamily(normalizedModel, "gpt-5-pro") ||
    matchesModelFamily(normalizedModel, "gpt-5.2-pro") ||
    matchesModelFamily(normalizedModel, "gpt-5.4-pro")
  );
}

function supportsReasoningEffortLowForChatCompletions(model: string): boolean {
  const normalizedModel = model.trim().toLowerCase();

  if (supportsReasoningEffortNoneForChatCompletions(model)) {
    return false;
  }

  if (isHighOnlyReasoningModel(model)) {
    return false;
  }

  return (
    matchesModelFamily(normalizedModel, "gpt-5") ||
    matchesModelFamily(normalizedModel, "gpt-5.2-codex") ||
    matchesModelFamily(normalizedModel, "gpt-5.3-codex") ||
    matchesModelFamily(normalizedModel, "gpt-5.4-codex") ||
    matchesModelFamily(normalizedModel, "o1") ||
    matchesModelFamily(normalizedModel, "o3") ||
    matchesModelFamily(normalizedModel, "o4")
  );
}

const REASONING_RULES: readonly ReasoningRule[] = [
  {
    id: "qwen-thinking-switch",
    matches: (context) => context.normalizedProvider === "qwen" || context.normalizedModel.includes("qwen"),
    variants: ["qwen-disabled", "omit"],
  },
  {
    id: "glm-thinking-switch",
    matches: (context) =>
      context.normalizedProvider === "bigmodel" ||
      context.normalizedProvider === "zai" ||
      context.normalizedModel.includes("glm"),
    variants: ["glm-disabled", "omit"],
  },
  {
    id: "reasoning-none",
    matches: (context) => supportsReasoningEffortNoneForChatCompletions(context.model),
    variants: ["reasoning-none", "reasoning-low", "omit"],
  },
  {
    id: "mimo-low",
    matches: (context) => context.normalizedModel.includes("mimo") || context.normalizedEndpoint.includes("mimo"),
    variants: ["reasoning-low", "omit"],
  },
  {
    id: "reasoning-low",
    matches: (context) => supportsReasoningEffortLowForChatCompletions(context.model),
    variants: ["reasoning-low", "omit"],
  },
  {
    id: "custom-openai-compatible",
    matches: (context) => context.normalizedProvider === "custom",
    variants: ["reasoning-low", "omit"],
  },
];

function buildReasoningRuleContext(provider: string, model: string, endpoint: string): ReasoningRuleContext {
  return {
    provider,
    model,
    endpoint,
    normalizedProvider: provider.trim().toLowerCase(),
    normalizedModel: model.trim().toLowerCase(),
    normalizedEndpoint: endpoint.trim().toLowerCase(),
  };
}

function getReasoningControlCacheKey(provider: string, model: string, endpoint: string): string {
  return `reasoning-control:${provider}:${model}:${endpoint}`;
}

function dedupeReasoningVariants(variants: ReasoningControlVariant[]): ReasoningControlVariant[] {
  return [...new Set(variants)];
}

function isReasoningControlVariant(value: string): value is ReasoningControlVariant {
  return value in REASONING_CONTROL_PARAMS;
}

async function getReasoningControlAttempts(
  provider: string,
  model: string,
  endpoint: string,
): Promise<ReasoningControlPlan> {
  const context = buildReasoningRuleContext(provider, model, endpoint);
  const cacheKey = getReasoningControlCacheKey(provider, model, endpoint);
  const matchedRule = REASONING_RULES.find((rule) => rule.matches(context)) || null;
  const cachedVariantValue = await LocalStorage.getItem<string>(cacheKey);
  const cachedVariant = cachedVariantValue && isReasoningControlVariant(cachedVariantValue) ? cachedVariantValue : null;

  const variants: ReasoningControlVariant[] = matchedRule ? [...matchedRule.variants] : ["omit"];
  if (cachedVariant) {
    variants.unshift(cachedVariant);
  }

  return {
    cacheKey,
    matchedRuleId: matchedRule?.id || null,
    cachedVariant,
    attempts: dedupeReasoningVariants(variants).map((variant) => ({
      variant,
      params: REASONING_CONTROL_PARAMS[variant],
    })),
  };
}

function isReasoningControlError(errorText: string, attempt: ReasoningControlAttempt): boolean {
  if (attempt.variant === "omit") return false;

  const normalizedError = errorText.toLowerCase();

  if (attempt.variant === "reasoning-none" || attempt.variant === "reasoning-low") {
    return normalizedError.includes("reasoning_effort") || normalizedError.includes("reasoning.effort");
  }

  if (attempt.variant === "qwen-disabled") {
    return normalizedError.includes("enable_thinking");
  }

  if (attempt.variant === "glm-disabled") {
    return (
      normalizedError.includes("'thinking'") ||
      normalizedError.includes('"thinking"') ||
      normalizedError.includes("('body', 'thinking')") ||
      normalizedError.includes('("body", "thinking")')
    );
  }

  return false;
}

function shouldIncludeSamplingControls(model: string, attempt: ReasoningControlAttempt): boolean {
  if (attempt.variant === "reasoning-low") {
    return false;
  }

  if (
    attempt.variant === "omit" &&
    (supportsReasoningEffortLowForChatCompletions(model) || isHighOnlyReasoningModel(model))
  ) {
    return false;
  }

  return true;
}

function buildOpenAIProxyRequestBody(
  messages: ProviderMessage[],
  model: string,
  onUpdate: ((event: PromptEvent) => void) | undefined,
  attempt: ReasoningControlAttempt,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: model || undefined,
    messages,
    stream: !!onUpdate,
    ...attempt.params,
  };

  if (shouldIncludeSamplingControls(model, attempt)) {
    body.temperature = 0;
    body.top_p = 1;
  }

  return body;
}

/**
 * Normalizes different AI provider APIs into a unified interface
 * Returns the final generated text
 */
export async function callCustomProvider(
  systemPrompt: string,
  userMessage: string,
  selectedProvider: string,
  apiKey?: string,
  model?: string,
  customEndpoint?: string,
  onUpdate?: (event: PromptEvent) => void,
  signal?: AbortSignal,
): Promise<string> {
  const providerDefinition = getProviderDefinition(selectedProvider);
  if (!providerDefinition || !providerDefinition.chatEndpoint) {
    throw new Error(`Unsupported provider: ${selectedProvider}`);
  }

  if (providerDefinition.requiresApiKey && !apiKey) {
    throw new Error(
      `API Key is required for ${providerDefinition.label} provider. Please configure it in extension settings.`,
    );
  }

  // Use dynamic import for Node fetch to avoid polluting global scope if Raycast's global fetch behaves differently in some contexts.
  // Actually, Raycast environment provides a native global fetch based on node-fetch.

  const messages: ProviderMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const endpoint = getProviderChatEndpoint(selectedProvider, customEndpoint);
  if (!endpoint) {
    if (providerDefinition.requiresBaseUrl) {
      throw new Error(`${providerDefinition.label} Base URL is required. Please configure it in extension settings.`);
    }
    throw new Error(`Unsupported provider: ${selectedProvider}`);
  }

  return await callOpenAIProxy(
    messages,
    selectedProvider,
    model || providerDefinition.defaultModel || "",
    endpoint,
    getProviderHeaders(selectedProvider, apiKey || ""),
    onUpdate,
    signal,
  );
}

// Reusable handler for OpenAI-compatible endpoints (OpenAI, OpenRouter, Custom Local Models)
async function callOpenAIProxy(
  messages: ProviderMessage[],
  provider: string,
  model: string,
  endpoint: string,
  providerHeaders: Record<string, string>,
  onUpdate?: (event: PromptEvent) => void,
  signal?: AbortSignal,
): Promise<string> {
  const startTime = logger.isEnabled() ? Date.now() : 0;
  if (logger.isEnabled()) {
    logger.info(`[AI Request] Initiating request to ${endpoint} with model ${model}`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...providerHeaders,
  };

  const { cacheKey, attempts, matchedRuleId, cachedVariant } = await getReasoningControlAttempts(
    provider,
    model,
    endpoint,
  );

  if (logger.isEnabled()) {
    logger.info(
      `[AI Request] Reasoning control plan: rule=${matchedRuleId || "default"}, cached=${cachedVariant || "none"}, attempts=${attempts.map((attempt) => attempt.variant).join(" -> ")}`,
    );
  }

  let response: Response | null = null;
  let responseTime = 0;

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const requestBody = buildOpenAIProxyRequestBody(messages, model, onUpdate, attempt);

    if (logger.isEnabled()) {
      logger.info(`[AI Request] Attempt ${index + 1}/${attempts.length} using reasoning control ${attempt.variant}`);
    }

    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal,
    });

    responseTime = logger.isEnabled() ? Date.now() : 0;

    if (response.ok) {
      await LocalStorage.setItem(cacheKey, attempt.variant);
      if (logger.isEnabled()) {
        logger.info(
          `[AI Request] Response headers received. Time elapsed: ${responseTime - startTime}ms (reasoning control: ${attempt.variant}, cached=${cachedVariant === attempt.variant ? "hit" : "miss"})`,
        );
      }
      break;
    }

    const errorText = await response.text();
    const shouldRetry = index < attempts.length - 1 && isReasoningControlError(errorText, attempt);

    if (logger.isEnabled()) {
      const message = `[AI Request] API Error (${response.status}) [reasoning control: ${attempt.variant}]: ${errorText}`;
      if (shouldRetry) {
        logger.warn(`${message} Retrying with fallback.`);
      } else {
        logger.error(message);
      }
    }

    if (shouldRetry) {
      continue;
    }

    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  if (!response) {
    throw new Error("Failed to send API request");
  }

  onUpdate?.({ kind: "phase", phase: "generating" });

  if (!onUpdate) {
    const data = (await response.json()) as ChatCompletionResponse;
    if (logger.isEnabled()) {
      const finalTime = Date.now();
      logger.info(`[AI Request] Full JSON response received. Total time: ${finalTime - startTime}ms`);
    }
    if (!data?.choices?.[0]?.message?.content) {
      // Logic for providers that might return ONLY reasoning in non-streaming (rare but possible)
      if (data?.choices?.[0]?.message?.reasoning_content) return data.choices[0].message.reasoning_content;
      throw new Error("Invalid response format from API");
    }
    return data.choices[0].message.content;
  }

  if (!response.body) throw new Error("No response body for streaming");

  let fullContent = "";
  let fullReasoning = "";
  let buffer = "";
  let firstTokenTime: number | null = null;
  let firstReasoningTime: number | null = null;
  let hasLoggedReasoningFinish = false;

  const processBuffer = () => {
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          if (logger.isEnabled()) {
            const doneTime = Date.now();
            logger.info(`[AI Request] Stream finished [DONE]. Total time: ${doneTime - startTime}ms`);
          }
          continue;
        }
        try {
          const parsed = JSON.parse(data) as ChatCompletionResponse;
          const delta = parsed.choices?.[0]?.delta;

          if (delta) {
            const now = logger.isEnabled() ? Date.now() : 0;

            // Handle Reasoning Content (Thinking mode)
            const reasoning = delta.reasoning_content || delta.thinking;
            if (reasoning) {
              if (logger.isEnabled() && firstReasoningTime === null) {
                firstReasoningTime = now;
                logger.info(
                  `[AI Request] First reasoning token received. Time since request: ${now - startTime}ms (TTFR: ${now - responseTime}ms)`,
                );
              }
              fullReasoning += reasoning;
              onUpdate?.({ kind: "reasoning", text: fullReasoning });
            }

            // Handle Actual Content
            const content = delta.content;
            if (content) {
              if (logger.isEnabled() && firstTokenTime === null) {
                firstTokenTime = now;
                const reasoningDuration = firstReasoningTime ? ` (Reasoning took: ${now - firstReasoningTime}ms)` : "";
                logger.info(
                  `[AI Request] First content token received. Time since request: ${now - startTime}ms${reasoningDuration}`,
                );
              }
              fullContent += content;
              onUpdate?.({ kind: "content", text: fullContent });
            }

            // Detect transition from reasoning to content
            if (
              logger.isEnabled() &&
              firstReasoningTime !== null &&
              !reasoning &&
              content &&
              !hasLoggedReasoningFinish
            ) {
              hasLoggedReasoningFinish = true;
              logger.info(`[AI Request] Finished reasoning phase.`);
            }
          }
        } catch {
          // ignore parsing error for incomplete data
        }
      }
    }
  };

  if ("getReader" in response.body) {
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder("utf-8");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
  } else {
    for await (const chunk of response.body as AsyncIterable<string | Uint8Array>) {
      buffer += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
      processBuffer();
    }
  }

  return fullContent;
}

export interface AIModel {
  id: string;
  name: string;
}

export async function fetchProviderModels(
  provider: string,
  apiKey: string,
  customEndpoint?: string,
  signal?: AbortSignal,
): Promise<AIModel[]> {
  const providerDefinition = getProviderDefinition(provider);
  if (!providerDefinition?.supportsModelFetch) return [];
  if (providerDefinition.requiresApiKey && !apiKey) return [];

  const safeUrl = normalizeCustomBaseUrl(customEndpoint || "");
  const CACHE_KEY = `models_${provider}_${safeUrl.substring(0, 50)}`;
  const CACHE_TIME_KEY = `${CACHE_KEY}_time`;

  // Try to load cache
  const cachedTimeStr = await LocalStorage.getItem<string>(CACHE_TIME_KEY);
  if (cachedTimeStr) {
    const cachedTime = parseInt(cachedTimeStr, 10);
    if (Date.now() - cachedTime < 24 * 60 * 60 * 1000) {
      const cachedModelsStr = await LocalStorage.getItem<string>(CACHE_KEY);
      if (cachedModelsStr) {
        try {
          return JSON.parse(cachedModelsStr);
        } catch {
          // Ignore invalid cached JSON and refetch models.
        }
      }
    }
  }

  // If no cache or expired, fetch from API
  let models: AIModel[] = [];
  try {
    const endpoint = getProviderModelsEndpoint(provider, customEndpoint);
    if (!endpoint) return [];
    const headers = getProviderHeaders(provider, apiKey);

    const res = await fetch(endpoint, { headers, signal });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    const data = (await res.json()) as ProviderModelsResponse;

    if (!data?.data || !Array.isArray(data.data)) {
      throw new Error("Invalid models response");
    }

    models = data.data
      .map((model) => model.id)
      .filter((id): id is string => typeof id === "string")
      .filter((id) => {
        if (
          id.includes("embedding") ||
          id.includes("tts") ||
          id.includes("whisper") ||
          id.includes("dall-e") ||
          id.includes("babbage") ||
          id.includes("davinci") ||
          id.includes("text-") ||
          id.includes("audio-")
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.localeCompare(b))
      .map((id) => ({ id, name: id }));
  } catch (error) {
    console.error(`Failed to fetch models for ${provider}:`, error);
    // If fetch fails, try to return expired cache anyway
    const cachedModelsStr = await LocalStorage.getItem<string>(CACHE_KEY);
    if (cachedModelsStr) {
      try {
        return JSON.parse(cachedModelsStr);
      } catch {
        // Ignore invalid cached JSON and surface the original fetch error.
      }
    }
    throw error; // Let the caller handle the fallback
  }

  // Cache successful fetch
  if (models.length > 0) {
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(models));
    await LocalStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  }

  return models;
}
