export type RevisionRequest = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  systemPrompt: string;
  temperature: number;
  sourceText: string;
  instruction: string;
  timeoutMs?: number;
};

export type RawPreferences = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  systemPrompt: string;
  temperature: string;
};

export type RevisionInput = {
  sourceText: string;
  presetInstruction: string;
  customInstructions: string;
};

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export const DEFAULT_BASE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_MODEL = "local-model";
export const DEFAULT_TIMEOUT_MS = 120_000;

export function resolveRevisionRequest(preferences: RawPreferences, input: RevisionInput): RevisionRequest {
  return {
    baseUrl: preferences.baseUrl.trim() || DEFAULT_BASE_URL,
    model: preferences.model.trim() || DEFAULT_MODEL,
    apiKey: preferences.apiKey,
    systemPrompt: preferences.systemPrompt,
    // Parsed here, clamped to a valid range by reviseText (the transport boundary).
    temperature: Number.parseFloat(preferences.temperature),
    sourceText: input.sourceText,
    instruction: buildInstruction(input.presetInstruction, input.customInstructions),
  };
}

export function buildInstruction(presetInstruction: string, customInstructions: string): string {
  return [presetInstruction, customInstructions.trim()].filter(Boolean).join(" ");
}

export async function reviseText(request: RevisionRequest): Promise<string> {
  const url = buildChatCompletionsUrl(request.baseUrl);
  const prompt = buildPrompt(request.sourceText, request.instruction);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = request.apiKey?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, request.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: request.model,
        stream: false,
        temperature: normalizeTemperature(request.temperature),
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error("The request timed out. Check that the local server is running and reachable.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const data = (await parseJson(response)) as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!response.ok) {
    throw new Error(extractErrorMessage(data) ?? `OpenAI-compatible request failed with status ${response.status}`);
  }

  if (!content) {
    throw new Error("The local model returned an empty response.");
  }

  return content;
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (!normalizedBaseUrl) {
    throw new Error("Base URL is required.");
  }

  if (normalizedBaseUrl.endsWith("/chat/completions")) {
    return normalizedBaseUrl;
  }

  if (normalizedBaseUrl.endsWith("/v1")) {
    return `${normalizedBaseUrl}/chat/completions`;
  }

  return `${normalizedBaseUrl}/v1/chat/completions`;
}

export function buildPrompt(sourceText: string, instruction: string): string {
  return [`Instruction: ${instruction}`, "", "Return only the revised text.", "", "Text:", sourceText].join("\n");
}

export function normalizeTemperature(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.2;
  }

  return Math.min(2, Math.max(0, value));
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if (
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return undefined;
}
