import { runPhase1 } from "./phases/phase1-rules";
import { buildDiff } from "./phases/diff";
import { buildFullPrompt, getCreativity } from "./phases/phase2-llm";
import type { HumanifierResult, IntensityLevel, Phase1Stats } from "./types";

/**
 * Phase 1 only: synchronous rule-based cleanup.
 * Returns the cleaned text + stats, and a pre-built prompt for the LLM phase.
 */
export function humanifyPhase1(text: string, intensity: IntensityLevel) {
  const p1 = runPhase1(text, intensity);

  const totalChanges = p1.stats.phrasesReplaced + p1.stats.buzzwordsReplaced + p1.stats.contractionsApplied;

  // If Phase 1 made zero changes and text is unchanged, it's already human
  const alreadyHuman = totalChanges === 0 && p1.text === text;

  // Build the prompt from the *phase1-cleaned* text, not the original
  const prompt = buildFullPrompt(p1.text, intensity, p1.stats);
  const creativity = getCreativity(intensity);

  return {
    phase1Text: p1.text,
    stats: p1.stats,
    alreadyHuman,
    prompt,
    creativity,
  };
}

/**
 * Build the final result from original text + LLM output + Phase 1 stats.
 */
export function humanifyFinalize(original: string, llmOutput: string, phase1Stats: Phase1Stats): HumanifierResult {
  const changes = buildDiff(original, llmOutput);

  return {
    original,
    final: llmOutput,
    changes,
    stats: {
      phase1: phase1Stats,
    },
  };
}

export type { HumanifierResult, IntensityLevel, Change } from "./types";
