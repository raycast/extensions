import { AI, environment } from "@raycast/api";
import { ConversionError, type AiProvider, type CompletionRequest, type StePreferences } from "../types";
import { parseTimeoutMs } from "../utils/text";

/** Run `task` with a timeout that aborts its signal and rejects with a typed error. */
async function withTimeout<T>(timeoutMs: number, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new ConversionError(
          "timeout",
          `The AI provider did not respond within ${Math.round(timeoutMs / 1000)} seconds.`,
        ),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([task(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function toConversionError(error: unknown): ConversionError {
  if (error instanceof ConversionError) return error;
  // Do not include request content; only the provider's own error message.
  const message = error instanceof Error ? error.message : String(error);
  return new ConversionError("failed", `The AI provider failed: ${message}`);
}

export class RaycastAiProvider implements AiProvider {
  readonly name = "Raycast AI";
  constructor(
    private readonly timeoutMs: number,
    private readonly modelKey?: string,
  ) {}

  /** Map the preference value (an AI.Model key) to the SDK enum. Unknown values use Raycast's default. */
  private resolveModel(): AI.Model | undefined {
    const models = AI.Model as Record<string, AI.Model> | undefined;
    return this.modelKey && models ? models[this.modelKey] : undefined;
  }

  async complete({ system, user }: CompletionRequest): Promise<string> {
    if (!environment.canAccess(AI)) {
      throw new ConversionError(
        "unavailable",
        "Raycast AI is not available for your account. Raycast AI needs Raycast Pro. You can configure an OpenAI-compatible provider in the extension preferences.",
      );
    }
    try {
      return await withTimeout(this.timeoutMs, (signal) =>
        AI.ask(`${system}\n\n${user}`, { creativity: "none", signal, model: this.resolveModel() }),
      );
    } catch (error) {
      throw toConversionError(error);
    }
  }
}

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "OpenAI-compatible provider";
  constructor(private readonly config: OpenAiCompatibleConfig) {}

  async complete({ system, user }: CompletionRequest): Promise<string> {
    const { baseUrl, model, apiKey, timeoutMs } = this.config;
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    try {
      return await withTimeout(timeoutMs, async (signal) => {
        let response: Response;
        try {
          response = await fetch(url, {
            method: "POST",
            signal,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model,
              temperature: 0,
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
            }),
          });
        } catch (error) {
          if (signal.aborted) throw error;
          throw new ConversionError(
            "unavailable",
            `Cannot reach the AI provider at ${baseUrl}. Check the URL and your network.`,
          );
        }
        if (response.status === 401 || response.status === 403) {
          throw new ConversionError(
            "auth",
            "The AI provider rejected the API key. Check the key in the extension preferences.",
          );
        }
        if (!response.ok) {
          throw new ConversionError("failed", `The AI provider returned HTTP ${response.status}.`);
        }
        const body = (await response.json()) as ChatCompletionResponse;
        return body.choices?.[0]?.message?.content ?? "";
      });
    } catch (error) {
      throw toConversionError(error);
    }
  }
}

export function createProvider(prefs: StePreferences): AiProvider {
  const timeoutMs = parseTimeoutMs(prefs.timeoutSeconds);
  if (prefs.provider === "openai-compatible") {
    const baseUrl = prefs.externalBaseUrl?.trim();
    const model = prefs.externalModel?.trim();
    const apiKey = prefs.externalApiKey?.trim();
    if (!baseUrl || !model || !apiKey) {
      throw new ConversionError(
        "unavailable",
        "The OpenAI-compatible provider needs a base URL, a model, and an API key. Set them in the extension preferences.",
      );
    }
    return new OpenAiCompatibleProvider({ baseUrl, model, apiKey, timeoutMs });
  }
  return new RaycastAiProvider(timeoutMs, prefs.raycastModel);
}
