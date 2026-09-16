/**
 * What the pane may rewrite, and what it may not.
 *
 * Two passes rewrite a message on its way to the detail pane — image embeds and
 * search highlighting — and both have exactly one hard rule: markup inserted
 * into code is not markup. Inside a fence or an inline span the renderer prints
 * what it is given, so a rewrite there shows its own tags and corrupts the code
 * it was meant to leave alone. The rule lives here once rather than in each
 * pass, because two copies of it drifted is two passes disagreeing about where
 * a fence ended.
 *
 * The same walk answers a second question for `highlight.ts`: which text a
 * reader sees. Code is the case that separates the two — untouchable by a
 * rewrite, yet plainly on screen — so the pieces it needs are exported rather
 * than restated there.
 */

/**
 * A fence, capturing the run that opened it. Which character and how long both
 * matter: a `~~~` line inside a ```` ```` ```` block closes nothing, and
 * transcripts that quote markdown nest fences routinely. A toggle blind to
 * either one inverts its state and starts rewriting code.
 */
export const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Blockquote markers, stripped before a line is judged: `> ``` ` is a fence.
 * Exported so that a line quoted in a transcript is judged the same way there
 * as here — a quoted definition renders as nothing just as a bare one does.
 */
export const QUOTE = /^(?: {0,3}>)+ ?/;

/** An indented code block's line, which is only code after a blank line. */
const INDENT = /^(?: {4}|\t)/;

/**
 * A link reference definition, whose target is already a URL. Exported because
 * such a line renders as nothing at all, which the phrase decision in
 * `highlight.ts` has to know as surely as this pass does.
 */
export const DEFINITION = /^ {0,3}\[[^\]\n]*\]:/;

/**
 * An inline code span. The backtick run is captured and matched at the far end,
 * because a ``` `` ``` span otherwise reads as an empty one and everything
 * between its delimiters is treated as prose.
 */
const CODE_SPAN = /(`+)[^\n]*?\1/g;

/** Runs `transform` over everything on one line that is not an inline code span. */
function outsideCode(
  line: string,
  transform: (part: string) => string,
): string {
  let out = "";
  let last = 0;
  for (const span of line.matchAll(CODE_SPAN)) {
    out += transform(line.slice(last, span.index)) + span[0];
    last = span.index + span[0].length;
  }
  return out + transform(line.slice(last));
}

/**
 * Runs `transform` over every stretch of the text that is prose: not fenced,
 * not indented, not a link reference definition, and not an inline code span.
 *
 * `transform` sees one stretch of a single line at a time, never a whole line
 * and never a whole message, so a pass built on this cannot match across a code
 * span or a line break. Both callers want exactly that — a construct split by a
 * span is not a construct.
 */
export function mapProse(
  text: string,
  transform: (part: string) => string,
): string {
  const out: string[] = [];
  /** The run that opened the current fence, or undefined outside one. */
  let fence: string | undefined;
  /** Whether the previous line was part of an indented code block. */
  let indented = false;
  let blank = true;

  for (const line of text.split("\n")) {
    const content = line.replace(QUOTE, "");
    const opener = FENCE.exec(content)?.[1];
    if (fence) {
      // Same character, and at least as long: anything else is content.
      if (opener && opener[0] === fence[0] && opener.length >= fence.length)
        fence = undefined;
      out.push(line);
      continue;
    }
    if (opener) {
      fence = opener;
      out.push(line);
      continue;
    }

    // An indented block starts only where a paragraph is not already running;
    // otherwise the indent is a wrapped line of that paragraph.
    indented = INDENT.test(content) && (blank || indented);
    blank = content.trim() === "";
    if (indented || DEFINITION.test(content)) {
      out.push(line);
      continue;
    }

    out.push(outsideCode(line, transform));
  }
  return out.join("\n");
}
