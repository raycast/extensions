import { EXTENSION_DISPLAY_NAME } from "./extension-brand";
import type { ModelResponse, TokenUsage } from "./token-usage";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

type GenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string; code?: number };
};

function usageFromGemini(u: GenerateContentResponse["usageMetadata"]): TokenUsage | undefined {
  if (!u) {
    return undefined;
  }
  const input = u.promptTokenCount;
  const output = u.candidatesTokenCount;
  const total = u.totalTokenCount;
  if (input == null && output == null && total == null) {
    return undefined;
  }
  return {
    input,
    output,
    total,
  };
}

export async function analyzeImageWithGemini(
  apiKey: string,
  model: string,
  base64Image: string,
  userPrompt: string,
  imageMediaType = "image/png",
): Promise<ModelResponse> {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }, { inlineData: { mimeType: imageMediaType, data: base64Image } }],
        },
      ],
    }),
  });

  const data = (await res.json()) as GenerateContentResponse;

  if (!res.ok) {
    const msg = data.error?.message || res.statusText || `HTTP ${res.status}`;
    throw new Error(formatGeminiHttpError(res.status, msg));
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("The model returned an empty response.");
  }
  return { text: trimmed, usage: usageFromGemini(data.usageMetadata) };
}

export async function analyzeTextWithGemini(
  apiKey: string,
  model: string,
  userMessage: string,
): Promise<ModelResponse> {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
    }),
  });

  const data = (await res.json()) as GenerateContentResponse;

  if (!res.ok) {
    const msg = data.error?.message || res.statusText || `HTTP ${res.status}`;
    throw new Error(formatGeminiHttpError(res.status, msg));
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("The model returned an empty response.");
  }
  return { text: trimmed, usage: usageFromGemini(data.usageMetadata) };
}

function formatGeminiHttpError(status: number, message: string): string {
  if (status === 400 && message.toLowerCase().includes("api key")) {
    return `Invalid Google AI API key. Check ${EXTENSION_DISPLAY_NAME} → Google Gemini API key in preferences.`;
  }
  if (status === 401 || status === 403) {
    return `Invalid or forbidden Google AI API key. Check ${EXTENSION_DISPLAY_NAME} → Google Gemini API key in preferences.`;
  }
  if (status === 429) {
    return "Rate limited by Google. Try again in a moment.";
  }
  return message;
}

export function formatGeminiError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
