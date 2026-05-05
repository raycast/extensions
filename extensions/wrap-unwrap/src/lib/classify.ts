// src/lib/classify.ts

import {
  BLOCKQUOTE_PEEL,
  FENCE_BOUNDARY,
  HARD_BREAK_BACKSLASH,
  HARD_BREAK_SPACES,
  HEADING_ATX,
  HR,
  INDENTED_CODE,
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

/** True iff two records have identical blockquote prefix stacks (depth + per-frame marker/spaceAfter). */
export function samePrefixStack(a: Classified, b: Classified): boolean {
  if (a.prefixes.length !== b.prefixes.length) return false;
  for (let i = 0; i < a.prefixes.length; i++) {
    if (a.prefixes[i].marker !== b.prefixes[i].marker) return false;
    if (a.prefixes[i].spaceAfter !== b.prefixes[i].spaceAfter) return false;
  }
  return true;
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

type FenceState = { char: "`" | "~"; len: number } | null;

function classifyFenceBoundary(
  content: string,
): { fenceChar: "`" | "~"; fenceLen: number } | null {
  const m = content.match(FENCE_BOUNDARY);
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

function classifyListItem(content: string): {
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
    const nextIsSeparator =
      next &&
      next.prefixes.length === cur.prefixes.length &&
      TABLE_SEPARATOR.test(next.content);

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

export function classify(text: string): Classified[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: Classified[] = [];
  let fence: FenceState = null;

  for (const line of lines) {
    const { prefixes, content, rawPrefix } = peelBlockquotes(line);

    // Inside a fence: only allow a matching closer; everything else is in-fence (a blank line still counts as in-fence).
    if (fence) {
      const fb = classifyFenceBoundary(content);
      if (fb && fb.fenceChar === fence.char && fb.fenceLen >= fence.len) {
        out.push({
          prefixes,
          role: "fence-boundary",
          content,
          rawPrefix,
          fenceChar: fb.fenceChar,
          fenceLen: fb.fenceLen,
        });
        fence = null;
      } else {
        out.push({ prefixes, role: "in-fence", content, rawPrefix });
      }
      continue;
    }

    // Outside a fence:
    if (isBlank(content)) {
      out.push({ prefixes, role: "blank", content, rawPrefix });
      continue;
    }

    const fb = classifyFenceBoundary(content);
    if (fb) {
      fence = { char: fb.fenceChar, len: fb.fenceLen };
      out.push({
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
      out.push({ prefixes, role: "heading-atx", content, rawPrefix });
      continue;
    }

    if (HR.test(content)) {
      out.push({ prefixes, role: "hr", content, rawPrefix });
      continue;
    }

    if (LINK_REF_DEF.test(content)) {
      out.push({ prefixes, role: "link-ref-def", content, rawPrefix });
      continue;
    }

    const li = classifyListItem(content);
    if (li) {
      out.push({
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
    if (INDENTED_CODE.test(content)) {
      const lastBlankIdx =
        [...out]
          .map((c, i) => ({ c, i }))
          .reverse()
          .find(({ c }) => c.role === "blank")?.i ?? -1;
      const sinceBlank = out.slice(lastBlankIdx + 1);
      const inListContext = sinceBlank.some(
        (c) => c.role === "list-item" && c.prefixes.length === prefixes.length,
      );
      out.push({
        prefixes,
        role: inListContext ? "prose" : "indented-code",
        content,
        rawPrefix,
      });
      continue;
    }

    if (classifyHtmlBlockStart(content)) {
      out.push({ prefixes, role: "html-block", content, rawPrefix });
      continue;
    }

    // Default:
    out.push({ prefixes, role: "prose", content, rawPrefix });
  }

  applySetextPass(out);
  applyTablePass(out);
  applyHardBreakPass(out);
  return out;
}
