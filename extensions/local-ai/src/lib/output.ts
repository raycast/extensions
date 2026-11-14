export const PREAMBLE_PATTERNS: RegExp[] = [
  /^(?:(?:sure|certainly|of course|okay)[!,.]?\s*)?here(?:'s| is| are)\s+(?:the|a|an|your)\b[^\n]{0,60}\b(?:text|version|rewrite|translation|summary|sentence|paragraph|message|email)\s*:\s*$/i,
  /^(?:rewritten|revised|corrected|translated|improved|simplified) text:\s*/i,
];

const MAX_PREAMBLE_LINE_LENGTH = 100;
const REFUSAL_OPENING =
  /^(?:i'?m sorry|i am sorry|sorry|i can(?:no|')t|i cannot|i am unable|i'?m unable|i apologi[sz]e|unfortunately,? i\b|as an ai)/i;
const REFUSAL_SUBJECT =
  /help with (?:that|this)|assist|comply|fulfill|(?:your|this|that) request|as an ai|provide (?:that|this)/i;
const SPEAKER_LABEL = /^(?:assistant|ai|model)\s*:\s*/i;
const QUOTE_PAIRS: Record<string, string> = { '"': '"', "“": "”" };

export function stripPreamble(text: string): string {
  const normalized = normalizeApostrophes(text);
  const newline = normalized.indexOf("\n");
  const firstLine = newline === -1 ? normalized : normalized.slice(0, newline);
  if (firstLine.length > MAX_PREAMBLE_LINE_LENGTH) return text;

  for (const pattern of PREAMBLE_PATTERNS) {
    const match = pattern.exec(firstLine);
    if (!match) continue;
    return text.slice(match[0].length).replace(/^\s*\n+/, "");
  }
  return text;
}

export function stripWrappingQuotes(output: string, input: string): string {
  if (startsWithQuote(input.trim())) return output;
  const trimmed = output.trim();
  const opening = trimmed[0];
  const closing = QUOTE_PAIRS[opening];
  if (!closing || trimmed.length < 2 || !trimmed.endsWith(closing)) return output;
  const inner = trimmed.slice(1, -1);
  return inner.includes(opening) || inner.includes(closing) ? output : inner;
}

export function looksLikeRefusal(output: string): boolean {
  const normalized = normalizeApostrophes(output).trim();
  if (!REFUSAL_OPENING.test(normalized)) return false;
  const firstSentence = normalized.split(/[.!?\n]/)[0];
  return REFUSAL_SUBJECT.test(firstSentence);
}

export function stripSpeakerLabel(text: string): string {
  return text.replace(SPEAKER_LABEL, "");
}

export type FinalizeResult = { ok: true; text: string } | { ok: false; reason: "empty" | "refusal"; text: string };

export function finalizeReplacement(output: string, input: string): FinalizeResult {
  const text = stripWrappingQuotes(stripPreamble(output.trimStart()), input).trim();
  if (text === "") return { ok: false, reason: "empty", text: "" };
  if (looksLikeRefusal(text)) return { ok: false, reason: "refusal", text };
  return { ok: true, text: input.endsWith("\n") ? `${text}\n` : text };
}

export function finalizeWindowText(output: string): string {
  return stripPreamble(output.trimStart()).trim();
}

function normalizeApostrophes(text: string): string {
  return text.replace(/[‘’]/g, "'");
}

function startsWithQuote(text: string): boolean {
  return text[0] in QUOTE_PAIRS;
}
