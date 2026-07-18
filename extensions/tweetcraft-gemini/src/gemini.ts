import { Agent, Dispatcher, ProxyAgent, request } from "undici";
import { getPreferenceValues } from "@raycast/api";
import { profiles, shorteningPrompt } from "./prompts";
import { formatProxyRoute, normalizeProxyUrl } from "./proxy";
import type { ErrorCategory, GeminiResponse, Preferences, RewriteMode } from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 60_000;

export class GeminiRequestError extends Error {
  readonly statusCode?: number;
  readonly connectionFailure: boolean;

  constructor(message: string, options?: { statusCode?: number; connectionFailure?: boolean }) {
    super(message);
    this.name = "GeminiRequestError";
    this.statusCode = options?.statusCode;
    this.connectionFailure = options?.connectionFailure ?? false;
  }
}

function characterCount(text: string): number {
  return Array.from(text).length;
}

function cleanOutput(text: string): string {
  return text
    .trim()
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^([“"])([\s\S]*)([”"])$/, "$2")
    .trim();
}

function extractText(data: GeminiResponse): string {
  if (data.error) {
    throw new GeminiRequestError(data.error.message || data.error.status || "Gemini returned an error", {
      statusCode: data.error.code,
    });
  }

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const output = parts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("");

  if (!output.trim()) {
    const reason = candidate?.finishReason ? ` (${candidate.finishReason})` : "";
    throw new GeminiRequestError(`Gemini returned no usable text${reason}`);
  }

  return cleanOutput(output);
}

function createDispatcher(proxyUrl?: string): Dispatcher {
  if (proxyUrl) {
    return new ProxyAgent(proxyUrl);
  }
  return new Agent({ connect: { timeout: 15_000 } });
}

async function postGenerateContent(options: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userText: string;
  proxyUrl?: string;
}): Promise<string> {
  const dispatcher = createDispatcher(options.proxyUrl);
  const endpoint = `${API_BASE}/models/${encodeURIComponent(options.model)}:generateContent`;

  const payload = {
    systemInstruction: {
      parts: [{ text: options.systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: options.userText }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 512,
      ...(options.model.startsWith("gemini-3")
        ? {
            thinkingConfig: {
              thinkingLevel: "LOW",
            },
          }
        : {}),
    },
  };

  try {
    const response = await request(endpoint, {
      method: "POST",
      dispatcher,
      headersTimeout: 30_000,
      bodyTimeout: REQUEST_TIMEOUT_MS,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": options.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await response.body.text();
    let data: GeminiResponse;

    try {
      data = JSON.parse(bodyText) as GeminiResponse;
    } catch {
      throw new GeminiRequestError(`Gemini returned an unreadable response (HTTP ${response.statusCode})`, {
        statusCode: response.statusCode,
      });
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new GeminiRequestError(
        data.error?.message || `Gemini API request failed (HTTP ${response.statusCode})`,
        {
          statusCode: response.statusCode,
        },
      );
    }

    return extractText(data);
  } catch (error) {
    if (error instanceof GeminiRequestError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new GeminiRequestError(message, { connectionFailure: true });
  } finally {
    await dispatcher.close();
  }
}

type NetworkResult = {
  text: string;
  route: string;
};

async function generateWithNetworkFallback(options: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userText: string;
  networkMode: Preferences["networkMode"];
  proxyUrl?: string;
}): Promise<NetworkResult> {
  let proxyUrl: string | undefined;
  try {
    proxyUrl = normalizeProxyUrl(options.proxyUrl);
  } catch (error) {
    throw new GeminiRequestError(error instanceof Error ? error.message : "Invalid proxy URL");
  }

  if (options.networkMode === "direct") {
    return {
      text: await postGenerateContent({ ...options, proxyUrl: undefined }),
      route: "direct",
    };
  }

  if (options.networkMode === "proxy") {
    if (!proxyUrl) throw new GeminiRequestError("Proxy Only is selected, but no proxy URL is configured");
    return {
      text: await postGenerateContent({ ...options, proxyUrl }),
      route: formatProxyRoute(proxyUrl),
    };
  }

  if (proxyUrl) {
    try {
      return {
        text: await postGenerateContent({ ...options, proxyUrl }),
        route: `${formatProxyRoute(proxyUrl)} (auto)`,
      };
    } catch (error) {
      if (!(error instanceof GeminiRequestError) || !error.connectionFailure) {
        throw error;
      }
    }
  }

  return {
    text: await postGenerateContent({ ...options, proxyUrl: undefined }),
    route: "direct (auto)",
  };
}

export async function rewriteText(input: string, mode: RewriteMode): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const profile = profiles[mode];

  let output = (
    await generateWithNetworkFallback({
      apiKey: preferences.apiKey.trim(),
      model: preferences.model,
      systemPrompt: profile.prompt,
      userText: input.trim(),
      networkMode: preferences.networkMode,
      proxyUrl: preferences.proxyUrl,
    })
  ).text;

  if (characterCount(output) > profile.maxCharacters) {
    output = (
      await generateWithNetworkFallback({
        apiKey: preferences.apiKey.trim(),
        model: preferences.model,
        systemPrompt: shorteningPrompt(profile.maxCharacters),
        userText: output,
        networkMode: preferences.networkMode,
        proxyUrl: preferences.proxyUrl,
      })
    ).text;
  }

  return cleanOutput(output);
}

export async function checkConnection(): Promise<{ model: string; route: string }> {
  const preferences = getPreferenceValues<Preferences>();
  const proxyUrl = normalizeProxyUrl(preferences.proxyUrl);

  const result = await generateWithNetworkFallback({
    apiKey: preferences.apiKey.trim(),
    model: preferences.model,
    systemPrompt: "Return exactly the word OK and nothing else.",
    userText: "Connection test",
    networkMode: preferences.networkMode,
    proxyUrl,
  });

  if (result.text.trim().toUpperCase() !== "OK") {
    throw new GeminiRequestError("Gemini connected, but returned an unexpected test response");
  }

  return { model: preferences.model, route: result.route };
}

export function classifyError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = error instanceof GeminiRequestError ? error.statusCode : undefined;

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    /API key|permission|forbidden|unauthenticated/i.test(message)
  ) {
    return "api_key";
  }
  if (statusCode === 429 || /quota|rate limit|resource exhausted/i.test(message)) {
    return "quota";
  }
  if (statusCode === 404 || /model.*not found|selected Gemini model is unavailable/i.test(message)) {
    return "model";
  }
  if (/timeout|timed out|ETIMEDOUT|UND_ERR_(CONNECT|HEADERS|BODY)_TIMEOUT/i.test(message)) {
    return "timeout";
  }
  if (/proxy|ECONNREFUSED.*127\.0\.0\.1|Proxy Only/i.test(message)) {
    return "proxy";
  }
  if (/ENETUNREACH|EHOSTUNREACH|ENOTFOUND|ECONNRESET|socket|fetch failed|connect/i.test(message)) {
    return "network";
  }
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return "request";
  }
  return "unknown";
}

export function errorCategoryLabel(category: ErrorCategory): string {
  const labels: Record<ErrorCategory, string> = {
    timeout: "Request timed out",
    proxy: "Proxy error",
    network: "Network error",
    quota: "Quota or rate limit",
    api_key: "API key or permission error",
    model: "Model unavailable",
    request: "Request error",
    unknown: "Unknown error",
  };
  return labels[category];
}

export function humanizeError(error: unknown): string {
  const category = classifyError(error);
  const message = error instanceof Error ? error.message : String(error);

  switch (category) {
    case "api_key":
      return "Gemini rejected the API key or the project lacks permission";
    case "quota":
      return "The Gemini API quota is exhausted or rate-limited";
    case "model":
      return `The selected Gemini model is unavailable: ${message}`;
    case "timeout":
      return "The Gemini request timed out";
    case "proxy":
      return "Could not connect through the configured proxy";
    case "network":
      return "Could not connect to the Gemini API";
    case "request":
      return `Gemini rejected the request: ${message}`;
    default:
      return message;
  }
}
