import { getPreferenceValues } from "@raycast/api";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { writeFileSync } from "fs";
import { DEFAULT_VOICE_ID, GEMINI_VOICES, getVoiceById } from "../constants/voices";
import { hashSynthesisRequest, lookupCache, storeCache } from "../utils/audio-cache";
import type {
  GeminiAudioTagMode,
  GeminiExpressiveness,
  GeminiLanguageMode,
  GeminiReadingExperience,
  GeminiSpeakerMode,
  GeminiTTSModel,
  GeminiTTSRequest,
  GeminiTTSResponse,
  SynthesisResult,
  TTSOptions,
  VoiceConfig,
} from "./types";

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
const DEFAULT_MODEL: GeminiTTSModel = "gemini-3.1-flash-tts-preview";
const FALLBACK_MODEL: GeminiTTSModel = "gemini-2.5-flash-preview-tts";
const PRO_MODEL: GeminiTTSModel = "gemini-2.5-pro-preview-tts";
const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_SECONDARY_VOICE_ID = "Puck";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const SYNTHESIS_CANCELLED_CODE = -8;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

// Note on keep-alive: Node's global fetch (undici) already pools and
// reuses TLS sockets for ~4s by default, so chunks fired in quick
// succession share a connection automatically. No explicit Agent is
// needed — earlier code passed `agent:` but undici only honors
// `dispatcher:`, so that field was a no-op.

export async function synthesizeSpeech(
  text: string,
  options: TTSOptions,
  signal?: AbortSignal,
): Promise<SynthesisResult> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text cannot be empty");
  }
  throwIfCancelled(signal);

  const cacheKey = hashSynthesisRequest(trimmedText, options);
  const cachedPath = lookupCache(cacheKey);
  if (cachedPath) {
    return { wavPath: cachedPath, managed: false, cacheHit: true };
  }
  throwIfCancelled(signal);

  const apiKey = resolveApiKey();
  const requestBody: GeminiTTSRequest = {
    // The TTS preview models reject `systemInstruction` with a 400
    // "Developer instruction is not enabled for this model". Keep the
    // entire prompt — director profile, scene, director's notes, and
    // transcript — inline in `contents` so the request shape matches
    // what these preview models actually accept.
    contents: [{ parts: [{ text: buildTtsPrompt(trimmedText, options) }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: buildSpeechConfig(trimmedText, options),
    },
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const wavBuffer = await generateSpeechOnce(apiKey, options.model, requestBody, options.sampleRate, signal);
      const cachedWritePath = storeCache(cacheKey, wavBuffer);
      if (cachedWritePath) {
        return { wavPath: cachedWritePath, managed: false, cacheHit: false };
      }
      const fallbackPath = join(tmpdir(), `gemini-tts-${randomUUID()}.wav`);
      writeFileSync(fallbackPath, new Uint8Array(wavBuffer));
      return { wavPath: fallbackPath, managed: true, cacheHit: false };
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === MAX_ATTEMPTS) {
        break;
      }
      await delay(250 * attempt * attempt, signal);
    }
  }

  throw lastError;
}

export async function listVoices(): Promise<VoiceConfig[]> {
  return GEMINI_VOICES;
}

export function buildOptionsFromPrefs(voiceOverride?: string): TTSOptions {
  const prefs = getPreferenceValues<Preferences>();
  const voiceId = parseVoiceId(voiceOverride || prefs.defaultVoice);

  return {
    voiceId,
    model: parseModel(prefs.model),
    languageMode: parseLanguageMode(prefs.languageMode),
    readingExperience: parseReadingExperience(prefs.readingExperience),
    expressiveness: parseExpressiveness(prefs.expressiveness),
    audioTagMode: parseAudioTagMode(prefs.audioTagMode),
    speakerMode: parseSpeakerMode(prefs.speakerMode),
    secondaryVoiceId: parseVoiceId(prefs.secondaryVoiceId, DEFAULT_SECONDARY_VOICE_ID),
    speed: parseSpeechRate(prefs.speechRate),
    directorNotes: prefs.directorNotes?.trim() || "",
    sampleRate: DEFAULT_SAMPLE_RATE,
  };
}

export function resolveOptionsForText(options: TTSOptions, text: string): TTSOptions {
  return {
    ...options,
    readingExperience: resolveReadingExperienceForText(text, options.readingExperience),
  };
}

export function isSupportedModel(model: string): model is GeminiTTSModel {
  return model === DEFAULT_MODEL || model === FALLBACK_MODEL || model === PRO_MODEL;
}

export function isSynthesisCancelled(error: unknown): boolean {
  return error instanceof TTSApiError && error.code === SYNTHESIS_CANCELLED_CODE;
}

async function generateSpeechOnce(
  apiKey: string,
  model: GeminiTTSModel,
  requestBody: GeminiTTSRequest,
  sampleRate: number,
  externalSignal?: AbortSignal,
): Promise<Buffer> {
  throwIfCancelled(externalSignal);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

  try {
    const response = await fetch(`${BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as GeminiTTSResponse | null;

    if (!response.ok) {
      const message = payload?.error?.message || response.statusText || "Request failed";
      throw new TTSApiError(`HTTP ${response.status}: ${message}`, response.status);
    }

    const blockReason = payload?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new TTSApiError(
        `${payload?.promptFeedback?.blockReasonMessage || "Gemini TTS request was blocked"} (${blockReason})`,
        -7,
      );
    }

    const inlineData = payload?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
    const audioData = inlineData?.data;
    if (!audioData) {
      const returnedText = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
      throw new TTSApiError(returnedText ? "Gemini returned text instead of audio" : "No audio data received", -4);
    }

    const pcmBuffer = Buffer.from(audioData, "base64");
    if (pcmBuffer.length === 0) {
      throw new TTSApiError("Decoded audio data is empty", -4);
    }

    return ensureWaveAudio(pcmBuffer, sampleRate);
  } catch (err) {
    if (externalSignal?.aborted) {
      throw new TTSApiError("Synthesis cancelled", SYNTHESIS_CANCELLED_CODE);
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new TTSApiError("Request timeout after 60 seconds", -2);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

function buildTtsPrompt(text: string, options: TTSOptions): string {
  const readingExperience = resolveReadingExperienceForText(text, options.readingExperience);
  const profile = getExperienceProfile(readingExperience);
  const transcript = prepareTranscript(text, options.audioTagMode);
  const languageInstruction = getLanguageInstruction(options.languageMode);
  const expressiveness = getExpressivenessInstruction(options.expressiveness);
  const audioTagInstruction = getAudioTagInstruction(options.audioTagMode);
  const voiceInstruction = getVoiceInstruction(options.voiceId);
  const speakerInstruction = getSpeakerInstruction(text, options);
  const customNotes = options.directorNotes ? [`Additional notes: ${options.directorNotes}`] : [];

  return [
    "Synthesize speech from the transcript below. Only the text under TRANSCRIPT is spoken. Do not read instructions, labels, section headings, or director notes aloud.",
    `# AUDIO PROFILE: ${profile.name}`,
    profile.profile,
    "## THE SCENE",
    profile.scene,
    "### DIRECTOR'S NOTES",
    `Language: ${languageInstruction}`,
    `Voice fit: ${voiceInstruction}`,
    `Speaker mode: ${speakerInstruction}`,
    `Style: ${profile.style}`,
    `Expressiveness: ${expressiveness}`,
    `Pacing: ${profile.pacing}`,
    `Articulation: ${profile.articulation}`,
    `Audio tags: ${audioTagInstruction}`,
    "Accuracy: Do not translate, summarize, paraphrase, omit, or add words. Preserve citations, names, acronyms, statute numbers, article numbers, and technical terms as written.",
    ...customNotes,
    "#### TRANSCRIPT",
    transcript,
  ].join("\n\n");
}

function buildSpeechConfig(text: string, options: TTSOptions): GeminiTTSRequest["generationConfig"]["speechConfig"] {
  const speakers = options.speakerMode === "auto-two-speaker" ? detectTwoSpeakers(text) : null;
  if (!speakers) {
    return {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: options.voiceId,
        },
      },
    };
  }

  return {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [
        buildSpeakerVoiceConfig(speakers[0], options.voiceId),
        buildSpeakerVoiceConfig(speakers[1], options.secondaryVoiceId),
      ],
    },
  };
}

function buildSpeakerVoiceConfig(speaker: string, voiceName: string) {
  return {
    speaker,
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName,
      },
    },
  };
}

function ensureWaveAudio(audioBuffer: Buffer, sampleRate: number): Buffer {
  if (audioBuffer.subarray(0, 4).toString("ascii") === "RIFF") {
    return audioBuffer;
  }

  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + audioBuffer.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(audioBuffer.length, 40);

  return Buffer.concat([header, audioBuffer]);
}

function resolveApiKey(): string {
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = prefs.geminiApiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("Gemini API Key is required. Configure it in extension preferences.", -1);
  }
  return apiKey;
}

function parseModel(model: string | undefined): GeminiTTSModel {
  return model && isSupportedModel(model) ? model : DEFAULT_MODEL;
}

function parseVoiceId(voiceId: string | undefined, fallback = DEFAULT_VOICE_ID): string {
  const trimmed = voiceId?.trim();
  return trimmed && getVoiceById(trimmed) ? trimmed : fallback;
}

function parseSpeakerMode(speakerMode: string | undefined): GeminiSpeakerMode {
  return speakerMode === "auto-two-speaker" ? "auto-two-speaker" : "single";
}

function parseLanguageMode(languageMode: string | undefined): GeminiLanguageMode {
  switch (languageMode) {
    case "cmn":
    case "en":
    case "mixed-cmn-en":
      return languageMode;
    default:
      return "auto";
  }
}

function parseReadingExperience(readingExperience: string | undefined): GeminiReadingExperience {
  switch (readingExperience) {
    case "auto":
    case "legal-text":
    case "mandarin-lecture":
    case "english-paper":
    case "news-briefing":
    case "audiobook":
    case "neutral":
      return readingExperience;
    case "legal-scholar":
      return "legal-text";
    default:
      return "academic-bilingual";
  }
}

function parseExpressiveness(expressiveness: string | undefined): GeminiExpressiveness {
  switch (expressiveness) {
    case "subtle":
    case "expressive":
      return expressiveness;
    default:
      return "balanced";
  }
}

function parseAudioTagMode(audioTagMode: string | undefined): GeminiAudioTagMode {
  switch (audioTagMode) {
    case "preserve":
    case "paragraph-pauses":
    case "smart-pauses":
      return audioTagMode;
    default:
      return "off";
  }
}

function parseSpeechRate(rawRate: string | undefined): number {
  const parsed = Number(rawRate ?? "1");
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0.5, Math.min(2, parsed));
}

interface ExperienceProfile {
  name: string;
  profile: string;
  scene: string;
  style: string;
  pacing: string;
  articulation: string;
}

type ResolvedReadingExperience = Exclude<GeminiReadingExperience, "auto">;

function getExperienceProfile(readingExperience: ResolvedReadingExperience): ExperienceProfile {
  switch (readingExperience) {
    case "legal-text":
      return {
        name: "Legal Text Mode",
        profile: "A precise reader for professional legal text, statutes, cases, citations, and doctrinal prose.",
        scene:
          "A quiet law library reading desk. The listener is reviewing material carefully and needs retention, not entertainment.",
        style:
          "Calm, exacting, and intellectually steady. Serious without sounding stiff. The performance should feel like careful reading of professional legal material.",
        pacing:
          "Moderate and deliberate. Pause slightly around headings, quoted passages, enumerated lists, article numbers, case names, and citations.",
        articulation:
          "Crisp pronunciation for legal terms, jurisdiction names, citations, section numbers, acronyms, dates, and article references. Keep Latin and English legal terms intelligible.",
      };
    case "mandarin-lecture":
      return {
        name: "The Mandarin Lecture Reader",
        profile: "A standard Mandarin lecturer for academic notes, essays, and long-form Chinese prose.",
        scene: "A focused seminar room where the listener is following complex ideas for study.",
        style: "Natural standard Mandarin, warm but controlled, with a gentle lecturer cadence.",
        pacing: "Steady and slightly spacious. Let clauses breathe so argument structure is easy to follow.",
        articulation:
          "Clear Mandarin pronunciation, with embedded English names and technical terms kept in natural English when appropriate.",
      };
    case "english-paper":
      return {
        name: "The English Paper Reader",
        profile: "A clear academic reader for English papers, reports, and technical material.",
        scene: "A quiet study session where the listener is scanning for argument, evidence, and structure.",
        style: "Clear, analytical, and composed. Avoid drama; emphasize logical progression and contrast.",
        pacing: "Moderate. Slightly slow down for definitions, citations, quoted text, and lists.",
        articulation: "Precise pronunciation for author names, technical terms, acronyms, citations, and numbers.",
      };
    case "news-briefing":
      return {
        name: "The Briefing Anchor",
        profile: "A concise briefing reader for updates, newsletters, and policy notes.",
        scene: "A morning briefing desk with clean delivery and forward motion.",
        style: "Professional, alert, and concise. Energetic enough to keep attention, but not theatrical.",
        pacing: "Brisk but intelligible. Pause at paragraph breaks and topic changes.",
        articulation: "Clear articulation for names, institutions, dates, figures, and quoted statements.",
      };
    case "audiobook":
      return {
        name: "The Longform Narrator",
        profile: "A patient longform narrator for essays, books, and reflective prose.",
        scene: "A quiet listening environment for sustained attention.",
        style: "Warm, immersive, and smooth, with tasteful emotional contour.",
        pacing: "Unhurried and natural. Let paragraph transitions breathe.",
        articulation: "Preserve textual detail while maintaining a comfortable long-listening cadence.",
      };
    case "neutral":
      return {
        name: "The Neutral Reader",
        profile: "A direct reader focused on accurate recitation.",
        scene: "A simple text-to-speech reading task.",
        style: "Neutral, clear, and unobtrusive.",
        pacing: "Steady and natural.",
        articulation: "Pronounce words clearly and preserve the transcript as written.",
      };
    default:
      return {
        name: "The Bilingual Academic Reader",
        profile:
          "A focused academic reader for Chinese-English scholarship, legal research, citations, and technical prose.",
        scene:
          "A quiet desk in a research workflow. The listener is reading papers and legal materials through audio while staying attentive to structure and terminology.",
        style:
          "Calm, scholarly, and precise. Natural enough for long listening, but crisp enough for citations, arguments, and terminology.",
        pacing:
          "Moderate and structured. Pause at paragraph breaks, headings, enumeration markers, and transitions between Chinese and English.",
        articulation:
          "Use standard Mandarin for Chinese, natural English for English, and clean pronunciation for citations, acronyms, proper nouns, legal terms, and technical terms.",
      };
  }
}

function getExpressivenessInstruction(expressiveness: GeminiExpressiveness): string {
  switch (expressiveness) {
    case "subtle":
      return "Subtle. Keep delivery restrained, accurate, and low-fatigue for long listening.";
    case "expressive":
      return "Expressive. Add tasteful emphasis, contrast, and vocal contour while preserving accuracy.";
    default:
      return "Balanced. Use natural emphasis and variation without becoming theatrical.";
  }
}

function getAudioTagInstruction(audioTagMode: GeminiAudioTagMode): string {
  switch (audioTagMode) {
    case "preserve":
      return "If the transcript contains clear English performance tags such as [short pause], [serious], or [slowly], treat them as delivery cues. Read bracketed citations and legal references normally.";
    case "paragraph-pauses":
      return "Treat inserted [short pause] markers as brief pauses between paragraphs. Read bracketed citations and legal references normally.";
    case "smart-pauses":
      return "Treat inserted English audio tags such as [short pause] as delivery cues, not spoken words. Keep bracketed citations, footnote markers, and legal references as normal content.";
    default:
      return "Do not infer performance tags from bracketed citations. Read bracketed numbers, legal references, and source markers as content.";
  }
}

function prepareTranscript(text: string, audioTagMode: GeminiAudioTagMode): string {
  if (audioTagMode !== "paragraph-pauses" && audioTagMode !== "smart-pauses") {
    return text;
  }

  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    return text;
  }

  return paragraphs.join("\n\n[short pause]\n\n");
}

function resolveReadingExperienceForText(
  text: string,
  readingExperience: GeminiReadingExperience,
): ResolvedReadingExperience {
  if (readingExperience !== "auto") {
    return readingExperience;
  }

  const legalScore = scoreLegalText(text);
  if (legalScore >= 2) {
    return "legal-text";
  }

  const languageMix = analyzeLanguageMix(text);
  if (languageMix.englishRatio >= 0.7 && languageMix.chineseRatio < 0.08) {
    return "english-paper";
  }

  if (languageMix.chineseRatio >= 0.25 && languageMix.englishRatio < 0.12) {
    return "mandarin-lecture";
  }

  return "academic-bilingual";
}

function scoreLegalText(text: string): number {
  const checks = [
    /第[一二三四五六七八九十百千万零〇\d]+条/u,
    /《[^》]{2,40}(法|条例|规定|解释|办法)》/u,
    /(法院|判决|裁定|法条|宪法|民法典|刑法|行政法|司法解释|裁判|判例|案例|CLSCI|法学)/iu,
    /\b(Article|Section|Statute|Regulation|Directive|Court|Judgment|Act|Code|Constitution)\b/iu,
    /\b(v\.|F\.\d+d|S\. ?Ct\.|U\.S\.|CJEU|ECtHR)\b/u,
  ];

  return checks.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function analyzeLanguageMix(text: string): { chineseRatio: number; englishRatio: number } {
  const chars = Array.from(text);
  const meaningful = chars.filter((char) => /[\p{Script=Han}A-Za-z]/u.test(char));
  if (meaningful.length === 0) {
    return { chineseRatio: 0, englishRatio: 0 };
  }

  const chinese = meaningful.filter((char) => /\p{Script=Han}/u.test(char)).length;
  const english = meaningful.filter((char) => /[A-Za-z]/.test(char)).length;

  return {
    chineseRatio: chinese / meaningful.length,
    englishRatio: english / meaningful.length,
  };
}

function getVoiceInstruction(voiceId: string): string {
  const voice = getVoiceById(voiceId);
  const descriptor = voice?.description ? ` Its public descriptor is "${voice.description}".` : "";
  return `Use the selected Gemini prebuilt voice "${voiceId}" naturally.${descriptor} Keep the director notes aligned with this voice instead of forcing an incompatible character, age, or emotional register.`;
}

function getSpeakerInstruction(text: string, options: TTSOptions): string {
  if (options.speakerMode !== "auto-two-speaker") {
    return "Single speaker narration.";
  }

  const speakers = detectTwoSpeakers(text);
  if (!speakers) {
    return "Single speaker narration. Auto two-speaker mode is enabled, but this transcript does not contain exactly two clear speaker labels.";
  }

  return `Two-speaker dialogue. Treat "${speakers[0]}:" and "${speakers[1]}:" as speaker-turn labels, not narration to read aloud. "${speakers[0]}" uses Gemini voice "${options.voiceId}" and "${speakers[1]}" uses Gemini voice "${options.secondaryVoiceId}".`;
}

function detectTwoSpeakers(text: string): [string, string] | null {
  const speakers: string[] = [];
  for (const line of text.split(/\n+/).slice(0, 200)) {
    const match = line.match(/^\s*([\p{L}\p{N}_ .'\-·]{1,32}|[甲乙丙丁戊己庚辛壬癸])\s*[:：]/u);
    const speaker = match?.[1]?.trim().replace(/\s+/g, " ");
    if (!speaker) continue;
    if (!speakers.includes(speaker)) {
      speakers.push(speaker);
    }
    if (speakers.length > 2) {
      return null;
    }
  }

  return speakers.length === 2 ? [speakers[0], speakers[1]] : null;
}

function getLanguageInstruction(languageMode: GeminiLanguageMode): string {
  switch (languageMode) {
    case "cmn":
      return "Read primarily in Mandarin Chinese (BCP-47 cmn). Use a natural, standard Mandarin delivery. Preserve embedded English terms as English when they appear.";
    case "en":
      return "Read primarily in English. Preserve non-English names, citations, and quoted phrases as written.";
    case "mixed-cmn-en":
      return "Use natural Mandarin Chinese for Chinese text and natural English for English text. Preserve code-switching, citations, names, and technical terms without translation.";
    default:
      return "Automatically detect the transcript language. Preserve mixed-language text naturally and do not translate.";
  }
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof TTSApiError) {
    return error.code === -4 || RETRYABLE_STATUS_CODES.has(error.code);
  }
  // Transient fetch failures (DNS hiccups, ECONNRESET, dropped TLS, etc.)
  // surface as plain Error/TypeError from undici. Retry those too — a
  // long reading session would otherwise abort on a single packet loss.
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && NETWORK_ERROR_CODES.has(code)) return true;
    if (error.name === "TypeError" && /fetch failed|network/i.test(error.message)) return true;
    const cause = (error as { cause?: unknown }).cause;
    if (cause && typeof cause === "object") {
      const causeCode = (cause as NodeJS.ErrnoException).code;
      if (causeCode && NETWORK_ERROR_CODES.has(causeCode)) return true;
    }
  }
  return false;
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new TTSApiError("Synthesis cancelled", SYNTHESIS_CANCELLED_CODE);
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfCancelled(signal);
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timeoutId);
      reject(new TTSApiError("Synthesis cancelled", SYNTHESIS_CANCELLED_CODE));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export class TTSApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}
