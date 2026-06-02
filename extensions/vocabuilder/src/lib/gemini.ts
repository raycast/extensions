import {
  GeminiApiResponseSchema,
  GeminiWordResponse,
  GeminiWordResponseJsonSchema,
  GeminiWordResponseSchema,
  GeminiTextResponse,
  GeminiTextResponseJsonSchema,
  GeminiTextResponseSchema,
  PART_OF_SPEECH_VALUES,
  WordSense,
} from "./types";
import { asJsonStringLiteral, normalizeWordInput, normalizeTextInput } from "./input";
import { geminiError, geminiErrorLogFields, isGeminiError, isTransient } from "./geminiError";
import { throwForHttpError } from "./geminiHttp";
import type { LanguagePair } from "./languages";
import { createLogger } from "./logger";
import { BASE_URL, BASE_RETRY_DELAY_MS, MAX_RETRY_ATTEMPTS } from "./gemini-config";

const log = createLogger("gemini");

export type GenerationOptions = {
  model: string;
  temperature?: number;
};

type GeminiCallOptions = GenerationOptions & {
  responseJsonSchema?: Record<string, unknown>;
};

/** Exponential backoff with full jitter. attempt is 1-based. */
function getRetryDelayMs(attempt: number): number {
  const ceiling = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
  return Math.floor(Math.random() * ceiling);
}

/**
 * Sleep that resolves early if the signal aborts. Throws the abort reason
 * (matching fetch's behavior) when the signal fires during the wait.
 */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchGeminiOnce(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
  model: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw geminiError({ domain: "infrastructure", kind: "network-offline", surface: "translate" });
    }
    throw err;
  }

  await throwForHttpError(response, "translate", model);
  return response;
}

async function callGemini(
  prompt: string,
  apiKey: string,
  signal: AbortSignal | undefined,
  options: GeminiCallOptions,
): Promise<string> {
  const { model } = options;
  const url = `${BASE_URL}/${model}:generateContent`;

  const generationConfig: Record<string, unknown> = {};
  if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
  if (options.responseJsonSchema !== undefined) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseJsonSchema = options.responseJsonSchema;
  }

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;

  let response: Response | undefined;
  const totalMs = log.timer();
  log.debug("translation request started", {
    model,
    promptChars: prompt.length,
    structuredJson: options.responseJsonSchema !== undefined,
  });

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const attemptMs = log.timer();
    try {
      response = await fetchGeminiOnce(url, apiKey, body, signal, model);
      log.debug("translation attempt succeeded", {
        model,
        attempt,
        attemptMs: attemptMs(),
        status: response.status,
      });
      break;
    } catch (err) {
      const canRetry = attempt < MAX_RETRY_ATTEMPTS && isGeminiError(err) && isTransient(err);
      log.warn(canRetry ? "translation attempt failed; retrying" : "translation attempt failed", {
        model,
        attempt,
        attemptMs: attemptMs(),
        ...geminiErrorLogFields(err),
        willRetry: canRetry,
      });
      if (!canRetry) throw err;
      await abortableSleep(getRetryDelayMs(attempt), signal);
    }
  }

  // Unreachable in practice — the loop either assigns response or throws —
  // but TS narrows better with this guard than with a non-null assertion.
  if (!response) throw geminiError({ domain: "infrastructure", kind: "request-failed", surface: "translate" });

  const apiData = GeminiApiResponseSchema.parse(await response.json());
  const raw = apiData.candidates[0]?.content.parts[0]?.text ?? "";

  if (!raw) {
    throw geminiError({ domain: "infrastructure", kind: "empty-response", surface: "translate" });
  }

  log.debug("translation request completed", { model, totalMs: totalMs(), responseChars: raw.length });

  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
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
      "exampleTranslation": "${source.name} sentence that MUST contain ${asJsonStringLiteral(normalizedWord)} verbatim"
    }
  ],
  "correctedWord": "include ONLY if the input was misspelled; omit if correct"
}`;
}

/**
 * Low-level translate-word Gemini call. Returns Gemini's parsed response before
 * production notAWord routing and sense de-duplication.
 */
async function translateWordRaw(
  word: string,
  apiKey: string,
  languagePair: LanguagePair,
  signal: AbortSignal | undefined,
  options: GenerationOptions,
): Promise<GeminiWordResponse> {
  const normalizedWord = normalizeWordInput(word);
  if (!normalizedWord) {
    throw geminiError({ domain: "outcome", kind: "invalid-word-input", surface: "translate" });
  }

  const prompt = buildWordPrompt(normalizedWord, languagePair);
  const cleaned = await callGemini(prompt, apiKey, signal, {
    ...options,
    responseJsonSchema: GeminiWordResponseJsonSchema,
  });

  try {
    return GeminiWordResponseSchema.parse(JSON.parse(cleaned));
  } catch {
    throw geminiError({ domain: "infrastructure", kind: "invalid-response", surface: "translate" });
  }
}

export async function translateWord(
  word: string,
  apiKey: string,
  languagePair: LanguagePair,
  signal: AbortSignal | undefined,
  options: GenerationOptions,
): Promise<GeminiWordResponse> {
  const parsed = await translateWordRaw(word, apiKey, languagePair, signal, options);

  if (parsed.notAWord) {
    throw geminiError({ domain: "outcome", kind: "word-not-found", surface: "translate" });
  }
  if (parsed.senses.length === 0) {
    throw geminiError({ domain: "infrastructure", kind: "invalid-response", surface: "translate" });
  }

  return { ...parsed, senses: dedupeSenses(parsed.senses) };
}

// --- In-source tests for private functions ---
if (import.meta.vitest) {
  const { describe, it, expect, vi, beforeEach, afterEach } = import.meta.vitest;

  describe("callGemini generationConfig wiring", () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    const fakeApiResponse = {
      candidates: [{ content: { parts: [{ text: "{}" }] } }],
    };

    beforeEach(() => {
      fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify(fakeApiResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("omits generationConfig when no options are passed", async () => {
      await callGemini("hi", "key", undefined, { model: "test-model" });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.generationConfig).toBeUndefined();
    });

    it("includes temperature when supplied", async () => {
      await callGemini("hi", "key", undefined, { model: "test-model", temperature: 0.7 });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.generationConfig).toEqual({ temperature: 0.7 });
    });

    it("includes structured JSON output config when a response schema is supplied", async () => {
      const responseJsonSchema = {
        type: "object",
        properties: { translation: { type: "string" } },
        required: ["translation"],
      };
      await callGemini("hi", "key", undefined, { model: "test-model", responseJsonSchema });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.generationConfig).toEqual({
        responseMimeType: "application/json",
        responseJsonSchema,
      });
    });
  });

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
  apiKey: string,
  languagePair: LanguagePair,
  signal: AbortSignal | undefined,
  options: GenerationOptions,
): Promise<GeminiTextResponse> {
  const normalizedText = normalizeTextInput(text);
  if (!normalizedText) {
    throw geminiError({ domain: "outcome", kind: "invalid-text-input", surface: "translate" });
  }

  const { source, target } = languagePair;

  const prompt = `Translate the following ${source.name} text to ${target.name}.
Respond ONLY with valid JSON:
{ "translation": "..." }

Text: ${asJsonStringLiteral(normalizedText)}`;

  const cleaned = await callGemini(prompt, apiKey, signal, {
    ...options,
    responseJsonSchema: GeminiTextResponseJsonSchema,
  });

  try {
    return GeminiTextResponseSchema.parse(JSON.parse(cleaned));
  } catch {
    throw geminiError({ domain: "infrastructure", kind: "invalid-response", surface: "translate" });
  }
}
