/**
 * Chat history as Raycast shows it: either literally, in a fenced block, or as
 * Markdown with anything that could load a remote address defused. History is
 * untrusted text, so both forms are safe to display.
 */

/** The first `limit` characters and "…", without half of a character pair at the cut. */
function clip(content: string, limit: number): string {
  if (content.length <= limit) return content;
  const cut = /[\uD800-\uDBFF]$/.test(content.slice(0, limit)) ? limit - 1 : limit;
  return `${content.slice(0, cut)}…`;
}

/**
 * Chat history is untrusted text, and Raycast renders Markdown, where an image
 * or link would load a remote address. Text is shown in a code block fenced
 * longer than any run of backticks inside it, so nothing in it is interpreted.
 */
export function literal(content: string, limit = 4000): string {
  const text = clip(content, limit);
  const longest = Math.max(2, ...Array.from(text.matchAll(/`+/g), (run) => run[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}text\n${text}\n${fence}`;
}

/**
 * Chat history rendered as Markdown, so code, lists and emphasis read as they
 * did in the chat. History is untrusted, and Raycast loads images, so every
 * image is turned into a link (links load nothing until clicked) and raw HTML
 * tags are shown as text. Code blocks and code spans are left alone: Raycast
 * shows them literally. A code block still open at the end, as when the text
 * was cut inside one, is closed, so what follows the history is not code.
 * `terms` are the words to set in bold, as a search's matching words.
 */
export function rendered(content: string, limit = 4000, terms: readonly string[] = []): string {
  const text = clip(content, limit);
  const marked = termPattern(terms);
  let fence = "";
  const lines = text.split("\n").map((line) => {
    const opener = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (opener && opener[0] === fence[0] && opener.length >= fence.length) fence = "";
      return line;
    }
    if (opener) {
      fence = opener;
      return line;
    }
    return outsideCode(line, marked);
  });
  if (fence) lines.push(fence);
  return lines.join("\n");
}

/** Markdown as a block quote, which Raycast draws with a bar down its side. */
export function quoted(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

/**
 * Matches any of `terms` as a whole word, in any case. A word touching `*`,
 * `_` or `~` is left alone: it is already inside emphasis, and marks added
 * beside those would change what they mean.
 */
function termPattern(terms: readonly string[]): RegExp | undefined {
  const words = terms.filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return undefined;
  return new RegExp(`(?<![\\p{L}\\p{N}_*~])(?:${words.join("|")})(?![\\p{L}\\p{N}_*~])`, "giu");
}

/**
 * What bold marks must not be added inside, since they would change an
 * address or show as asterisks: a link's target or reference, a bare address,
 * a character entity, and text that is already bold.
 */
const KEPT_AS_WRITTEN =
  /(\]\([^)]*\)?|\]\[[^\]]*\]?|[a-z][a-z0-9+.-]*:\/\/\S+|www\.\S+|\S+@\S+|&#?[a-z0-9]+;|\*\*[^*]+\*\*)/gi;

/** Sets the matching words of one stretch of text, outside code, in bold. */
function bold(text: string, terms: RegExp | undefined): string {
  if (!terms) return text;
  return text
    .split(KEPT_AS_WRITTEN)
    .map((part, index) => (index % 2 ? part : part.replace(terms, "**$&**")))
    .join("");
}

/**
 * Defuses images and HTML in one line, outside its code spans, and sets
 * `terms` in bold there. A run of backticks opens a code span only when the
 * same run closes it later on the line; an unmatched run is ordinary text, so
 * what follows it is defused too. Bold is not added to an indented line, which
 * may be an indented code block, nor to a link reference definition.
 */
function outsideCode(line: string, terms: RegExp | undefined): string {
  const marked = /^(?: {4}|\t)/.test(line) || /^\s{0,3}\[[^\]]+\]:/.test(line) ? undefined : terms;
  const parts = line.split(/(`+)/);
  const isRun = (part: string) => /^`+$/.test(part);
  let shown = "";
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!isRun(part)) {
      shown += bold(part.replace(/!\[/g, "\\![").replace(/<(?=[a-zA-Z!/?])/g, "&lt;"), marked);
      continue;
    }
    const close = parts.indexOf(part, index + 1);
    if (close < 0) {
      shown += part;
      continue;
    }
    shown += parts.slice(index, close + 1).join("");
    index = close;
  }
  return shown;
}
