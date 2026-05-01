import type { IntensityLevel, Phase1Stats } from "../types";

// ── Prompt construction ─────────────────────────────────────────────────────

export function buildSystemPrompt(intensity: IntensityLevel, phase1Stats?: Phase1Stats): string {
  let prompt = `Rewrite to sound human-written. No em-dashes, no buzzwords, use contractions, vary sentence length. Output only the rewritten text.

${intensity}: ${
    intensity === "clean"
      ? "fix only the worst AI-isms, keep it professional"
      : intensity === "rewrite"
        ? "restructure sentences, casual but competent"
        : "very short sentences, direct, terse, no fluff"
  }`;

  if (phase1Stats) {
    const parts: string[] = [];
    if (phase1Stats.phrasesReplaced) parts.push(`${phase1Stats.phrasesReplaced} phrases replaced`);
    if (phase1Stats.buzzwordsReplaced) parts.push(`${phase1Stats.buzzwordsReplaced} buzzwords removed`);
    if (phase1Stats.contractionsApplied) parts.push(`${phase1Stats.contractionsApplied} contractions applied`);
    if (parts.length > 0) {
      prompt += `\n\nPre-processing already fixed: ${parts.join(", ")}. Focus on sentence structure and tone.`;
    }
  }

  return prompt;
}

export function getCreativity(intensity: IntensityLevel): number {
  return intensity === "clean" ? 0.2 : intensity === "rewrite" ? 0.8 : 0.5;
}

/**
 * Build the full prompt to send to Raycast AI.
 * Combines system instructions + user text into a single prompt string.
 */
export function buildFullPrompt(text: string, intensity: IntensityLevel, phase1Stats?: Phase1Stats): string {
  const system = buildSystemPrompt(intensity, phase1Stats);
  return `${system}\n\n---\n\n${text}`;
}
