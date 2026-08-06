import type { TranscriptMessage } from "./corpus";
import { fitPath, headerPathChars } from "./format";
import { highlight, markMatches, marksFor } from "./highlight";
import { type LinkOptions, embedImages } from "./links";
import { FENCE } from "./markdown";
import { collapseTilde } from "./paths";
import type { Hit, SessionMeta } from "./types";

/**
 * Markup that changes meaning anywhere in a line. Transcript text is prose the
 * user wrote for an agent, so it is full of asterisks, underscores, brackets
 * and backticks that mean nothing here; rendered as markdown they swallow
 * their delimiters and reflow the excerpt.
 *
 * Parentheses are absent on purpose. Only `[text](url)` makes them markup, and
 * escaping the brackets already breaks that; escaping parens as well would put
 * a backslash in front of every aside in ordinary prose. `&` is here for the
 * same reason as `<`: without it an `&amp;` written in a transcript renders as
 * a bare ampersand.
 */
const INLINE_MARKUP = /[\\`*_[\]<&]/g;

/**
 * Strikethrough, which unlike the rest takes a doubled character. Escaping a
 * lone `~` would put a backslash in front of every home-relative path.
 */
const STRIKETHROUGH = /~~/g;

/**
 * Constructs that only bite as the first thing on a line, matched against a
 * chunk that `corpus.ts` has already flattened to exactly one. Escaping these
 * globally would be the noisier trade: `#` and `>` are common mid-sentence.
 */
const LEADING_BLOCK = /^(?:(\d+)([.)])|([#>\-+]))/;

/** Renders flattened corpus text as itself rather than as markup. */
export function escapeMarkdown(text: string): string {
  return (
    text
      .replace(INLINE_MARKUP, (ch) => `\\${ch}`)
      .replace(STRIKETHROUGH, String.raw`\~\~`)
      // `1)` numbers a list exactly as `1.` does, and chunks begin with one
      // often enough to matter.
      .replace(
        LEADING_BLOCK,
        (_, digits: string | undefined, delim: string, ch: string) =>
          digits ? `${digits}\\${delim}` : `\\${ch}`,
      )
  );
}

const HEADING = /^ {0,3}#{1,6}[ \t]+/;
/** A heading's optional closing run, which is syntax rather than text. */
const HEADING_TAIL = /[ \t]+#+[ \t]*$/;
/** The underline that turns the line above it into a heading. */
const SETEXT = /^ {0,3}(?:=+|-+)[ \t]*$/;

/**
 * One message, prepared for the pane: headings demoted to plain paragraphs and
 * any code fence the transcript left open closed off.
 *
 * Messages are real markdown and are rendered as such, which is where the
 * pane's code highlighting comes from. Headings are the one construct worth
 * refusing. A message opening `# Redesign the search command` is a sentence the
 * author happened to mark up, and set in display type it fills the pane by
 * itself. Both spellings go: an underlined title is still a title. A demoted
 * line keeps blank lines around it, because stripping the marker alone folded
 * the heading into the prose above and below as one run-on paragraph.
 *
 * Fences are walked rather than matched over, because inside one a leading `#`
 * is a comment in half the languages a transcript quotes. The walk tracks which
 * character opened the fence and how long the run was, since a `~~~` line
 * inside a ```` ```` ```` block closes nothing. Transcripts that quote markdown
 * nest fences routinely, and a toggle blind to the character mangled the code
 * inside them.
 *
 * An unclosed fence at the end is closed here. `corpus.ts` truncates long
 * messages at a character count that knows nothing about fences, and messages
 * arrive unbalanced on their own as well. Either way the pane concatenates
 * messages, so one open fence renders every message after it as a single code
 * block.
 */
function renderMessage(text: string): string {
  const out: string[] = [];
  /** The run that opened the current fence, or undefined outside one. */
  let fence: string | undefined;

  for (const line of text.split("\n")) {
    const opener = FENCE.exec(line)?.[1];
    if (fence) {
      // Only the same character, at least as long, closes it.
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

    const previous = out[out.length - 1];
    // A setext underline only heads the paragraph line above it; with a blank
    // line above, the same characters are a thematic break and stay.
    if (SETEXT.test(line) && previous !== undefined && previous.trim() !== "")
      continue;

    if (HEADING.test(line)) {
      if (previous !== undefined && previous.trim() !== "") out.push("");
      out.push(line.replace(HEADING, "").replace(HEADING_TAIL, ""));
      out.push("");
      continue;
    }
    out.push(line);
  }

  // Drop blank lines a demotion left at the end, which the join would compound.
  // Not inside a fence, where they are code and belong to it.
  if (fence) out.push(fence);
  else while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out.join("\n");
}

/**
 * A user message, set as a blockquote. This is the pane's whole structure: the
 * quoted blocks are what the user asked, everything else is the agent
 * answering.
 *
 * The rule between speakers that came before it said only that the speaker had
 * changed, never which one now held the floor. Marking one side names both, and
 * costs no chrome: a role label or a timestamp is the furniture the pane exists
 * to do without.
 *
 * A quote rather than a tint because Raycast's markdown draws neither colour
 * nor background, and of its block constructs only this one sets a message
 * apart without touching the type inside it. Fenced code, lists and images
 * survive the marker, and the user's own quotes nest.
 *
 * Blank lines carry the marker too, so a message of several paragraphs stays
 * one quote instead of a stack of them.
 */
function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
    .join("\n");
}

/**
 * Between messages: a paragraph break. One turn routinely arrives as several
 * messages, because an assistant's reply is split wherever a tool call
 * interrupts it and each part is numbered separately. Marking between all of
 * them cut single replies into what looked like a conversation.
 */
const MESSAGE_BREAK = "\n\n";

/**
 * Between consecutive user messages: a quoted blank line, which holds the run
 * inside a single quote. A bare one would close the quote and open the next,
 * drawing a seam through what is one turn.
 */
const QUOTED_BREAK = "\n>\n";

/** One message as the pane will show it, before the query is marked on it. */
export interface RenderedMessage {
  fromUser: boolean;
  text: string;
}

/**
 * The pane's messages, rendered but unmarked: images embedded and headings
 * demoted, so fenced code arrives as fenced code.
 *
 * Split from {@link paneMarkdown} for what it costs rather than what it does.
 * The image pass probes the filesystem for every marker it finds — a `statSync`
 * to see whether the paste still exists, and a header read to size it — and the
 * query changes on every keystroke while the messages behind it do not. Run as
 * one pass, that made each keystroke re-embed the whole window, syscalls
 * included, inside a React render. Kept apart, the caller caches this on the
 * messages and re-runs only the marking.
 */
export function renderPane(
  messages: TranscriptMessage[],
  links?: LinkOptions,
): RenderedMessage[] {
  // Dropped here rather than at the join, so a message that is only whitespace
  // cannot leave an empty quote behind, nor split a run of user messages in two.
  return messages
    .map((message) => ({
      fromUser: message.fromUser,
      text: embedImages(renderMessage(message.text.trim()), links),
    }))
    .filter((message) => message.text.length > 0);
}

/**
 * The detail pane's body: {@link renderPane}'s messages marked for the query
 * and joined, the user's set as blockquotes.
 *
 * `fallback` is the flattened corpus chunk, shown when the transcript could not
 * be read: deleted, rewritten, or still being written. It is the text the row
 * already shows, so the pane degrades to a wider subtitle rather than to
 * nothing, and it is escaped because flattening has already destroyed whatever
 * markup it had. Nor is it linkified, flattening having already run the paths
 * it names together with the prose around them.
 */
export function paneMarkdown(
  rendered: RenderedMessage[],
  fallback?: string,
  words: string[] = [],
): string {
  // Marked before escaping rather than after: escaping puts a backslash inside
  // any word holding markup, which the query's own word no longer matches.
  if (rendered.length === 0)
    return fallback
      ? markMatches(fallback, marksFor([fallback], words), escapeMarkdown)
      : "";

  // Decided once over every message the pane will show, as the pane will show
  // it, so a phrase in one message silences word marks in its neighbours.
  const marks = marksFor(
    rendered.map((message) => message.text),
    words,
  );
  return rendered.reduce((out, message, i) => {
    const marked = highlight(message.text, marks);
    const text = message.fromUser ? quote(marked) : marked;
    if (i === 0) return text;
    const together = message.fromUser && rendered[i - 1].fromUser;
    return out + (together ? QUOTED_BREAK : MESSAGE_BREAK) + text;
  }, "");
}

/** The chunk a pane falls back to before its transcript read has landed. */
export function fallbackText(session: SessionMeta, hit?: Hit): string {
  return hit ? hit.text : session.title || session.id;
}

/**
 * Date and time are formatted apart and joined with a space, because every
 * locale's combined form puts a comma between them and the header is short
 * enough that the punctuation reads as a third field.
 */
function stamp(ms: number): string {
  const at = new Date(ms);
  return `${DAY.format(at)} ${TIME.format(at)}`;
}

// Built once. `toLocaleDateString` with options constructs a formatter per
// call, V8 caching only the argument-less form, and the header is assembled for
// every row the moment the pane opens, where it dominated the frame.
const DAY = new Intl.DateTimeFormat(undefined, { dateStyle: "short" });
const TIME = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

/**
 * A one-line header carrying what the metadata table used to, written into the
 * markdown itself.
 *
 * Raycast lays a `List.Item.Detail`'s metadata out below a markdown area of
 * fixed height, so a table there cannot be moved, shrunk, or paid for in rows.
 * It costs the transcript the same share of the pane however little it holds. A
 * line of markdown costs one line, and the markdown is the only surface in the
 * pane whose height the extension decides.
 *
 * One weight throughout, with the path in a code span. Raycast's markdown
 * exposes no colour, so the code span is the only muted, boxed treatment
 * available, and it is what makes the line read as a label rather than as the
 * transcript's first sentence.
 *
 * The agent is not named, the row's icon being a Claude or an OpenAI mark.
 *
 * The path is home-relative because the prefix is the same on every row and the
 * pane is narrow enough to lose the tail that is not.
 *
 * It is elided to what the stamp leaves of the line, not to the line. A code
 * span that wraps draws its box on both lines and the two boxes overlap,
 * markdown owning the line height; and a header that wraps costs the
 * transcript the line this header exists to save.
 */
export function sessionHeader(session: SessionMeta): string {
  // A session whose transcript never named a cwd has none; the rest of the UI
  // guards on the project for the same reason, and an empty code span renders
  // as a pair of literal backticks.
  const where = collapseTilde(session.cwd) || session.project || session.id;
  const rest = ` · ${stamp(session.mtimeMs)}`;
  return `**${codeSpan(fitPath(where, headerPathChars(rest)))}${rest}**`;
}

/**
 * What separates the header from the transcript under it.
 *
 * A paragraph break alone is not enough air: the header sets a boxed code span
 * hard against the first block, and with the turn rules gone that block is
 * often a quote, whose own indent then reads as part of the header rather than
 * as the start of the conversation.
 *
 * Markdown has no margins and collapses any run of blank lines to one break, so
 * the space has to be bought with a line that holds something. A non-breaking
 * space is the least that qualifies: it takes a line's height and draws
 * nothing. It sits inside the header's own paragraph, after a hard break,
 * because an empty paragraph costs the line plus the margin above and below it,
 * which was visibly too much.
 *
 * Two trailing spaces rather than a backslash: a renderer that ignores the
 * spaces drops them silently, where one that ignores the backslash prints it.
 */
export const HEADER_GAP = "  \n&nbsp;\n\n";

/**
 * Wrap text in a code span that its own content cannot break out of.
 *
 * A directory name may legally contain a backtick, and a fixed single-backtick
 * delimiter would close on it, spilling the rest of the path out as bold prose.
 * CommonMark holds that a span delimited by n backticks contains runs shorter
 * than n, and strips one space from each end when both are present, which is
 * what lets the content begin or end with a backtick.
 */
function codeSpan(text: string): string {
  const flat = text.replace(/\s+/g, " ");
  const longest = Math.max(
    0,
    ...Array.from(flat.matchAll(/`+/g), (m) => m[0].length),
  );
  const delimiter = "`".repeat(longest + 1);
  const pad = flat.startsWith("`") || flat.endsWith("`") ? " " : "";
  return `${delimiter}${pad}${flat}${pad}${delimiter}`;
}
