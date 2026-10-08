import { getPreferenceValues } from "@raycast/api";
import { FmError } from "./errors";
import { countTokens, MAX_PROMPT_TOKENS, respond, RunOptions } from "./fm";
import { taskInstructions, TextTask } from "./prompts";

/** Rewrite, Proofread and Translate answer with about as many tokens as they get, so they need room for both. */
const REPLACING_TASK_LIMIT = 3500;

export function maxInputTokens(task: TextTask): number {
  return task.kind === "rewrite" || task.kind === "proofread" || task.kind === "translate"
    ? REPLACING_TASK_LIMIT
    : MAX_PROMPT_TOKENS;
}

/** Checks the length first, because a too long text fails slowly inside the model. */
export async function runTextTask(task: TextTask, text: string, runOptions: RunOptions): Promise<string> {
  const instructions = taskInstructions(task);
  const tokens = await countTokens(text, { instructions, signal: runOptions.signal });
  const limit = maxInputTokens(task);
  if (tokens > limit) {
    throw new FmError(
      "too-long",
      `This text is too long for the on-device model (${tokens.toLocaleString()} tokens, the limit for this command is about ${limit.toLocaleString()}). Use a shorter part and try again.`,
    );
  }
  const { permissiveGuardrails } = getPreferenceValues<ExtensionPreferences>();
  return respond(
    {
      prompt: text,
      instructions,
      guardrails: permissiveGuardrails === false ? "default" : "permissive-content-transformations",
    },
    runOptions,
  );
}
