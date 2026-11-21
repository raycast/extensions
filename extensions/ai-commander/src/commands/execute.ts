import { ProviderError } from "../core/errors";
import { cleanOutput } from "../prompts/postprocess";
import { SYSTEM_FRAME } from "../prompts/system-frame";
import { extractRequirements, render, type RenderValues } from "../prompts/template/render";
import { getSnippets, markPromptUsed } from "../prompts/store";
import type { PromptDef, TokenUsage } from "../core/types";
import { streamChat } from "../providers";
import type { RunInput } from "./input";
import type { ResolvedRun } from "./resolve";

export interface ChatMessages {
  system: string;
  user: string;
}

export interface RunResult {
  text: string;
  usage?: TokenUsage;
  durationMs: number;
}

export async function buildMessages(
  prompt: PromptDef,
  input: RunInput,
  args: Record<string, string> = {},
): Promise<ChatMessages> {
  const values: RenderValues = {
    selection: input.selection,
    clipboard: input.clipboard,
    browserTab: input.browserTab,
    arguments: args,
    snippets: extractRequirements(prompt.template).snippets.length > 0 ? await getSnippets() : [],
  };
  return { system: SYSTEM_FRAME, user: render(prompt.template, values) };
}

/**
 * Updates the list order in the background. This is bookkeeping: it must neither delay the request nor stop it when
 * storage fails.
 */
export function recordUse(promptId: string): void {
  void markPromptUsed(promptId).catch(() => undefined);
}

/** The name to show for the model of a run. */
export function modelName(run: ResolvedRun): string {
  return run.entry?.displayName ?? run.ref.modelId;
}

/** Streams one request. A resolved promise means the text is complete and usable, see `streamChat`. */
export async function streamRun(
  run: ResolvedRun,
  messages: ChatMessages,
  signal: AbortSignal,
  onText?: (accumulated: string) => void,
): Promise<RunResult> {
  const startedAt = Date.now();
  let text = "";
  let usage: TokenUsage | undefined;

  const stream = streamChat(
    run.ref,
    run.apiKey,
    {
      ...messages,
      reasoning: run.reasoning,
      temperature: run.temperature,
      maxOutputTokens: run.maxOutputTokens,
      openRouterProvider: run.openRouterProvider,
      signal,
    },
    { preserveThinkTags: messages.user.includes("<think>") },
  );
  for await (const event of stream) {
    if (event.type === "text") {
      text += event.text;
      onText?.(text);
    } else {
      usage = event.usage;
    }
  }
  return { text, usage, durationMs: Date.now() - startedAt };
}

/** Applies the post-processing. Cleaning can leave nothing, and an empty paste would delete the selection. */
export function finalizeText(text: string, original: string | undefined): string {
  const cleaned = cleanOutput(text, original);
  if (cleaned.trim() === "") throw new ProviderError("empty-result", "The model returned no usable text.");
  return cleaned;
}

/** Rough cost in USD. Only OpenRouter reports prices, so direct models return undefined. */
export function estimateCost(run: ResolvedRun, usage: TokenUsage | undefined): number | undefined {
  const pricing = run.entry?.pricing;
  if (!pricing || !usage) return undefined;
  return (usage.input * pricing.inputPerMTok + usage.output * pricing.outputPerMTok) / 1_000_000;
}
