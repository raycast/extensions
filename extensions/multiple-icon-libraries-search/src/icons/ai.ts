// AI search sends Raycast AI the query, never the catalog: it asks for descriptive keywords,
// and the local tag search does the matching.

export const AI_PAUSE_MS = 500;
/** AI runs on its own when keywords find fewer icons than this: less than one full row. */
export const AI_AUTO_BELOW = 8;
export const AI_KEYWORD_LIMIT = 15;

export function keywordPrompt(query: string): string {
  return [
    "You help someone find an icon in a UI icon library such as Lucide or Hugeicons.",
    "Icons there are named and tagged with short, plain words for what they draw: objects, symbols, gestures, and actions.",
    `List 12 to 15 such words or two-word phrases an icon for this idea is likely tagged with: synonyms, the objects it would show, and common visual metaphors. Put the most likely first.`,
    "Reply with only the keywords, lowercase, separated by commas.",
    "",
    `Idea: ${query.trim()}`,
  ].join("\n");
}

/** Pulls clean keywords out of the AI's reply, tolerating bullets, numbering, and quotes. */
export function parseKeywords(reply: string): string[] {
  const keywords = reply
    .split(/[,\n;]+/)
    .map((part) =>
      part
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
        .replace(/["'`.]/g, "")
        .trim()
        .toLowerCase(),
    )
    .filter((part) => part && part.length <= 40 && !part.includes(":"));
  return [...new Set(keywords)].slice(0, AI_KEYWORD_LIMIT);
}

/** Raycast AI's published limits for extensions. */
export const RATE_LIMITS = [
  { windowMs: 60 * 1000, max: 10 },
  { windowMs: 60 * 60 * 1000, max: 100 },
];

/** Whether another AI call fits the limits, given the times of earlier calls. */
export function withinRateLimit(callTimes: number[], now: number): boolean {
  return RATE_LIMITS.every(({ windowMs, max }) => callTimes.filter((at) => now - at < windowMs).length < max);
}

/** Call times still inside the longest window; older ones no longer matter. */
export function pruneCallTimes(callTimes: number[], now: number): number[] {
  const longest = Math.max(...RATE_LIMITS.map(({ windowMs }) => windowMs));
  return callTimes.filter((at) => now - at < longest);
}

export type AiTrigger = "none" | "auto" | "tab";

/**
 * When AI runs: automatically once typing pauses and keywords found less than a row (unless the Automatic AI
 * setting is off), or when Tab asked for it. Never on an empty query.
 */
export function shouldAskAi(query: string, keywordMatches: number, tabRequested: boolean, auto = true): AiTrigger {
  if (!query.trim()) return "none";
  if (auto && keywordMatches < AI_AUTO_BELOW) return "auto";
  return tabRequested ? "tab" : "none";
}

/**
 * Raycast's default for extensions (GPT-6 Luna in @raycast/api 2.7), which every plan with AI can use.
 * It is not the model the user picked for AI Chat or Quick AI; extensions can't read that.
 */
export const DEFAULT_MODEL = "default";

/** The AI Model setting's Lower Cost choice, and its default: least credits, with keywords as good as the rest. */
export const LOWER_COST_MODEL = "gateway-deepseek/deepseek-v4.1-flash";

/** The setting's old "Recommended" value, which settings saved before 2026-10-16 may still hold. */
export const LEGACY_RECOMMENDED = "auto";

/** How long a fallback that answered stays first in line before the picked model is tried again. */
export const MODEL_MEMORY_MS = 7 * 24 * 60 * 60 * 1000;

/** The model the AI Model setting picks; an unset or old Recommended setting means Lower Cost. */
export function pickedModel(setting: string | undefined): string {
  return !setting || setting === LEGACY_RECOMMENDED ? LOWER_COST_MODEL : setting;
}

/**
 * The order to try models in: the picked model, then Raycast's default in case the user's plan lacks it or
 * Raycast retired it. While remembered, the model that last answered for this pick goes first, so a pick
 * the plan lacks doesn't fail on every search.
 */
export function modelOrder(
  setting: string | undefined,
  remembered: string | undefined,
  rememberedAt: number,
  now: number,
): string[] {
  const order = [...new Set([pickedModel(setting), DEFAULT_MODEL])];
  const fresh = remembered && now - rememberedAt < MODEL_MEMORY_MS && order.includes(remembered);
  return fresh ? [remembered, ...order.filter((model) => model !== remembered)] : order;
}

export { isRateLimitError } from "../shared/ai-call-line";
