const CREATE_NOTE_DEEPLINK =
  "raycast://extensions/raycast/raycast-notes/create-note";

export interface FloatingNoteInput {
  expression: string;
  source?: string;
  coaching?: string;
}

/**
 * Extract the leading coaching points, dropping list markers and blank lines.
 * Coaching notes are short Simplified-Chinese markdown bullets; we keep only
 * the first few so the floating note stays glanceable.
 */
export function topCoachingBullets(
  coaching: string | undefined,
  limit = 2,
): string[] {
  if (!coaching) {
    return [];
  }
  return coaching
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, limit);
}

/**
 * Build the compact study-card markdown that is pre-filled into a new
 * Raycast Note: the English expression as a heading, the original intent as a
 * blockquote, and up to two coaching points.
 */
export function buildFloatingNoteText(input: FloatingNoteInput): string {
  const sections: string[] = [`# ${input.expression.trim()}`];

  const source = input.source?.trim();
  if (source) {
    sections.push(`> ${source}`);
  }

  const bullets = topCoachingBullets(input.coaching);
  if (bullets.length > 0) {
    sections.push(bullets.map((bullet) => `- ${bullet}`).join("\n"));
  }

  return sections.join("\n\n");
}

/**
 * Build a Raycast deeplink that creates a new Raycast Note pre-filled with the
 * given text. This is the only Store-compliant way to push text into Notes;
 * there is no SDK append API.
 */
export function buildCreateNoteDeeplink(text: string): string {
  // encodeURIComponent (not URLSearchParams): Raycast's deeplink parser does
  // not decode "+" back to a space, so spaces must be percent-encoded as %20.
  return `${CREATE_NOTE_DEEPLINK}?fallbackText=${encodeURIComponent(text)}`;
}
