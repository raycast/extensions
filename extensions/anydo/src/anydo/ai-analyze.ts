import { AI, environment } from "@raycast/api";

import {
  buildPrompt,
  extractJson,
  heuristicAnalysis,
  mergeSuggestion,
  type AnalysisContext,
  type TaskAnalysis,
} from "./analyze";

const TIMEOUT_MS = 20_000;

/** Raycast AI is only usable when the user has it available (Pro / AI access). */
export function aiAvailable(): boolean {
  try {
    return environment.canAccess(AI);
  } catch {
    return false;
  }
}

/**
 * The task is always produced by the deterministic analyser first, so the preview never waits and the
 * feature keeps working without Raycast AI. When AI is available the answer is merged on top — and
 * `mergeSuggestion` drops anything that is not valid.
 */
export async function analyzeWithAi(
  input: string,
  ctx: AnalysisContext,
): Promise<TaskAnalysis> {
  const base = heuristicAnalysis(input, ctx);
  if (!aiAvailable()) return base;

  try {
    const answer = await Promise.race([
      AI.ask(buildPrompt(input, ctx), { creativity: "none" }),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("ai-timeout")), TIMEOUT_MS),
      ),
    ]);
    return mergeSuggestion(base, extractJson(answer), ctx);
  } catch {
    return base;
  }
}
