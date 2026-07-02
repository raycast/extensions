import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type LanguageModel, type ModelMessage } from "ai";
import nodeFetch, { type RequestInit as NodeFetchRequestInit } from "node-fetch";
import { ProxyAgent } from "proxy-agent";
import { ApiSettings } from "./api-settings";
import { DiagnosticLogger, noopDiagnosticLogger } from "./diagnostics";
import { buildCompatibleUrl, getCompatibilityProfile } from "./api-compatibility";
import { ConversationMessage } from "./tool-runtime";
import { AITraceContext, traceHeaders } from "./tracing";

export type AISDKProviderModel = LanguageModel & {
  readonly modelId: string;
};

export interface AISDKStreamInput {
  settings: ApiSettings;
  model: string;
  messages: ConversationMessage[];
  signal: AbortSignal;
  agent?: InstanceType<typeof ProxyAgent>;
  diagnostics?: DiagnosticLogger;
  trace?: AITraceContext;
}

function toModelMessages(messages: ConversationMessage[]): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function requestUrl(settings: ApiSettings): string {
  const profile = getCompatibilityProfile(settings.apiCompatible);
  return buildCompatibleUrl(settings.apiBase, profile.chatPath);
}

export function buildAISDKProviderHeaders(settings: ApiSettings, trace?: AITraceContext): Record<string, string> {
  if (settings.apiCompatible === "raycast") {
    return traceHeaders(trace);
  }

  const headers: Record<string, string> = {};
  if (settings.apiCompatible === "anthropic" && settings.apiKey) {
    headers["x-api-key"] = settings.apiKey;
  }
  if (settings.apiCompatible === "openai" && settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  return {
    ...headers,
    ...traceHeaders(trace),
  };
}

function buildProviderFetch(
  agent: InstanceType<typeof ProxyAgent> | undefined,
  diagnostics: DiagnosticLogger,
): typeof fetch | undefined {
  if (!agent) {
    return undefined;
  }

  return (async (input, init) => {
    const startedAt = Date.now();
    diagnostics.checkpoint("ai_sdk.http.request.start", {
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      proxy: true,
    });
    const response = await nodeFetch(input as never, { ...(init as NodeFetchRequestInit), agent });
    diagnostics.checkpoint("ai_sdk.http.response", {
      status: response.status,
      ok: response.ok,
      elapsedMs: Date.now() - startedAt,
      cfRay: response.headers.get("cf-ray") ?? undefined,
      cfAigStep: response.headers.get("cf-aig-step") ?? undefined,
      routerRequestId: response.headers.get("x-router-request-id") ?? undefined,
      routerTraceId: response.headers.get("x-router-trace-id") ?? undefined,
    });
    return response as unknown as Response;
  }) as typeof fetch;
}

export function buildAISDKProviderModel(
  settings: ApiSettings,
  model: string,
  trace?: AITraceContext,
  agent?: InstanceType<typeof ProxyAgent>,
  diagnostics: DiagnosticLogger = noopDiagnosticLogger,
): AISDKProviderModel {
  const headers = traceHeaders(trace);
  const fetcher = buildProviderFetch(agent, diagnostics);

  if (settings.apiCompatible === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: settings.apiKey,
      baseURL: settings.apiBase,
      headers,
      ...(fetcher ? { fetch: fetcher } : {}),
    });
    return anthropic(model) as AISDKProviderModel;
  }

  const openai = createOpenAI({
    apiKey: settings.apiKey || "not-needed",
    baseURL: settings.apiBase,
    headers,
    ...(fetcher ? { fetch: fetcher } : {}),
  });
  return openai.chat(model) as AISDKProviderModel;
}

export async function* streamAISDKText(input: AISDKStreamInput): AsyncGenerator<string> {
  const diagnostics = input.diagnostics ?? noopDiagnosticLogger;
  const startedAt = Date.now();
  let deltaCount = 0;
  let outputChars = 0;
  let firstDeltaAt = 0;
  const url = requestUrl(input.settings);

  diagnostics.checkpoint("chat.request.start", {
    provider: "ai-sdk",
    runtime: input.settings.apiCompatible,
    url,
    model: input.model,
    messageCount: input.messages.length,
    proxy: Boolean(input.agent),
    traceId: input.trace?.traceId,
    clientRequestId: input.trace?.clientRequestId,
    sessionId: input.trace?.sessionId,
  });

  try {
    const result = streamText({
      model: buildAISDKProviderModel(input.settings, input.model, input.trace, input.agent, diagnostics),
      messages: toModelMessages(input.messages),
      temperature: 0,
      maxOutputTokens: 1024,
      maxRetries: 0,
      abortSignal: input.signal,
    });

    for await (const delta of result.textStream) {
      if (!delta) {
        continue;
      }
      deltaCount += 1;
      outputChars += delta.length;
      if (!firstDeltaAt) {
        firstDeltaAt = Date.now();
        diagnostics.checkpoint("chat.first_delta", { firstDeltaMs: firstDeltaAt - startedAt });
      } else if (deltaCount <= 5 || deltaCount % 20 === 0) {
        diagnostics.checkpoint("chat.delta", { deltaCount, outputChars });
      }
      yield delta;
    }
    diagnostics.finish("chat.complete", { deltaCount, outputChars, totalMs: Date.now() - startedAt });
  } catch (error) {
    diagnostics.finish("chat.error", {
      deltaCount,
      outputChars,
      totalMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
