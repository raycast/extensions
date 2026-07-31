// src/lib/classify.ts

import {
  BLOCKQUOTE_PEEL,
  FENCE_BOUNDARY,
  FENCE_CLOSER,
  HARD_BREAK_BACKSLASH,
  HARD_BREAK_SPACES,
  HEADING_ATX,
  HR,
  indentColumns,
  isIndentedCode,
  LINK_REF_DEF,
  LIST_ITEM,
  SETEXT_UNDERLINE,
  TABLE_SEPARATOR,
  TASK_MARKER,
} from "./regex.js";

export type BlockquoteFrame = { marker: ">"; spaceAfter: boolean };

export type InnerRole =
  | "blank"
  | "fence-boundary"
  | "in-fence"
  | "indented-code"
  | "heading-atx"
  | "heading-setext"
  | "hr"
  | "list-item"
  | "table-row"
  | "html-block"
  | "link-ref-def"
  | "prose";

export type Classified = {
  /** Outer-to-inner blockquote frames. Depth = prefixes.length. */
  prefixes: BlockquoteFrame[];
  role: InnerRole;
  /**
   * Line content with blockquote prefixes stripped.
   *
   * Special case: for `list-item` records, `content` is ALSO stripped of the
   * list marker, gap, and (when present) the task checkbox — so it holds only
   * the inner text. To round-trip a list-item line, an emitter needs
   * `rawPrefix + listMarker + gap + (taskState ? "[x] " : "") + content`,
   * where `gap = " ".repeat(hangIndent - indent.length - listMarker.length)`.
   * For all other roles, `content` is the verbatim post-peel line.
   */
  content: string;
  /** Exact prefix string as it appeared in the input — used for round-trip emission. */
  rawPrefix: string;
  /**
   * True when this line is indented under a list item that was still open (no
   * intervening blank line). Distinguishes a list-nested blockquote from a
   * root-level one, which indent width alone cannot do — 0-3 spaces before a `>` is
   * legal padding at root.
   */
  inListContext?: boolean;
  // role-specific extras:
  listMarker?: string;
  hangIndent?: number;
  /** Raw leading indent for list-item records (preserves nesting + multi-space gaps for round-trip). */
  listIndent?: string;
  /** Raw gap between marker and content for list-item records (preserves multi-space alignment). */
  listGap?: string;
  taskState?: " " | "x" | "X";
  fenceChar?: "`" | "~";
  fenceLen?: number;
  hardBreak?: "spaces" | "backslash";
};

/**
 * True iff two records sit at the same blockquote depth with the same markers.
 *
 * `spaceAfter` is deliberately NOT compared: whether a `>` is followed by a space is
 * presentation, not structure, and `> text` / `>text` are the same quote in
 * CommonMark. Comparing it broke the wrap→unwrap round trip, because wrap emits a
 * `>`-quoted item's continuation as `">  text"` (marker + hang indent) and
 * `BLOCKQUOTE_PEEL` then greedily eats one of those spaces — making the
 * continuation read as `spaceAfter: true` against a bare-`>` header, so the lines
 * were never rejoined. Emission uses `rawPrefix`, which preserves the exact
 * original prefix, so nothing depends on this comparison for round-tripping.
 */
export function samePrefixStack(a: Classified, b: Classified): boolean {
  if (a.prefixes.length !== b.prefixes.length) return false;
  for (let i = 0; i < a.prefixes.length; i++) {
    if (a.prefixes[i].marker !== b.prefixes[i].marker) return false;
  }
  // A quote indented under an open list item is a DIFFERENT block from a root-level
  // quote at the same depth, even when both indents fall inside CommonMark's allowed
  // 0-3 spaces before a marker (`   > x` under `1. outer` vs a following `> x`).
  // Indent width alone can't tell them apart — 3 spaces is legal marker padding at
  // root — so the classifier records whether a list was open, and that is what's
  // compared. Plain varying padding (` > a` / `  > b`) still merges.
  return a.inListContext === b.inListContext;
}

function peelBlockquotes(line: string): {
  prefixes: BlockquoteFrame[];
  content: string;
  rawPrefix: string;
} {
  const prefixes: BlockquoteFrame[] = [];
  let rest = line;
  let rawPrefix = "";
  while (true) {
    const match = rest.match(BLOCKQUOTE_PEEL);
    if (!match) break;
    const matchedText = match[0];
    const spaceAfter = matchedText.endsWith(" ");
    prefixes.push({ marker: ">", spaceAfter });
    rawPrefix += matchedText;
    rest = rest.slice(matchedText.length);
  }
  return { prefixes, content: rest, rawPrefix };
}

function isBlank(content: string): boolean {
  return /^\s*$/.test(content);
}

/**
 * Columns of whitespace immediately before the LAST `>` in a raw prefix — i.e. how
 * far the innermost quote marker is indented within its parent block. For `">   > "`
 * that is 3, not 0: the inner marker sits three columns into the outer quote.
 */
/**
 * True when this record ends any list that was open — a line at the margin, outside
 * any blockquote, that is not itself a list item.
 *
 * An INDENTED line is excluded because it may be a lazy continuation of the open
 * item, which must keep reflowing with it. Quoted lines are excluded too: they are
 * the very records the list-context flag exists to classify, so treating them as
 * list-enders would clear the state a line before it is read.
 */
function closesOpenList(rec: Classified): boolean {
  if (rec.role === "list-item" || rec.prefixes.length > 0) return false;
  return !/^[ \t]/.test(rec.rawPrefix + rec.content);
}

function innerQuoteIndentColumns(rawPrefix: string): number {
  const lastMarker = rawPrefix.lastIndexOf(">");
  if (lastMarker === -1) return 0;
  const beforeMarker = rawPrefix.slice(0, lastMarker);
  const indent = beforeMarker.match(/[ \t]*$/);
  return indent ? indentColumns(indent[0]) : 0;
}

type FenceState = { char: "`" | "~"; len: number } | null;
type ClassifyOptions = {
  recognizeDashBullets?: boolean;
};

function classifyFenceBoundary(content: string): { fenceChar: "`" | "~"; fenceLen: number } | null {
  const m = content.match(FENCE_BOUNDARY);
  if (!m) return null;
  const run = m[1];
  return { fenceChar: run[0] as "`" | "~", fenceLen: run.length };
}

/**
 * A fence CLOSER, which unlike an opener may carry no info string — only trailing
 * whitespace. Returns null for ```` ```info ````, so such a line stays in-fence
 * instead of ending the block early and exposing its code to reflow.
 */
function classifyFenceCloser(content: string): { fenceChar: "`" | "~"; fenceLen: number } | null {
  const m = content.match(FENCE_CLOSER);
  if (!m) return null;
  const run = m[1];
  return { fenceChar: run[0] as "`" | "~", fenceLen: run.length };
}

// Block-level HTML tags from CommonMark §4.6 (not exhaustive — common ones).
const HTML_BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "dialog",
  "div",
  "dl",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "iframe",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul",
]);

function classifyHtmlBlockStart(content: string): boolean {
  if (content.startsWith("<!--")) return true;
  if (content.startsWith("<![CDATA[")) return true;
  if (content.startsWith("<?")) return true;
  const m = content.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!m) return false;
  return HTML_BLOCK_TAGS.has(m[1].toLowerCase());
}

function classifyListItem(
  content: string,
  opts: Required<ClassifyOptions>,
): {
  listMarker: string;
  hangIndent: number;
  listIndent: string;
  listGap: string;
  taskState?: " " | "x" | "X";
  innerContent: string;
} | null {
  const m = content.match(LIST_ITEM);
  if (!m) return null;
  const indent = m[1];
  const marker = m[2];
  if ((marker === "–" || marker === "—") && !opts.recognizeDashBullets) {
    return null;
  }
  const gap = m[3];
  const hangIndent = indent.length + marker.length + gap.length;
  const afterMarker = content.slice(hangIndent);
  const taskMatch = afterMarker.match(TASK_MARKER);
  if (taskMatch) {
    return {
      listMarker: marker,
      hangIndent,
      listIndent: indent,
      listGap: gap,
      taskState: taskMatch[0][1] as " " | "x" | "X",
      innerContent: afterMarker.slice(taskMatch[0].length),
    };
  }
  return {
    listMarker: marker,
    hangIndent,
    listIndent: indent,
    listGap: gap,
    innerContent: afterMarker,
  };
}

function applySetextPass(records: Classified[]): void {
  for (let i = 0; i < records.length - 1; i++) {
    const cur = records[i];
    const next = records[i + 1];
    // Setext only applies when current line is prose.
    if (cur.role !== "prose") continue;
    // The underline must be at the same blockquote depth.
    if (cur.prefixes.length !== next.prefixes.length) continue;
    if (!SETEXT_UNDERLINE.test(next.content)) continue;
    // Tag both lines.
    cur.role = "heading-setext";
    next.role = "heading-setext";
  }
}

function applyTablePass(records: Classified[]): void {
  for (let i = 0; i < records.length; i++) {
    const cur = records[i];
    if (cur.role !== "prose") continue;
    if (!cur.content.includes("|")) continue;

    // Case A: cur is the header — next line is a separator at same depth.
    const next = records[i + 1];
    const nextIsSeparator = next && next.prefixes.length === cur.prefixes.length && TABLE_SEPARATOR.test(next.content);

    // Case B: cur is itself a separator.
    const curIsSeparator = TABLE_SEPARATOR.test(cur.content);

    if (nextIsSeparator || curIsSeparator) {
      // Mark cur and walk forward marking table-rows until blank/role-change/depth-change.
      cur.role = "table-row";
      let j = i + 1;
      while (j < records.length) {
        const r = records[j];
        if (r.prefixes.length !== cur.prefixes.length) break;
        if (r.role === "blank") break;
        if (r.role !== "prose" && r.role !== "table-row") break;
        if (!r.content.includes("|") && !TABLE_SEPARATOR.test(r.content)) break;
        r.role = "table-row";
        j++;
      }
      i = j - 1; // resume after the table
    }
  }
}

function applyHardBreakPass(records: Classified[]): void {
  for (const r of records) {
    if (r.role !== "prose" && r.role !== "list-item") continue;
    if (HARD_BREAK_SPACES.test(r.content)) {
      r.hardBreak = "spaces";
    } else if (HARD_BREAK_BACKSLASH.test(r.content)) {
      r.hardBreak = "backslash";
    }
  }
}

export function classify(text: string, opts: ClassifyOptions = {}): Classified[] {
  const classifyOpts = { recognizeDashBullets: false, ...opts };
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: Classified[] = [];
  let fence: FenceState = null;

  /**
   * Blockquote depths at which a list-item has appeared since the last blank
   * line. Maintained incrementally by `push` below so the indented-code branch
   * can answer "am I inside a list?" in O(1) — rescanning `out` per line made
   * classification quadratic (188KB of indented code took 10.3s; MAX_INPUT
   * permits 1MB).
   */
  const listDepthsSinceBlank = new Set<number>();

  /**
   * Per blockquote depth, the smallest content indent (in columns) of a list item
   * open at that depth. A line must reach this column to be *inside* the item —
   * testing merely "some list is open and this line starts with whitespace" marked a
   * one-space root quote as list-nested under a wide marker like `123456789. `.
   */
  const listContentColumn = new Map<number, number>();

  const push = (rec: Classified): void => {
    if (rec.role === "blank" || closesOpenList(rec)) {
      // A blank line ends a list, and so does a line that starts back at the margin
      // without being part of one — `1. item` / `root prose` leaves no list open.
      // Clearing only on blank left the prior item's content column live, so a later
      // 3-space root quote was wrongly marked list-nested while an adjacent
      // unindented one was not, splitting one quote paragraph into two groups.
      listDepthsSinceBlank.clear();
      listContentColumn.clear();
    } else if (rec.role === "list-item") {
      listDepthsSinceBlank.add(rec.prefixes.length);
      // The MOST RECENT item at this depth governs what counts as "inside a list
      // item" for the lines that follow it. Keeping the minimum across siblings let a
      // narrow earlier marker (`1. `, column 3) lower the bar for a later wide one
      // (`123456789. `, column 11), so a 3-space quote under the wide item was marked
      // list-nested when it is really a root-level quote.
      listContentColumn.set(
        rec.prefixes.length,
        indentColumns(rec.listIndent ?? "") + (rec.listMarker ?? "").length + (rec.listGap ?? " ").length,
      );
    } else if (rec.prefixes.length > 0) {
      // An INDENTED BLOCKQUOTE reaching an open list item's content column belongs to
      // that item's block, not to a root-level quote. Scoped to quote records on
      // purpose: tagging every indented line would also split ordinary list-item
      // continuations from their item, which must keep reflowing together.
      //
      // The indent measured is the whitespace before THIS quote's own marker, taken
      // from the innermost frame — `>   > alpha` is indented under a list inside the
      // outer quote, which looking only at the start of `rawPrefix` never saw.
      const required = listContentColumn.get(rec.prefixes.length - 1);
      if (required !== undefined && innerQuoteIndentColumns(rec.rawPrefix) >= required) {
        rec.inListContext = true;
      }
    }
    out.push(rec);
  };

  for (const line of lines) {
    const { prefixes, content, rawPrefix } = peelBlockquotes(line);

    // Inside a fence: only allow a matching closer; everything else is in-fence (a blank line still counts as in-fence).
    if (fence) {
      const fb = classifyFenceCloser(content);
      if (fb && fb.fenceChar === fence.char && fb.fenceLen >= fence.len) {
        push({
          prefixes,
          role: "fence-boundary",
          content,
          rawPrefix,
          fenceChar: fb.fenceChar,
          fenceLen: fb.fenceLen,
        });
        fence = null;
      } else {
        push({ prefixes, role: "in-fence", content, rawPrefix });
      }
      continue;
    }

    // Outside a fence:
    if (isBlank(content)) {
      push({ prefixes, role: "blank", content, rawPrefix });
      continue;
    }

    const fb = classifyFenceBoundary(content);
    if (fb) {
      fence = { char: fb.fenceChar, len: fb.fenceLen };
      push({
        prefixes,
        role: "fence-boundary",
        content,
        rawPrefix,
        fenceChar: fb.fenceChar,
        fenceLen: fb.fenceLen,
      });
      continue;
    }

    if (HEADING_ATX.test(content)) {
      push({ prefixes, role: "heading-atx", content, rawPrefix });
      continue;
    }

    if (HR.test(content)) {
      push({ prefixes, role: "hr", content, rawPrefix });
      continue;
    }

    if (LINK_REF_DEF.test(content)) {
      push({ prefixes, role: "link-ref-def", content, rawPrefix });
      continue;
    }

    const li = classifyListItem(content, classifyOpts);
    if (li) {
      push({
        prefixes,
        role: "list-item",
        content: li.innerContent,
        rawPrefix,
        listMarker: li.listMarker,
        hangIndent: li.hangIndent,
        listIndent: li.listIndent,
        listGap: li.listGap,
        taskState: li.taskState,
      });
      continue;
    }

    // Indented code: only outside a list. If any list-item appears in the run since
    // the last blank at the same prefix depth, treat indented lines as continuation prose.
    // Known v1 limitation: a blank between a list item and a 4-space-indented
    // continuation (CommonMark "loose list" continuation) is classified here as
    // indented-code, not prose. Both roles are passed through verbatim by wrap/unwrap,
    // so the round-trip output is unaffected — a faithful classifier would need to
    // track open-list state across blanks.
    if (isIndentedCode(content)) {
      // `listDepthsSinceBlank` is maintained incrementally as records are pushed
      // (see the push sites below), so this is O(1) per line. Copying and
      // rescanning `out` here instead made classification quadratic: 188KB of
      // indented code took 10.3s, and MAX_INPUT permits 1MB.
      const inListContext = listDepthsSinceBlank.has(prefixes.length);
      push({
        prefixes,
        role: inListContext ? "prose" : "indented-code",
        content,
        rawPrefix,
      });
      continue;
    }

    if (classifyHtmlBlockStart(content)) {
      push({ prefixes, role: "html-block", content, rawPrefix });
      continue;
    }

    // Default:
    push({ prefixes, role: "prose", content, rawPrefix });
  }

  applySetextPass(out);
  applyTablePass(out);
  applyHardBreakPass(out);
  return out;
}
