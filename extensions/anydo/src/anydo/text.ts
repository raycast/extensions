/** Draws a line through text with combining long strokes (U+0336) — Raycast list titles have no
 *  strikethrough style, so completed tasks get a real line drawn through them. */
const STROKE = "\u0336";

export function strike(text: string): string {
  return [...text]
    .map((char) => (char === " " ? char : `${char}${STROKE}`))
    .join("");
}
