import { AI, environment } from "@raycast/api";
import { SAFE_EMOJI_CODES, SAFE_EMOJI_SET } from "./emoji";
import { StatusItem } from "./statuses";

export type Suggestion = Pick<StatusItem, "emoji" | "text">;

export function canUseAI(): boolean {
  return environment.canAccess(AI);
}

const DEFAULT_EMOJI = ":speech_balloon:";

function formatRules(count: number): string {
  return `Return ONLY a compact JSON array, no markdown, no code fences, in this exact shape:
[{"emoji": ":shortcode:", "text": "status under 60 characters"}]
Rules:
- "emoji" MUST be chosen from this exact list (copy it verbatim): ${SAFE_EMOJI_CODES.join(" ")}
- Pick the emoji that best fits each status.
- "text" is one punchy line, no surrounding quotes, no trailing period.
- Return exactly ${count} objects.`;
}

async function askForStatuses(
  instruction: string,
  count: number,
): Promise<Suggestion[]> {
  const answer = await AI.ask(`${instruction}\n${formatRules(count)}`, {
    creativity: "high",
  });
  const parsed = parseSuggestions(answer);
  if (parsed.length === 0) {
    throw new Error("Could not parse the AI response");
  }
  return parsed;
}

/**
 * Ask Raycast AI for a batch of short, funny work statuses based on the
 * user's notes/keywords. Returns several options so the user can shuffle
 * through them without a new API call each time. `tone` is the user's own
 * style guidance from onboarding (empty = built-in default).
 */
export async function generateStatuses(
  notes: string,
  tone = "",
  count = 6,
): Promise<Suggestion[]> {
  const notesLine = notes.trim()
    ? `Base them on these notes/keywords: ${notes.trim()}.`
    : "Base them on typical work life.";
  const toneLine = tone.trim()
    ? `Tone & style guidance from the user (follow it closely): ${tone.trim()}`
    : "";
  const instruction = `You write short, witty work statuses for a busy professional.
${notesLine}
${toneLine}
Generate ${count} distinct options — vary the angle and tone.`;
  return askForStatuses(instruction, count);
}

/**
 * Generate statuses from a calendar meeting's title + agenda. The prompt is
 * deliberately privacy-guarded: the output hints at the KIND of meeting, never
 * the literal details, so it's safe to show on a public profile.
 */
export async function generateMeetingStatuses(
  title: string,
  agenda: string,
  tone = "",
  count = 6,
): Promise<Suggestion[]> {
  const agendaLine = agenda.trim()
    ? `Agenda / description: ${agenda.trim()}`
    : "";
  const toneLine = tone.trim()
    ? `Tone & style guidance from the user (follow it closely): ${tone.trim()}`
    : "";
  const instruction = `You write short, witty work statuses for someone who is about to be (or already is) in a meeting.
Meeting title: ${title}
${agendaLine}
${toneLine}
Write statuses that hint at the KIND or vibe of the meeting in a funny way — never the literal details.
PRIVACY (critical): never include people's names, company or customer names, project codenames, numbers, or any confidential specifics. The status will be shown publicly (e.g. on a GitHub profile), so keep it generic and safe.
Generate ${count} distinct options — vary the angle and tone.`;
  return askForStatuses(instruction, count);
}

function parseSuggestions(raw: string): Suggestion[] {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  // Prefer a JSON array; fall back to collecting individual objects.
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const candidates: unknown[] = [];
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]);
      if (Array.isArray(arr)) candidates.push(...arr);
    } catch {
      // fall through to object scan
    }
  }
  if (candidates.length === 0) {
    for (const m of cleaned.matchAll(/\{[^{}]*\}/g)) {
      try {
        candidates.push(JSON.parse(m[0]));
      } catch {
        // skip malformed object
      }
    }
  }

  const suggestions: Suggestion[] = [];
  for (const c of candidates) {
    const obj = c as { emoji?: string; text?: string };
    if (!obj?.text) continue;
    let emoji = (obj.emoji ?? DEFAULT_EMOJI).trim();
    if (!emoji.startsWith(":")) emoji = `:${emoji}`;
    if (!emoji.endsWith(":")) emoji = `${emoji}:`;
    // Guard against the AI inventing emoji Slack won't accept.
    if (!SAFE_EMOJI_SET.has(emoji)) emoji = DEFAULT_EMOJI;
    suggestions.push({ emoji, text: obj.text.trim() });
  }
  return suggestions;
}
