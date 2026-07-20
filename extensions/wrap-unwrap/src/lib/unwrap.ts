// src/lib/unwrap.ts
import { classify, samePrefixStack, type Classified } from "./classify.js";
import { HYPHEN_BREAK_END } from "./regex.js";

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

/** Build the prefix string used for re-emission. */
function emitPrefix(prefixes: Classified["prefixes"]): string {
  return prefixes.map((p) => (p.spaceAfter ? "> " : ">")).join("");
}

function joinWithHyphenation(
  prior: string,
  next: string,
  hyphenation: boolean,
): string {
  if (hyphenation && HYPHEN_BREAK_END.test(prior) && /^[a-z]/.test(next)) {
    return prior.slice(0, -1) + next;
  }
  return prior + " " + next;
}

type Group = {
  /** Header line — defines prefix stack, list marker, etc. */
  header: Classified;
  /** Concatenated content (with hyphenation already applied as we accumulate). */
  joined: string;
  /** True when the group ended with a hard break — emit marker verbatim, then \n. */
  endHardBreak?: "spaces" | "backslash";
  /** True when this group is just a passthrough (preserve-as-is or html). */
  passthrough?: boolean;
  /** For passthrough groups, the raw line emitted as-is (with prefix). */
  raw?: string;
};

function emitGroup(g: Group): string {
  if (g.passthrough) return g.raw ?? "";
  const prefix = emitPrefix(g.header.prefixes);
  if (g.header.role === "list-item") {
    const indent = g.header.listIndent ?? "";
    const marker = g.header.listMarker ?? "-";
    const gap = g.header.listGap ?? " ";
    const taskPrefix =
      g.header.taskState !== undefined ? `[${g.header.taskState}] ` : "";
    return `${prefix}${indent}${marker}${gap}${taskPrefix}${g.joined}`;
  }
  return prefix + g.joined;
}

export function unwrap(text: string, opts: UnwrapOptions): string {
  if (text === "") return "";
  const records = classify(text, {
    recognizeDashBullets: opts.flattenBullets,
  });

  type Output =
    | { kind: "group"; group: Group }
    | { kind: "blank"; rawPrefix: string };
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
          passthrough: true,
          raw: rec.rawPrefix + rec.content,
        },
      });
      continue;
    }

    // rec is prose or list-item. Decide: continue current group, or start new.
    let canContinue = false;
    if (
      current &&
      samePrefixStack(rec, current.header) &&
      !current.endHardBreak
    ) {
      if (rec.role === "list-item") {
        // A new list-item starts a new group, even if same prefix.
        canContinue = false;
      } else {
        // rec is prose. Continue if header is prose, or list-item (continuation).
        canContinue =
          current.header.role === "prose" ||
          current.header.role === "list-item";
      }
    }

    if (!canContinue) {
      flush();
      current = { header: rec, joined: rec.content };
    } else {
      // Continuation lines: strip leading whitespace (indentation is presentation,
      // not content — e.g. list-item hang-indent continuation).
      const continuation = rec.content.replace(/^\s+/, "");
      current!.joined = joinWithHyphenation(
        current!.joined,
        continuation,
        opts.hyphenation,
      );
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
      const widths = [
        ...new Set(headers.map((h) => (h.listIndent ?? "").length)),
      ].sort((a, b) => a - b);
      const rankOf = new Map(widths.map((w, rank) => [w, rank]));
      for (const h of headers) {
        const rank = rankOf.get((h.listIndent ?? "").length) ?? 0;
        h.listIndent = INDENT_STEP.repeat(rank);
      }
    };
    for (let i = 0; i < output.length; i++) {
      const o = output[i];
      const isListGroup =
        o.kind === "group" &&
        !o.group.passthrough &&
        o.group.header.role === "list-item";
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
      if (
        !opts.keepBlankLines &&
        lines.length > 0 &&
        lines[lines.length - 1] === ""
      ) {
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
  while (
    lines.length > 0 &&
    lines[lines.length - 1] === "" &&
    !opts.keepBlankLines
  ) {
    lines.pop();
  }

  return lines.join("\n");
}
