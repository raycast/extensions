import { Buffer } from "node:buffer";

import { configurationError, emptyTextError, providerError } from "./errors";
import {
  DEFAULT_OPENROUTER_PARAMETERS,
  DEFAULT_OPENROUTER_PROVIDER,
  type OcrSetupConfig,
  type OpenRouterProviderPreferences,
  type OpenRouterRequestParameters,
} from "./types";

export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

const OCR_USER_PROMPT =
  "Extract the readable text from this image. Return only the extracted text unless the system instructions say otherwise.";

interface OpenRouterTextContent {
  type: "text";
  text: string;
}

interface OpenRouterImageContent {
  type: "image_url";
  image_url: {
    url: string;
  };
}

interface OpenRouterMessage {
  role: "system" | "user";
  content: string | Array<OpenRouterTextContent | OpenRouterImageContent>;
}

export interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  stream: false;
  max_tokens: number;
  temperature: number;
  provider: OpenRouterProviderPreferences;
}

export function buildImageDataUrl(imageBytes: Uint8Array, mimeType = "image/png"): string {
  return `data:${mimeType};base64,${Buffer.from(imageBytes).toString("base64")}`;
}

export function buildOpenRouterRequest({
  model,
  systemMessage,
  imageDataUrl,
  parameters,
  provider,
}: {
  model: string;
  systemMessage: string;
  imageDataUrl: string;
  parameters: OpenRouterRequestParameters;
  provider: OpenRouterProviderPreferences;
}): OpenRouterRequestBody {
  return {
    model,
    max_tokens: parameters.max_tokens,
    temperature: parameters.temperature,
    provider,
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: OCR_USER_PROMPT,
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ],
    stream: false,
  };
}

export async function requestOpenRouterOcr({
  setupConfig,
  systemMessage,
  imageDataUrl,
  fetchImplementation = fetch,
}: {
  setupConfig: OcrSetupConfig;
  systemMessage: string;
  imageDataUrl: string;
  fetchImplementation?: typeof fetch;
}): Promise<string> {
  const normalizedSetupConfig = normalizeSetupConfig(setupConfig);
  const normalizedSystemMessage = normalizeSystemMessage(systemMessage);
  const response = await fetchImplementation(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${normalizedSetupConfig.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Extract Screenshot Text",
    },
    body: JSON.stringify(
      buildOpenRouterRequest({
        model: normalizedSetupConfig.model,
        systemMessage: normalizedSystemMessage,
        imageDataUrl,
        parameters: normalizedSetupConfig.parameters,
        provider: normalizedSetupConfig.provider,
      }),
    ),
  });

  const responseJson = await readResponseJson(response);

  if (!response.ok) {
    throw providerError(buildProviderErrorMessage(response.status, responseJson));
  }

  const text = parseOpenRouterText(responseJson);

  if (!text) {
    throw emptyTextError();
  }

  return text;
}

export function parseOpenRouterText(responseJson: unknown): string {
  if (!isRecord(responseJson) || !Array.isArray(responseJson.choices)) {
    throw providerError("OpenRouter sent back an unexpected response. Try again.");
  }

  const firstChoice = responseJson.choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw providerError("OpenRouter didn't return any text. Try again.");
  }

  return extractMessageContentText(firstChoice.message.content).trim();
}

function normalizeSetupConfig(setupConfig: OcrSetupConfig): OcrSetupConfig {
  const apiKey = setupConfig.apiKey.trim();
  const model = setupConfig.model.trim();

  if (!apiKey) {
    throw configurationError("Add your OpenRouter API key in extension preferences.");
  }

  if (!model) {
    throw configurationError("Choose an OpenRouter model that can read images.");
  }

  return {
    apiKey,
    model,
    defaultCopyBehavior: setupConfig.defaultCopyBehavior,
    provider: setupConfig.provider ?? DEFAULT_OPENROUTER_PROVIDER,
    parameters: setupConfig.parameters ?? DEFAULT_OPENROUTER_PARAMETERS,
  };
}

function normalizeSystemMessage(systemMessage: string): string {
  const normalizedSystemMessage = systemMessage.trim();

  if (!normalizedSystemMessage) {
    throw configurationError("Add OCR instructions using the Edit OCR Instructions action.");
  }

  return normalizedSystemMessage;
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw providerError("Couldn't read OpenRouter's response. Try again.");
  }
}

function buildProviderErrorMessage(status: number, responseJson: unknown): string {
  const providerMessage = getDetailedProviderMessage(responseJson);

  if (status === 401 || status === 403) {
    return providerMessage || "OpenRouter didn't accept your API key. Check it in extension preferences and try again.";
  }

  if (status === 429) {
    return providerMessage || "OpenRouter is busy right now. Wait a moment and try again, or pick a different model.";
  }

  return providerMessage || `OpenRouter ran into a problem (error ${status}). Try again, or check your selected model.`;
}

const GENERIC_PROVIDER_MESSAGES = new Set(["Provider returned error"]);

function getDetailedProviderMessage(responseJson: unknown): string | undefined {
  const providerMessage = getProviderMessage(responseJson);
  const providerDetail = getProviderDetail(responseJson);

  if (!providerMessage) {
    return providerDetail;
  }

  if (!providerDetail || providerDetail === providerMessage) {
    return providerMessage;
  }

  if (GENERIC_PROVIDER_MESSAGES.has(providerMessage)) {
    return `${providerMessage}: ${trimTrailingSentencePunctuation(providerDetail)}. Try again, or pick a different model.`;
  }

  return providerMessage;
}

function getProviderMessage(responseJson: unknown): string | undefined {
  if (!isRecord(responseJson) || !isRecord(responseJson.error)) {
    return undefined;
  }

  return typeof responseJson.error.message === "string" ? responseJson.error.message : undefined;
}

function getProviderDetail(responseJson: unknown): string | undefined {
  if (!isRecord(responseJson) || !isRecord(responseJson.error) || !isRecord(responseJson.error.metadata)) {
    return undefined;
  }

  const rawDetail = responseJson.error.metadata.raw;

  if (typeof rawDetail === "string") {
    return readProviderDetailFromRawString(rawDetail);
  }

  return readNestedProviderMessage(rawDetail);
}

function readProviderDetailFromRawString(rawDetail: string): string | undefined {
  const trimmedRawDetail = rawDetail.trim();

  if (!trimmedRawDetail) {
    return undefined;
  }

  try {
    return readNestedProviderMessage(JSON.parse(trimmedRawDetail) as unknown) ?? trimmedRawDetail;
  } catch {
    return trimmedRawDetail;
  }
}

function readNestedProviderMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["message", "detail", "error"]) {
    const nestedValue = value[key];
    const nestedMessage = readNestedProviderMessage(nestedValue);

    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return undefined;
}

function trimTrailingSentencePunctuation(value: string): string {
  return value.replace(/[.!?]+$/u, "");
}

function extractMessageContentText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (!isRecord(part) || part.type !== "text") {
        return "";
      }

      return typeof part.text === "string" ? part.text : "";
    })
    .join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
