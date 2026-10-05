import type { AppliedCorrections, CheckTextResponse, Match } from "../types";
import { calculateCorrectedText } from "./text-correction";

/** The offending fragment, as delimited inside the match's context */
export function fragmentOf(match: Match): string {
  return match.context.text.slice(
    match.context.offset,
    match.context.offset + match.context.length,
  );
}

/**
 * Escapes the characters CommonMark gives meaning to, so a selection that
 * happens to contain `#`, `*`, `_` or backticks is shown as written instead of
 * being rendered as a heading, italics or code.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>~])/g, "\\$1");
}

/**
 * Escapes a word so it can sit inside a link label without closing it early.
 * A replacement containing `](...)` would otherwise inject a real link.
 */
function escapeLinkLabel(text: string): string {
  return text.replace(/([\\[\]])/g, "\\$1");
}

/**
 * The result as it currently stands, with the selected correction marked as a
 * markdown link.
 *
 * A link is the one thing in this renderer that both colours and underlines
 * text without changing the glyphs: bold, italic and code all alter the width
 * of the word, which makes the paragraph shift as the selection moves.
 *
 * The address is an empty fragment: these marks exist to be seen, not
 * followed. What each correction did, and why the rule fired, belongs to the
 * corrections screen.
 */
export function resultWithMatchLinked(
  textChecked: string,
  result: CheckTextResponse,
  applied: AppliedCorrections,
  index: number,
): string {
  const matches = result.matches ?? [];
  const target = matches[index];
  if (!target) return textChecked;

  const corrected = calculateCorrectedText(textChecked, result, applied);
  const original = textChecked.slice(
    target.offset,
    target.offset + target.length,
  );

  let shift = 0;
  matches.forEach((match, position) => {
    const replacement = applied.get(position);
    if (replacement === undefined || match.offset >= target.offset) return;
    shift += replacement.length - match.length;
  });

  const chosen = applied.get(index);
  const start = target.offset + shift;
  const end = start + (chosen !== undefined ? chosen.length : target.length);

  // An empty fragment: nowhere to go, which is the point. The rule
  // explanation is reachable from the action panel instead.
  const href = "#";

  // The link title becomes a tooltip: hovering the corrected word shows what
  // was there before, which is the one thing the reader cannot see any more
  const tooltip =
    chosen !== undefined ? `${original} → ${chosen}` : target.message;
  const escapedTooltip = tooltip.replace(/"/g, "'");

  const before = escapeMarkdown(corrected.slice(0, start));
  const after = escapeMarkdown(corrected.slice(end));
  const label = escapeLinkLabel(chosen ?? original);

  return `${before}[${label}](${href} "${escapedTooltip}")${after}`;
}

/**
 * The result, with every applied correction marked in place. Walking the
 * matches in order sidesteps the offset arithmetic: the text between them is
 * copied across untouched.
 *
 * The mark is a link, the only colour this renderer offers; hovering it shows
 * the word that used to be there, which is the one thing the result no longer
 * says. What each correction did in detail belongs to the corrections screen.
 */
export function resultWithAllMarked(
  textChecked: string,
  result: CheckTextResponse,
  applied: AppliedCorrections,
): string {
  const matches = result.matches ?? [];

  const ordered = matches
    .map((match, index) => ({ match, replacement: applied.get(index) }))
    .filter(
      (entry): entry is { match: Match; replacement: string } =>
        entry.replacement !== undefined,
    )
    .sort((a, b) => a.match.offset - b.match.offset);

  let output = "";
  let cursor = 0;

  for (const { match, replacement } of ordered) {
    const original = textChecked.slice(
      match.offset,
      match.offset + match.length,
    );
    const tooltip = `${original} → ${replacement}`.replace(/"/g, "'");

    output += escapeMarkdown(textChecked.slice(cursor, match.offset));
    output += `[${escapeLinkLabel(replacement)}](# "${tooltip}")`;
    cursor = match.offset + match.length;
  }

  return output + escapeMarkdown(textChecked.slice(cursor));
}
