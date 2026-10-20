import {
  MAX_WORD_SENSES,
  PART_OF_SPEECH_VALUES,
  REGISTER_VALUES,
  TextResponse,
  TextResponseJsonSchema,
  TextResponseSchema,
  WordResponse,
  WordResponseJsonSchema,
  WordResponseSchema,
  WordSense,
} from "./types";
import { asJsonStringLiteral, normalizeWordInput, normalizeTextInput } from "./input";
import { providerError } from "./providerError";
import type { LanguagePair } from "./languages";
import { jsonTransportFor } from "./providers";
import type { ProviderConfig } from "./providers/types";

/**
 * Ask the configured provider for JSON matching `schema` and validate it with
 * the shared Zod schema. Malformed or off-schema output is the provider
 * misbehaving, so it is `invalid-response`, not an outcome.
 */
async function requestJson<T>(
  config: ProviderConfig,
  prompt: string,
  jsonSchema: Record<string, unknown>,
  parse: (value: unknown) => T,
  signal: AbortSignal | undefined,
): Promise<T> {
  const cleaned = await jsonTransportFor(config.provider)(config, { prompt, schema: jsonSchema, signal });
  try {
    return parse(JSON.parse(cleaned));
  } catch {
    throw providerError({
      domain: "infrastructure",
      kind: "invalid-response",
      surface: "translate",
      provider: config.provider,
    });
  }
}

/** Same translation + part of speech = same sense, regardless of example wording. */
function senseIdentityKey(s: WordSense): string {
  return [s.translation.trim().toLowerCase(), s.partOfSpeech.trim().toLowerCase()].join("\u0001");
}

function dedupeSenses(senses: WordSense[]): WordSense[] {
  const seen = new Set<string>();
  const out: WordSense[] = [];
  for (const sense of senses) {
    const key = senseIdentityKey(sense);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sense);
  }
  return out;
}

function buildWordPrompt(normalizedWord: string, languagePair: LanguagePair): string {
  const { source, target } = languagePair;
  const partsOfSpeech = PART_OF_SPEECH_VALUES.map((value) => `"${value}"`).join(", ");
  const registers = REGISTER_VALUES.map((value) => `"${value}"`).join(", ");
  return `Translate the ${source.name} vocabulary item ${asJsonStringLiteral(normalizedWord)} to ${target.name}.
The vocabulary item may be a single word, a phrasal verb (e.g. "give up", "break down"), or an idiom / fixed expression (e.g. "red herring", "kick the bucket").

CRITICAL RULES:
1. If the input is a misspelling or typo of a REAL word or expression, correct it and translate the corrected form. Put the corrected form in "correctedWord". This applies to phrases too — e.g. "red hering" → "red herring", "kik the bucket" → "kick the bucket", "runing" → "running". Prefer correction over rejection whenever a plausible correction exists.
2. Only if NO plausible correction exists and the input is truly gibberish / random letters / not in any dictionary or idiom reference, respond with: { "senses": [], "notAWord": true }
3. For phrasal verbs and idioms, translate the IDIOMATIC meaning, NOT the literal word-by-word meaning. For example, "red herring" means a misleading clue (Ukrainian: "оманлива підказка"), NOT "червоний оселедець". "Kick the bucket" means to die, NOT to literally kick a bucket.
4. The "partOfSpeech" field MUST be one of: ${partsOfSpeech}. Use "phrasal verb", "idiom", or "expression" for multi-word vocabulary items; "expression" is a catch-all for borderline cases. Never invent a label outside this list.
5. The "exampleTranslation" (${source.name} sentence) MUST contain the EXACT phrase ${asJsonStringLiteral(normalizedWord)} (or the corrected form if misspelled) as a contiguous substring. NEVER substitute it with a synonym or paraphrase. For example, if the input is "red herring", write "That clue turned out to be a red herring." — NOT "That clue turned out to be misleading."
6. The "example" (${target.name} sentence) must be a natural idiomatic translation of the exampleTranslation.
7. Target-language purity: every word in "translation" and "example" must be standard ${target.name} as used by educated native speakers, in standard ${target.name} orthography and morphology. Do NOT substitute words from a related or neighbouring language, and do NOT use calques, hybrid forms, or russisms / anglicisms / other foreign-influenced shapes built on a ${target.name} stem with a foreign affix when a native ${target.name} word exists. Established loanwords that are part of the standard ${target.name} lexicon are fine; the rule forbids substitutions and contaminations from other languages, not legitimate borrowings.
8. "transcription" is the pronunciation of the ${source.name} item as a learner's dictionary of ${source.name} would print it, using whatever system that language conventionally uses (IPA for English, French or German; Pinyin with tone marks for Mandarin; romaji for Japanese). Write the symbols only, with NO surrounding slashes or brackets. Give the transcription for THIS part of speech — English "record" is a different transcription as a noun than as a verb. OMIT the field entirely for multi-word items and for any ${source.name} where a learner's dictionary would not print one.
9. "forms" lists the key inflected forms of the ${source.name} item for this part of speech, already labelled and comma-separated, as a dictionary headword line would abbreviate them (e.g. "pl. raptures", "past ran, pp. run", "comp. better, sup. best"). Give only the forms a learner needs, never a full paradigm — for heavily inflected ${source.name} give the two or three most useful. OMIT the field entirely when the item does not inflect.
10. "register" is a usage label for THIS sense, one of: ${registers}. OMIT the field entirely when the sense is neutral, everyday language — most senses have no register label.

Provide up to 5 distinct meanings (senses), ordered from most common first.
Each sense MUST have a different translation or a different part of speech — do NOT repeat the same translation+partOfSpeech pair.
If there is only one meaning, return exactly one sense.
Respond ONLY with valid JSON:
{
  "senses": [
    {
      "translation": "${target.name} gloss for this sense",
      "partOfSpeech": "one of the allowed labels listed above",
      "example": "${target.name} example sentence",
      "exampleTranslation": "${source.name} sentence that MUST contain ${asJsonStringLiteral(normalizedWord)} verbatim",
      "transcription": "include ONLY when applicable; symbols only, no slashes",
      "forms": "include ONLY when the item inflects",
      "register": "include ONLY when the sense is not neutral"
    }
  ],
  "correctedWord": "include ONLY if the input was misspelled; omit if correct"
}`;
}

/**
 * Low-level translate-word call. Returns the provider's parsed response before
 * production notAWord routing and sense de-duplication.
 */
async function translateWordRaw(
  word: string,
  config: ProviderConfig,
  languagePair: LanguagePair,
  signal: AbortSignal | undefined,
): Promise<WordResponse> {
  const normalizedWord = normalizeWordInput(word);
  if (!normalizedWord) {
    throw providerError({ domain: "outcome", kind: "invalid-word-input", surface: "translate" });
  }

  const prompt = buildWordPrompt(normalizedWord, languagePair);
  return requestJson(config, prompt, WordResponseJsonSchema, (v) => WordResponseSchema.parse(v), signal);
}

export async function translateWord(
  word: string,
  config: ProviderConfig,
  languagePair: LanguagePair,
  signal: AbortSignal | undefined,
): Promise<WordResponse> {
  const parsed = await translateWordRaw(word, config, languagePair, signal);

  if (parsed.notAWord) {
    throw providerError({ domain: "outcome", kind: "word-not-found", surface: "translate" });
  }
  if (parsed.senses.length === 0) {
    throw providerError({
      domain: "infrastructure",
      kind: "invalid-response",
      surface: "translate",
      provider: config.provider,
    });
  }

  return { ...parsed, senses: dedupeSenses(parsed.senses).slice(0, MAX_WORD_SENSES) };
}

// --- In-source tests for private functions ---
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("buildWordPrompt", () => {
    const enUk: LanguagePair = {
      source: { code: "en", name: "English" },
      target: { code: "uk", name: "Ukrainian" },
    };

    it("includes a target-language-purity rule that names the target language", () => {
      const prompt = buildWordPrompt("cat", enUk);
      expect(prompt).toMatch(/Target-language purity/);
      expect(prompt).toMatch(/standard Ukrainian as used by educated native speakers/);
      expect(prompt).toMatch(/standard Ukrainian orthography and morphology/);
    });

    it("forbids substitutions, calques, and hybrid foreign-influenced forms", () => {
      const prompt = buildWordPrompt("cat", enUk);
      expect(prompt).toMatch(/related or neighbouring language/);
      expect(prompt).toMatch(/calques/);
      expect(prompt).toMatch(/hybrid forms/);
      expect(prompt).toMatch(/russisms \/ anglicisms/);
    });

    it("still permits established loanwords so legitimate borrowings are not suppressed", () => {
      const prompt = buildWordPrompt("cat", enUk);
      expect(prompt).toMatch(/Established loanwords/);
      expect(prompt).toMatch(/legitimate borrowings/);
    });

    it("parameterizes the purity rule by the target language (not hardcoded to Ukrainian)", () => {
      const enPt: LanguagePair = {
        source: { code: "en", name: "English" },
        target: { code: "pt", name: "Portuguese" },
      };
      const prompt = buildWordPrompt("cat", enPt);
      expect(prompt).toMatch(/standard Portuguese as used by educated native speakers/);
      expect(prompt).toMatch(/standard Portuguese orthography and morphology/);
      expect(prompt).not.toMatch(/standard Ukrainian/);
    });

    it("embeds the user-provided word as a JSON-encoded literal (security: no raw concatenation)", () => {
      const prompt = buildWordPrompt('foo"bar', enUk);
      expect(prompt).toContain('"foo\\"bar"');
      expect(prompt).not.toContain('foo"bar to ');
    });

    it("preserves prior CRITICAL RULES (1-6) so the existing tests' invariants still hold", () => {
      const prompt = buildWordPrompt("cat", enUk);
      expect(prompt).toMatch(/CRITICAL RULES:/);
      expect(prompt).toMatch(/^1\. If the input is a misspelling/m);
      expect(prompt).toMatch(/^6\. The "example"/m);
      expect(prompt).toMatch(/^7\. Target-language purity:/m);
    });
  });
}

export async function translateText(
  text: string,
  config: ProviderConfig,
  languagePair: LanguagePair,
  signal: AbortSignal | undefined,
): Promise<TextResponse> {
  const normalizedText = normalizeTextInput(text);
  if (!normalizedText) {
    throw providerError({ domain: "outcome", kind: "invalid-text-input", surface: "translate" });
  }

  const { source, target } = languagePair;

  const prompt = `Translate the following ${source.name} text to ${target.name}.
Respond ONLY with valid JSON:
{ "translation": "..." }

Text: ${asJsonStringLiteral(normalizedText)}`;

  return requestJson(config, prompt, TextResponseJsonSchema, (v) => TextResponseSchema.parse(v), signal);
}
