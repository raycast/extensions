// src/lib/unwrap.ts
import { classify, samePrefixStack, type Classified } from "./classify.js";
import { HYPHEN_BREAK_END, SOFT_HYPHEN_END, STARTS_WITH_DIGIT, STARTS_WITH_LETTER } from "./regex.js";

export type UnwrapOptions = {
  hyphenation: boolean;
  keepBlankLines: boolean;
  /**
   * Re-indent list items to a fixed 2-space-per-level step, deriving each
   * item's level from the rank of its original indent width within its
   * contiguous list block. Strips the leading spaces that pasted terminal
   * or rich-text content carries in front of bullet markers.
   */
  flattenBullets: boolean;
};

const INDENT_STEP = "  ";

const REFLOWABLE_ROLES = new Set<Classified["role"]>(["prose", "list-item"]);

/** Whether the text so far ends inside an unterminated code span / link destination. */
type InlineState = { inCode: boolean; codeFence: number; inDest: boolean; destDepth: number };

const CLOSED: InlineState = { inCode: false, codeFence: 0, inDest: false, destDepth: 0 };

/**
 * Last few characters of `text`, enough to satisfy `HYPHEN_BREAK_END` (a letter or
 * digit plus a hyphen).
 *
 * Takes 3 UTF-16 code units, not 2, and never splits a surrogate pair: an astral
 * letter like `𐐀` occupies two code units, so a flat 2-unit tail sliced it in half
 * and `\p{L}` no longer matched — defeating the Unicode-letter join it exists for.
 */
function takeTail(text: string): string {
  const tail = text.slice(-3);
  // A leading low surrogate means the slice landed mid-pair; drop the orphan half.
  const first = tail.charCodeAt(0);
  return first >= 0xdc00 && first <= 0xdfff ? tail.slice(1) : tail;
}

/**
 * Prefix used for re-emission. `rawPrefix` is the verbatim prefix as it appeared
 * in the input, so it preserves leading indentation (e.g. the 3 spaces in a
 * list-contained quote `   > text`). Rebuilding from the frame list would drop
 * that indent and hoist the quote out of its list item.
 */
function emitPrefix(rec: Classified): string {
  return rec.rawPrefix;
}

/**
 * Whether a run of text leaves an inline code span or link destination OPEN, given
 * the state it started in. Computed per LINE and carried forward on the group, so
 * the cost is linear in the input — rescanning the whole accumulated paragraph at
 * every join was O(n²) (an 833KB single paragraph took 18s), and a bounded tail
 * window fixed the speed but sliced tokens in half and got the answer wrong.
 */
function advanceInlineState(line: string, openIn: InlineState): InlineState {
  let inCode = openIn.inCode;
  // Delimiter length of the currently-open span (1 for `…`, 2 for ``…``). A span is
  // closed only by a run of the SAME length, so the inner single tick of ``a`b``
  // is literal content — toggling on it read that span as open and mis-joined the
  // following prose.
  let fenceLen = openIn.codeFence;
  let inDest = openIn.inDest;
  // Nesting depth of parentheses inside a link destination. CommonMark allows
  // balanced parens in a URL, so the FIRST ")" is not necessarily the closer —
  // treating it as one ended the destination early and tight-joined URL data.
  let destDepth = openIn.destDepth;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    // A backslash escapes the next character, so `\`` and `\]` are literal text and
    // must not open a code span or link destination. Backslash escapes are inert
    // INSIDE a code span (CommonMark §6.1), so only honor them outside one.
    if (ch === "\\" && !inCode && i + 1 < line.length) {
      i++;
      continue;
    }
    if (inDest) {
      if (ch === "(") {
        destDepth++;
      } else if (ch === ")") {
        if (destDepth > 0) destDepth--;
        else inDest = false;
      }
      continue;
    }
    if (ch === "`") {
      let run = 1;
      while (line[i + run] === "`") run++;
      if (!inCode) {
        inCode = true;
        fenceLen = run;
      } else if (run === fenceLen) {
        inCode = false;
        fenceLen = 0;
      }
      i += run - 1;
      continue;
    }
    if (inCode) continue;
    if (ch === "]" && line[i + 1] === "(") {
      inDest = true;
      destDepth = 0;
      i++;
    }
  }
  return { inCode, codeFence: fenceLen, inDest, destDepth };
}

/**
 * Join two lines of one reflowed group.
 *
 * `priorTail` is the last 2 characters of `prior`, tracked by the caller. Slicing
 * `prior` here instead would force V8 to flatten the accumulated rope on every
 * join — measured at 1308ms vs 11ms for 32k lines, and the dominant cost of
 * unwrapping a long single-paragraph paste.
 */
function joinWithHyphenation(
  prior: string,
  priorTail: string,
  next: string,
  hyphenation: boolean,
  openIn: InlineState,
): { joined: string; tail: string } {
  // `separator` is what goes between the two halves; `drop` is how many chars to
  // remove from the end of `prior` first. Both are applied ONCE at the end so no
  // branch slices the accumulated rope.
  let separator = " ";
  let drop = 0;

  // Inside an open code span or link URL the hyphen is literal data — keep the
  // normal space join, so "`foo-\nbar`" stays "`foo- bar`" rather than "`foobar`".
  if (!openIn.inCode && !openIn.inDest) {
    // A break hyphen followed by a letter OR digit is word-internal: a soft-wrap
    // hyphen ("inter-/esting"), a compound that happened to break there
    // ("well-/known"), or a numeric range ("5-/10"). All rejoin with NO space.
    const bindsToNext =
      HYPHEN_BREAK_END.test(priorTail) && (STARTS_WITH_LETTER.test(next) || STARTS_WITH_DIGIT.test(next));
    if (bindsToNext) {
      separator = "";
      // U+00AD exists only to mark a soft break, so it carries no meaning once the
      // line is rejoined: drop it when the user opted in, keep it when not. An ASCII
      // "-" is NEVER dropped — it is indistinguishable from a real compound, and
      // mashing "well-known" into "wellknown" is the worse failure.
      if (hyphenation && SOFT_HYPHEN_END.test(priorTail)) drop = 1;
    }
  }

  const keptTail = drop > 0 ? priorTail.slice(0, -drop) : priorTail;
  const joined = (drop > 0 ? prior.slice(0, prior.length - drop) : prior) + separator + next;
  // The result's last chars always lie within this short string, so the tail is
  // derived without ever slicing `joined`.
  return { joined, tail: takeTail(keptTail + separator + next) };
}

type Group = {
  /** Header line — defines prefix stack, list marker, etc. */
  header: Classified;
  /** Concatenated content (with hyphenation already applied as we accumulate). */
  joined: string;
  /** Inline-token state at the end of `joined`, carried forward so each join is O(line). */
  inline: InlineState;
  /**
   * Last 2 chars of `joined`, tracked separately. Slicing `joined` per join forces
   * V8 to flatten the accumulated rope — the single biggest cost on a long paste.
   */
  tail: string;
  /** True when the group ended with a hard break — emit marker verbatim, then \n. */
  endHardBreak?: "spaces" | "backslash";
  /** True when this group is just a passthrough (preserve-as-is or html). */
  passthrough?: boolean;
  /** For passthrough groups, the raw line emitted as-is (with prefix). */
  raw?: string;
};

function emitGroup(g: Group): string {
  if (g.passthrough) return g.raw ?? "";
  const prefix = emitPrefix(g.header);
  if (g.header.role === "list-item") {
    const indent = g.header.listIndent ?? "";
    const marker = g.header.listMarker ?? "-";
    const gap = g.header.listGap ?? " ";
    const taskPrefix = g.header.taskState !== undefined ? `[${g.header.taskState}] ` : "";
    return `${prefix}${indent}${marker}${gap}${taskPrefix}${g.joined}`;
  }
  return prefix + g.joined;
}

export function unwrap(text: string, opts: UnwrapOptions): string {
  if (text === "") return "";

  const records = classify(text, {
    recognizeDashBullets: opts.flattenBullets,
  });

  type Output = { kind: "group"; group: Group } | { kind: "blank"; rawPrefix: string };
  const output: Output[] = [];

  let current: Group | null = null;

  const flush = () => {
    if (current) {
      output.push({ kind: "group", group: current });
      current = null;
    }
  };

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    // Blank lines flush the current group and emit a blank.
    if (rec.role === "blank") {
      flush();
      output.push({ kind: "blank", rawPrefix: rec.rawPrefix });
      continue;
    }

    // Preserve-as-is roles flush + emit verbatim.
    if (!REFLOWABLE_ROLES.has(rec.role)) {
      flush();
      output.push({
        kind: "group",
        group: {
          header: rec,
          joined: "",
          inline: CLOSED,
          tail: "",
          passthrough: true,
          raw: rec.rawPrefix + rec.content,
        },
      });
      continue;
    }

    // rec is prose or list-item. Decide: continue current group, or start new.
    let canContinue = false;
    if (current && samePrefixStack(rec, current.header) && !current.endHardBreak) {
      if (rec.role === "list-item") {
        // A new list-item starts a new group, even if same prefix.
        canContinue = false;
      } else {
        // rec is prose. Continue if header is prose, or list-item (continuation).
        canContinue = current.header.role === "prose" || current.header.role === "list-item";
      }
    }

    if (!canContinue) {
      flush();
      current = {
        header: rec,
        joined: rec.content,
        inline: advanceInlineState(rec.content, CLOSED),
        tail: takeTail(rec.content),
      };
    } else {
      // Continuation lines: strip leading whitespace (indentation is presentation,
      // not content — e.g. list-item hang-indent continuation).
      const continuation = rec.content.replace(/^\s+/, "");
      const joinResult = joinWithHyphenation(
        current!.joined,
        current!.tail,
        continuation,
        opts.hyphenation,
        current!.inline,
      );
      current!.joined = joinResult.joined;
      current!.tail = joinResult.tail;
      current!.inline = advanceInlineState(continuation, current!.inline);
    }

    if (rec.hardBreak) {
      current!.endHardBreak = rec.hardBreak;
    }
  }
  flush();

  // Normalize bullet indentation per contiguous list block. A block breaks on
  // a blank, a passthrough, or a non-list-item group. Within a block, the
  // distinct original indent widths are ranked ascending and each list item is
  // re-indented to rank * INDENT_STEP.
  if (opts.flattenBullets) {
    let blockStart = 0;
    const reindentBlock = (start: number, end: number) => {
      const headers: Classified[] = [];
      for (let k = start; k < end; k++) {
        const item = output[k];
        if (item.kind === "group" && item.group.header.role === "list-item") {
          headers.push(item.group.header);
        }
      }
      if (headers.length === 0) return;
      const widths = [...new Set(headers.map((h) => (h.listIndent ?? "").length))].sort((a, b) => a - b);
      const rankOf = new Map(widths.map((w, rank) => [w, rank]));
      for (const h of headers) {
        const rank = rankOf.get((h.listIndent ?? "").length) ?? 0;
        h.listIndent = INDENT_STEP.repeat(rank);
      }
    };
    for (let i = 0; i < output.length; i++) {
      const o = output[i];
      const isListGroup = o.kind === "group" && !o.group.passthrough && o.group.header.role === "list-item";
      if (!isListGroup) {
        reindentBlock(blockStart, i);
        blockStart = i + 1;
      }
    }
    reindentBlock(blockStart, output.length);
  }

  // Render output.
  const lines: string[] = [];
  for (let i = 0; i < output.length; i++) {
    const o = output[i];
    if (o.kind === "blank") {
      // Collapse runs unless keepBlankLines is on.
      if (!opts.keepBlankLines && lines.length > 0 && lines[lines.length - 1] === "") {
        continue;
      }
      lines.push("");
      continue;
    }
    const g = o.group;
    if (g.passthrough) {
      lines.push(g.raw ?? "");
      continue;
    }
    lines.push(emitGroup(g));
  }

  // Trim trailing blank line if we ended on one.
  while (lines.length > 0 && lines[lines.length - 1] === "" && !opts.keepBlankLines) {
    lines.pop();
  }

  return lines.join("\n");
}
