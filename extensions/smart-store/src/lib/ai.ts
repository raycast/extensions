import { AI, environment, getPreferenceValues } from "@raycast/api";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export type Provider = "raycast" | "anthropic" | "openai" | "none";

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export interface AIStatus {
  provider: Provider;
  available: boolean;
  /** Why AI is unavailable, shown to the user. */
  reason?: string;
}

export function getAIStatus(): AIStatus {
  const { aiProvider, apiKey } = getPreferenceValues<Preferences>();
  const provider = (aiProvider || "raycast") as Provider;
  if (provider === "none") return { provider, available: false, reason: "AI is turned off in preferences" };
  if (provider === "raycast") {
    return environment.canAccess(AI)
      ? { provider, available: true }
      : { provider, available: false, reason: "Raycast AI requires Raycast Pro" };
  }
  if (!apiKey?.trim()) return { provider, available: false, reason: "Add your API key in preferences" };
  return { provider, available: true };
}

function modelFor(provider: Provider): string {
  const { model } = getPreferenceValues<Preferences>();
  if (model?.trim()) return model.trim();
  return provider === "openai" ? DEFAULT_OPENAI_MODEL : DEFAULT_ANTHROPIC_MODEL;
}

let anthropicClient: Anthropic | undefined;
function anthropic(): Anthropic {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: apiKey?.trim() });
  return anthropicClient;
}

/** Claude 5 generation models accept the `effort` setting; the server-side fallback only exists for some of them. */
function anthropicOptions(model: string) {
  const supportsEffort = /^claude-(opus|sonnet|haiku|fable|mythos)-5/.test(model);
  const supportsFallback = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(model);
  return {
    effort: supportsEffort ? ("low" as const) : undefined,
    fallback: supportsFallback
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : { betas: [] as string[] },
  };
}

function describeError(error: unknown): Error {
  if (error instanceof Anthropic.AuthenticationError) return new Error("Invalid Anthropic API key");
  if (error instanceof Anthropic.RateLimitError) return new Error("Anthropic rate limit reached, try again shortly");
  if (error instanceof Anthropic.APIError) return new Error(`Anthropic error ${error.status}: ${error.message}`);
  return error instanceof Error ? error : new Error(String(error));
}

async function openAIChat(prompt: string, json: boolean, signal?: AbortSignal): Promise<string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey?.trim()}` },
    body: JSON.stringify({
      model: modelFor("openai"),
      messages: [{ role: "user", content: prompt }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (response.status === 401) throw new Error("Invalid OpenAI API key");
  if (!response.ok) throw new Error(`OpenAI error ${response.status}: ${await response.text()}`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI answer did not contain JSON");
  return JSON.parse(body.slice(start, end + 1));
}

/** Asks the configured AI for an answer matching `schema`. */
export async function askJSON<T>(prompt: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const status = getAIStatus();
  if (!status.available) throw new Error(status.reason);

  if (status.provider === "anthropic") {
    const model = modelFor("anthropic");
    const { effort, fallback } = anthropicOptions(model);
    try {
      const response = await anthropic().beta.messages.parse(
        {
          model,
          max_tokens: 16000,
          ...fallback,
          output_config: { ...(effort ? { effort } : {}), format: betaZodOutputFormat(schema) },
          messages: [{ role: "user", content: prompt }],
        },
        { signal },
      );
      if (response.stop_reason === "refusal") throw new Error("The AI declined this request");
      if (!response.parsed_output) throw new Error("The AI answer could not be read");
      return response.parsed_output as T;
    } catch (error) {
      throw describeError(error);
    }
  }

  const jsonPrompt = `${prompt}\n\nRespond with a single JSON object (no prose, no code fence) matching this JSON schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text =
      status.provider === "openai"
        ? await openAIChat(jsonPrompt, true, signal)
        : await AI.ask(jsonPrompt, { creativity: "none", signal });
    try {
      return schema.parse(extractJSON(text));
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  throw new Error("Unreachable");
}

/** Asks the configured AI for free text, streaming partial output through `onText`. */
export async function askText(prompt: string, onText: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const status = getAIStatus();
  if (!status.available) throw new Error(status.reason);

  if (status.provider === "anthropic") {
    const model = modelFor("anthropic");
    const { effort, fallback } = anthropicOptions(model);
    try {
      let text = "";
      const stream = anthropic().beta.messages.stream(
        {
          model,
          max_tokens: 16000,
          ...fallback,
          ...(effort ? { output_config: { effort } } : {}),
          messages: [{ role: "user", content: prompt }],
        },
        { signal },
      );
      stream.on("text", (delta) => {
        text += delta;
        onText(text);
      });
      const message = await stream.finalMessage();
      if (message.stop_reason === "refusal") throw new Error("The AI declined this request");
      return text;
    } catch (error) {
      throw describeError(error);
    }
  }

  if (status.provider === "openai") {
    const text = await openAIChat(prompt, false, signal);
    onText(text);
    return text;
  }

  let text = "";
  const answer = AI.ask(prompt, { creativity: "medium", signal });
  answer.on("data", (chunk) => {
    text += chunk;
    onText(text);
  });
  return await answer;
}
