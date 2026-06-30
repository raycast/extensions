import type { ImageInput } from "./image-input";
import { type RuntimeConfig, toChatCompletionsUrl } from "./preferences";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string | number,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

const SYSTEM_PROMPT = [
  "You are a precise LaTeX OCR engine for math formula screenshots.",
  "Return only the LaTeX source for the formula.",
  "Do not include Markdown fences, explanations, prose, or math delimiters like $...$, $$...$$, \\(...\\), or \\[...\\].",
  "Preserve multi-line structure with aligned, cases, matrix, or equation environments when needed.",
  "If the image does not contain a formula, return an empty string.",
].join(" ");

const USER_PROMPT =
  "Recognize the mathematical formula in this screenshot and output only its LaTeX source.";

export async function recognizeFormula(
  config: RuntimeConfig,
  image: ImageInput,
): Promise<string> {
  const models = [config.model, ...config.fallbackModels];
  const errors: string[] = [];

  for (const model of models) {
    try {
      return await recognizeFormulaWithModel(config, image, model);
    } catch (error) {
      errors.push(`${model}: ${getErrorMessage(error)}`);

      if (!isRetryableModelError(error)) {
        throw error;
      }
    }
  }

  throw new Error(
    `All ${config.providerTitle} model attempts failed. ${errors.join(" ")}`,
  );
}

async function recognizeFormulaWithModel(
  config: RuntimeConfig,
  image: ImageInput,
  model: string,
): Promise<string> {
  const response = await fetch(toChatCompletionsUrl(config.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createRequestBody(config, image, model)),
    signal: AbortSignal.timeout(90_000),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw createProviderRequestError(
      `${config.providerTitle} request failed`,
      response.status,
      responseText,
    );
  }

  const data = JSON.parse(responseText) as ChatCompletionResponse;
  if (data.error) {
    throw new Error(
      `${config.providerTitle} request failed: ${data.error.message ?? data.error.type ?? data.error.code}`,
    );
  }

  return extractMessageContent(data);
}

function createRequestBody(
  config: RuntimeConfig,
  image: ImageInput,
  model: string,
): Record<string, unknown> {
  const imageUrl: Record<string, unknown> = { url: image.dataUrl };
  if (config.providerKind === "openai") {
    imageUrl.detail = "high";
  }
  if (config.providerKind === "minimax") {
    imageUrl.detail = "default";
  }

  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: USER_PROMPT,
          },
          {
            type: "image_url",
            image_url: imageUrl,
          },
        ],
      },
    ],
    temperature: config.temperature,
  };

  if (config.providerKind === "openai" || config.providerKind === "minimax") {
    body.max_completion_tokens = config.maxTokens;
  } else {
    body.max_tokens = config.maxTokens;
  }

  if (config.providerKind === "minimax") {
    body.thinking = { type: config.enableThinking ? "adaptive" : "disabled" };
  } else if (config.providerKind === "siliconflow") {
    body.enable_thinking = config.enableThinking;
  } else if (config.providerKind === "compatible" && config.enableThinking) {
    body.enable_thinking = true;
  }

  return body;
}

function extractMessageContent(data: ChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part.type === "text" || !part.type ? part.text : undefined,
      )
      .filter((text): text is string => typeof text === "string")
      .join("\n");
  }

  throw new Error("The provider returned no OCR text.");
}

function createProviderRequestError(
  prefix: string,
  status: number,
  responseText: string,
): ProviderRequestError {
  try {
    const parsed = JSON.parse(responseText) as ChatCompletionResponse;
    const message =
      parsed.error?.message ?? parsed.error?.type ?? parsed.error?.code;
    if (message) {
      return new ProviderRequestError(
        `${prefix}: ${status} ${message}`,
        status,
        parsed.error?.code,
      );
    }
  } catch {
    // Fall through to the plain text response body.
  }

  const compactBody = responseText.replace(/\s+/g, " ").trim();
  return new ProviderRequestError(
    compactBody
      ? `${prefix}: ${status} ${compactBody.slice(0, 300)}`
      : `${prefix}: ${status}`,
    status,
  );
}

function isRetryableModelError(error: unknown): boolean {
  if (!(error instanceof ProviderRequestError)) {
    return false;
  }

  return error.code === 30003 || error.code === "30003" || error.status === 404;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
