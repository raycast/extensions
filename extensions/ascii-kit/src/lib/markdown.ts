import { displayWidth, riskyGlyphs, splitLines } from "./width";

/**
 * Plain ``` fence: Slack, GitHub, Linear and Notion all render it monospace. Longer than any
 * backtick run in the text, so a ``` line inside the diagram doesn't close it early.
 */
export function fence(text: string, lang = ""): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const ticks = "`".repeat(Math.max(3, longest + 1));
  return ticks + lang + "\n" + text + "\n" + ticks;
}

/** Detail-pane markdown: the diagram, then a note on anything that may not survive pasting. */
export function preview(text: string, source?: string, caveat?: string): string {
  const lines = splitLines(text);
  const width = Math.max(...lines.map(displayWidth));
  const notes: string[] = caveat ? [caveat] : [];
  const risky = riskyGlyphs(text);
  if (risky.length) notes.push(`${risky.join(" ")} may render as emoji (2 columns) in some apps and break alignment.`);
  if (width > 72) notes.push(`${width} columns wide: may wrap on narrow screens (aim for 72 or less).`);
  const meta = [source, `${lines.length} ${lines.length === 1 ? "line" : "lines"}`, `${width} columns`]
    .filter(Boolean)
    .join(" · ");
  return [fence(text), notes.map((n) => `> ${n}`).join("\n\n"), `_${meta}_`].filter(Boolean).join("\n\n");
}
