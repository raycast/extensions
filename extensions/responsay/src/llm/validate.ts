import type { ProsodyAnalysis, Word } from "../types";

/** Reduce to lowercase alphanumerics so word/letter checks ignore case,
 * punctuation, apostrophes, and spacing differences. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const MAX_SYLLABLE_VIOLATIONS = 5;

/**
 * Content-level sanity checks the JSON schema cannot express — the guardrail
 * against "乱分析". Catches the model dropping/adding/altering words, faking
 * syllable splits, rewriting the user's sentence, or emitting malformed IPA.
 *
 * Returns human-readable violations (empty array = clean), worded so they can
 * be fed straight back to the model as a repair instruction.
 */
export function validateAnalysis(
  analysis: ProsodyAnalysis,
  input: string,
): string[] {
  const violations: string[] = [];
  const words: Word[] = analysis.thoughtGroups.flatMap((g) => g.words);

  // The annotated words must reconstruct the sentence the model says it analyzed.
  if (norm(words.map((w) => w.text).join("")) !== norm(analysis.text)) {
    violations.push(
      `the annotated words do not add up to the sentence "${analysis.text}"`,
    );
  }

  // For real (non-generated) input, the model must analyze the EXACT sentence
  // given — no silent rewriting, "correcting", reordering, or translating.
  if (!analysis.isGeneratedExample && norm(analysis.text) !== norm(input)) {
    violations.push(
      `analyze the user's exact sentence "${input}" without changing any word`,
    );
  }

  // Each word's syllables must spell the word when joined (orthographic split,
  // e.g. "finish" -> ["fin","ish"]), not a phonetic rendering.
  let syllableViolations = 0;
  for (const w of words) {
    if (norm(w.syllables.join("")) !== norm(w.text)) {
      if (syllableViolations < MAX_SYLLABLE_VIOLATIONS) {
        violations.push(`the syllables for "${w.text}" must spell the word`);
      }
      syllableViolations++;
    }
  }

  // IPA must be a non-empty whole-sentence transcription wrapped in slashes.
  const ipa = analysis.ipa.trim();
  if (!(ipa.startsWith("/") && ipa.endsWith("/") && ipa.length > 2)) {
    violations.push("the IPA must be the whole sentence wrapped in / /");
  }

  // Prosody needs at least one prominent (stressed) word.
  if (!words.some((w) => w.stressed)) {
    violations.push("mark at least one content word as stressed");
  }

  return violations;
}
