import type {
  OpenAITone,
  OpenAIExpressiveness,
  OpenAIDelivery,
  OpenAIAccentFocus,
  OpenAIStyle,
} from "../api/openai-types";

// gpt-4o-mini-tts is steerable through the `instructions` field (accent, tone,
// emotional range, intonation, delivery — see the OpenAI Speech API docs).
// This module turns those dimensions into discrete, user-selectable options and
// composes them into a single instruction string. The defaults reproduce a
// neutral, restrained, English / German / Chinese academic narration.

export const DEFAULT_TONE: OpenAITone = "neutral";
export const DEFAULT_EXPRESSIVENESS: OpenAIExpressiveness = "restrained";
export const DEFAULT_DELIVERY: OpenAIDelivery = "standard";
export const DEFAULT_ACCENT_FOCUS: OpenAIAccentFocus = "multilingual";

export interface StyleOption<T extends string> {
  value: T;
  label: string;
}

export const TONE_OPTIONS: readonly StyleOption<OpenAITone>[] = [
  { value: "neutral", label: "Neutral · professional" },
  { value: "warm", label: "Warm · friendly" },
  { value: "authoritative", label: "Authoritative · confident" },
  { value: "conversational", label: "Conversational · relaxed" },
];

export const EXPRESSIVENESS_OPTIONS: readonly StyleOption<OpenAIExpressiveness>[] = [
  { value: "restrained", label: "Restrained · even" },
  { value: "moderate", label: "Moderate · natural variation" },
  { value: "expressive", label: "Expressive · rich range" },
];

export const DELIVERY_OPTIONS: readonly StyleOption<OpenAIDelivery>[] = [
  { value: "standard", label: "Standard · measured" },
  { value: "narration", label: "Narration · audiobook" },
  { value: "newscast", label: "Newscast · crisp anchor" },
  { value: "soft", label: "Soft · near-whisper" },
];

export const ACCENT_FOCUS_OPTIONS: readonly StyleOption<OpenAIAccentFocus>[] = [
  { value: "multilingual", label: "EN / DE / ZH · auto native" },
  { value: "english", label: "English" },
  { value: "german", label: "German" },
  { value: "chinese", label: "Chinese · Mandarin" },
];

const TONE_FRAGMENT: Record<OpenAITone, string> = {
  neutral: "Use a calm, clear, professional tone.",
  warm: "Use a warm, friendly tone.",
  authoritative: "Use a confident, authoritative tone.",
  conversational: "Use a relaxed, conversational tone.",
};

const EXPRESSIVENESS_FRAGMENT: Record<OpenAIExpressiveness, string> = {
  restrained: "Keep the emotional range restrained and even; do not dramatize beyond what the punctuation implies.",
  moderate: "Use a moderate emotional range with natural variation.",
  expressive: "Use a rich, expressive emotional range.",
};

const DELIVERY_FRAGMENT: Record<OpenAIDelivery, string> = {
  standard: "Keep an even, measured pace with natural pauses at punctuation and sentence boundaries.",
  narration: "Deliver as polished, audiobook-style narration with smooth phrasing.",
  newscast: "Deliver like a news anchor: crisp, well-articulated, and steadily paced.",
  soft: "Deliver softly and gently, close to a whisper, at low volume.",
};

const ACCENT_FRAGMENT: Record<OpenAIAccentFocus, string> = {
  multilingual:
    "The text may be in English, German, or Chinese; identify the language of each sentence and pronounce it as a fluent native speaker of that language — never read German or Chinese with an English accent.",
  english: "Read with natural, native English pronunciation.",
  german: "Read with natural, native German pronunciation.",
  chinese: "Read with natural, native Mandarin Chinese pronunciation.",
};

const BASE_DIRECTIVE = "You are reading text aloud for an academic listener.";
const PRECISION_DIRECTIVE = "Pronounce technical terms, proper nouns, and numbers precisely.";

export function composeStyleInstruction(style: OpenAIStyle): string {
  const extra = style.extraNotes?.trim();
  return [
    BASE_DIRECTIVE,
    ACCENT_FRAGMENT[style.accentFocus],
    TONE_FRAGMENT[style.tone],
    EXPRESSIVENESS_FRAGMENT[style.expressiveness],
    DELIVERY_FRAGMENT[style.delivery],
    PRECISION_DIRECTIVE,
    extra,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function pick<T extends string>(value: string | undefined, options: readonly StyleOption<T>[], fallback: T): T {
  return options.some((option) => option.value === value) ? (value as T) : fallback;
}

export function normalizeTone(value: string | undefined): OpenAITone {
  return pick(value, TONE_OPTIONS, DEFAULT_TONE);
}

export function normalizeExpressiveness(value: string | undefined): OpenAIExpressiveness {
  return pick(value, EXPRESSIVENESS_OPTIONS, DEFAULT_EXPRESSIVENESS);
}

export function normalizeDelivery(value: string | undefined): OpenAIDelivery {
  return pick(value, DELIVERY_OPTIONS, DEFAULT_DELIVERY);
}

export function normalizeAccentFocus(value: string | undefined): OpenAIAccentFocus {
  return pick(value, ACCENT_FOCUS_OPTIONS, DEFAULT_ACCENT_FOCUS);
}
