import type { ProsodyAnalysis } from "../types";
import { buildPrompt, parseAnalysis, type PromptOptions } from "./prompt";
import { validateAnalysis } from "./validate";
import { chatJSON, type ChatConfig } from "./client";

export interface AnalyzeDeps {
  chat: (cfg: ChatConfig, system: string, user: string) => Promise<string>;
}

const defaultDeps: AnalyzeDeps = { chat: (cfg, s, u) => chatJSON(cfg, s, u) };

/** Get schema-valid JSON, repairing once if the first reply is malformed. */
async function getValidJson(
  deps: AnalyzeDeps,
  cfg: ChatConfig,
  system: string,
  user: string,
): Promise<ProsodyAnalysis> {
  const raw = await deps.chat(cfg, system, user);
  try {
    return parseAnalysis(raw);
  } catch (err) {
    const repairUser = `${user}\n\nYour previous response was invalid (${String(err).slice(0, 150)}). Return ONLY valid JSON matching the schema, no prose, no fences.`;
    const raw2 = await deps.chat(cfg, system, repairUser);
    return parseAnalysis(raw2); // if this still throws, the caller surfaces a toast
  }
}

export async function analyze(
  text: string,
  opts: PromptOptions,
  cfg: ChatConfig,
  deps: AnalyzeDeps = defaultDeps,
): Promise<ProsodyAnalysis> {
  const { system, user } = buildPrompt(text, opts);
  const analysis = await getValidJson(deps, cfg, system, user);

  // Content guardrail: the schema can't tell whether the model dropped words,
  // invented syllables, or rewrote the sentence. If it did, feed the specific
  // problems back for ONE repair round, then accept best-effort — we never
  // block practice on a stubborn model.
  const violations = validateAnalysis(analysis, text);
  if (violations.length === 0) return analysis;

  const repairUser = `${user}\n\nYour previous analysis had these problems: ${violations.join("; ")}. Fix ONLY these, keep every other field, use the exact input words, and return valid JSON only.`;
  try {
    const repaired = await getValidJson(deps, cfg, system, repairUser);
    return validateAnalysis(repaired, text).length <= violations.length
      ? repaired
      : analysis;
  } catch {
    return analysis; // repair reply failed to parse → keep the best-effort original
  }
}
