import { ProsodyAnalysisSchema, type ProsodyAnalysis } from "../types";

export interface PromptOptions {
  isWord: boolean;
  accent: "GA";
}

const SCHEMA_HINT = `Output format:
Return ONLY a JSON object (no markdown fences) with this exact shape:
{
  "text": string,                 // the sentence analyzed
  "isGeneratedExample": boolean,
  "sourceWord"?: string,
  "ipa": string,                  // whole-sentence IPA, General American, wrapped in / /
  "thoughtGroups": [              // short, natural speech groups for shadowing practice
    { "tone": "fall"|"rise"|"fall-rise"|"rise-fall"|"level",
      "words": [
        { "text": string,
          "syllables": string[],          // e.g. ["fin","ish"]
          "stressIndex": number|null,     // index of the lexically stressed syllable; null for reduced function words
          "stressed": boolean,            // sentence prominence: true for content words, false for reduced function words
          "nuclear": boolean,             // the tonic/nuclear word of its thought group (carries the tone); must be stressed
          "ipa"?: string,
          "linkToNext"?: "liaison"|"elision"|"intrusion"|null
        }
      ]
    }
  ],
  "notes"?: string                // ONE short coaching tip
}`;

const FIDELITY_RULES = `Accuracy requirements:
- Analyze ONLY the exact words given, in their original order. Never add, drop, reorder, translate, or "fix" a word, even if it looks misspelled.
- Each word's "syllables" must spell that word exactly when concatenated (orthographic split, e.g. "finish" -> ["fin","ish"]). Do NOT put phonetic spellings in "syllables".
- Set "stressIndex" to the primary-stress syllable for that word per a standard General American dictionary; use null only for reduced function words.
- "ipa" is the whole sentence in General American IPA, wrapped in / /, using ˈ for primary and ˌ for secondary stress.
- Base stress and intonation on standard General American usage, not guesses. If a proper noun is uncertain, give your best standard approximation but keep the syllables faithful to the spelling.`;

const VALIDATION_GATE = `SkillOpt-style validation gate:
Treat this prompt as a reusable skill artifact. Before final output, internally check the candidate JSON against these gates and repair it once if any gate fails:
- Schema gate: output is exactly one JSON object matching the requested shape, with no prose or markdown fences.
- Fidelity gate: the analyzed words exactly match the input words in order, unless a single selected word intentionally generated an example sentence.
- Syllable gate: concatenating every syllables array reproduces that word's spelling.
- Prosody gate: every thought group has exactly one nuclear word, and every nuclear word is stressed.
- Stress gate: stressed=true requires a non-null valid stressIndex; reduced function words may use null.
- Speakability gate: notes give one concrete coaching tip a learner can apply while speaking.`;

const OUTPUT_USE = `Output use:
The JSON drives a pronunciation-practice UI and text-to-speech shadowing flow.
Use short, natural thought groups that a learner can repeat aloud; do not split mechanically or create document-style labels in learner-facing notes.`;

const EXAMPLE_OUTPUT = `Example:
For input "I'll call you.", return exactly:
{"text":"I'll call you.","isGeneratedExample":false,"ipa":"/aɪl ˈkɔl ju/","thoughtGroups":[{"tone":"fall","words":[{"text":"I'll","syllables":["I'll"],"stressIndex":null,"stressed":false,"nuclear":false},{"text":"call","syllables":["call"],"stressIndex":0,"stressed":true,"nuclear":true},{"text":"you","syllables":["you"],"stressIndex":null,"stressed":false,"nuclear":false}]}]}`;

export function buildPrompt(
  text: string,
  opts: PromptOptions,
): { system: string; user: string } {
  const system = [
    "Role:\nYou are an expert English pronunciation coach specializing in General American prosody.",
    "Task:\nAnalyze the given English text for word stress, sentence stress, intonation (rising/falling tones per thought group), rhythm, and connected-speech linking so the learner can practice it aloud.",
    [
      "Prosody rules:",
      "- Content words (nouns, main verbs, adjectives, adverbs, wh-words) are usually stressed.",
      "- Function words (articles, prepositions, auxiliaries, pronouns) are usually reduced.",
      "- Use short, natural thought groups at real speech or breath boundaries.",
      "- Each thought group has exactly one nuclear word, normally its last content word.",
      "- The nuclear word must be marked stressed.",
      "- stressIndex must be a valid index into that word's syllables array.",
      "- Use General American IPA.",
    ].join("\n"),
    FIDELITY_RULES,
    OUTPUT_USE,
    VALIDATION_GATE,
    SCHEMA_HINT,
    EXAMPLE_OUTPUT,
  ].join("\n\n");

  const user = opts.isWord
    ? [
        `Input: The user selected a single word: "${text}".`,
        `Task: Set isGeneratedExample=true, sourceWord="${text}", generate ONE natural example sentence using it, put that sentence in "text", and analyze that sentence.`,
      ].join("\n")
    : [
        `Input: "${text}".`,
        "Task: Analyze this text. Set isGeneratedExample=false.",
      ].join("\n");

  return { system, user };
}

export function parseAnalysis(raw: string): ProsodyAnalysis {
  const cleaned = extractJsonObject(raw);
  const json = JSON.parse(cleaned);
  return ProsodyAnalysisSchema.parse(json);
}

function extractJsonObject(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (stripped.startsWith("{") && stripped.endsWith("}")) {
    return stripped;
  }

  const start = stripped.indexOf("{");
  if (start === -1) return stripped;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < stripped.length; i++) {
    const char = stripped[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }

  return stripped;
}
