// EtymNode to markdown. Several renderings over one tree, so the detail pane, the
// clipboard and the AI tool can never disagree about what a word's ancestry is.
//
// The tree goes in a fenced block on purpose. `computer` resolves eleven levels
// deep, and only a monospace gutter keeps a branch at that depth legible.

import { Definition, Entry, EtymNode, spine } from "./model";
import { RELATION_MARKS, RELATION_SHORT } from "./sources/relations";

export const ATTRIBUTION =
  "Etymology from [Wiktionary](https://en.wiktionary.org), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).";

/**
 * The tree as a table.
 *
 * It was a fenced code block, which cost more than it bought. A code block is
 * drawn as a grey slab in dim monospace, so the terms - the one thing on screen
 * worth reading - came out fainter than the attribution line underneath them,
 * and every level of depth pushed them further right on a ragged edge.
 *
 * A table puts the terms in a column of their own, set in the interface font and
 * bold, and carries depth as a chevron in the language cell instead of as real
 * indentation. `computer` is eleven levels deep; as indentation that runs off the
 * pane, as chevrons it stays a fixed width.
 *
 * The headword is not a row: the pane already carries it as a heading. Roots get
 * a trailing line rather than a branch, since they hang off the headword and in a
 * tree would surface below the whole chain, reading as its continuation.
 */
/**
 * What a tree shows: the line of descent, and the names of what branches off it.
 *
 * Drawing every node indented was the problem. `computer` has twenty-six of them
 * and nine levels of nesting, most of it the private history of the suffix -er,
 * and rendering all of it buried the four rows someone asking about computers
 * actually wanted. Nothing is lost by naming the branches instead of expanding
 * them: Follow Ancestor still reaches every node, and following is the point.
 */
function visible(node: EtymNode) {
  const path = spine(node);
  const onPath = new Set(path);

  const branches: EtymNode[] = [];
  for (const step of path) {
    for (const child of step.children) {
      if (!onPath.has(child) && child.relation !== "root") branches.push(child);
    }
  }

  return {
    // slice(1) drops the headword, which the pane already carries as a heading.
    path: path.slice(1).filter((n) => n.relation !== "root"),
    branches,
    roots: rootsOf(node),
  };
}

export function treeMarkdown(node: EtymNode): string {
  const { path, branches, roots } = visible(node);

  // A table rather than a fenced block. A code block is drawn as a grey slab in
  // dim monospace, so the terms came out fainter than the attribution beneath
  // them; a table gives them a column of their own in the interface font.
  const rows = path.map(
    (n) => `| ${RELATION_MARKS[n.relation]} | ${cell(n.langName)} | ${cell(term(n))} |`,
  );
  // Labelled, not blank. Markdown requires a header row and Raycast draws it
  // regardless, so an empty one renders as an unexplained grey band above the
  // first ancestor.
  const table = rows.length
    ? ["|  | Language | Term |", "| :-: | --- | --- |", ...rows].join("\n")
    : "";

  const alsoLine = branches.length
    ? `Also from ${branches.map((b) => `${b.langName} **${escapeMarkdown(b.term)}**`).join(", ")}`
    : "";

  const rootLine = roots.length
    ? `Root: ${roots.map((r) => `${r.langName} **${escapeMarkdown(r.term)}**`).join(", ")}`
    : "";

  return [table, alsoLine, rootLine].filter(Boolean).join("\n\n");
}

/** Bold term, gloss trailing in italic. */
function term(node: EtymNode): string {
  const form = node.term || "?";
  const tr = node.transliteration ? ` (${node.transliteration})` : "";
  const gloss = node.gloss ? `  _${escapeMarkdown(node.gloss)}_` : "";
  return `**${escapeMarkdown(form)}**${tr}${gloss}`;
}

/** A pipe would end the cell, and every reconstructed form opens with an asterisk. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

function escapeMarkdown(text: string): string {
  return text.replace(/([*_`[\]])/g, "\\$1");
}

/**
 * Roots worth printing: the ones the chain does not already reach. Wiktionary
 * often tags a root that the derivation then walks down to anyway, and naming it
 * twice on one screen suggests two different facts.
 */
function rootsOf(node: EtymNode): EtymNode[] {
  const inChain = new Set<string>();
  const visit = (n: EtymNode) => {
    for (const child of n.children) {
      if (child.relation !== "root") inChain.add(`${child.lang}:${child.term}`);
      visit(child);
    }
  };
  visit(node);

  return node.children.filter((c) => c.relation === "root" && !inChain.has(`${c.lang}:${c.term}`));
}

/**
 * The key for the marks the table actually draws, one entry per mark.
 *
 * Grouped by mark, not by relation. Inheritance and derivation share an arrow, so
 * listing relations one by one printed "← inherited" and "← derived" as two
 * entries, which reads as two different symbols the reader then hunts for.
 *
 * Only marks on screen are listed: roots have their own line, and the branches
 * named under the table are not marked at all.
 */
export function relationKey(node: EtymNode): string[] {
  const { path } = visible(node);
  const byMark = new Map<string, string[]>();

  for (const step of path) {
    const mark = RELATION_MARKS[step.relation];
    const names = byMark.get(mark) ?? [];
    if (!names.includes(RELATION_SHORT[step.relation])) names.push(RELATION_SHORT[step.relation]);
    byMark.set(mark, names);
  }

  return [...byMark].map(([mark, names]) => `${mark} ${names.join(", ")}`);
}

/** The far end of the chain, which is the one fact a reader wants up front. */
export function earliest(node: EtymNode): EtymNode | undefined {
  const path = spine(node);
  return path.length > 1 ? path[path.length - 1] : undefined;
}

/** Oldest first, because that is the direction the word actually travelled. */
export function chainOneLine(node: EtymNode): string {
  return spine(node)
    .reverse()
    .map((n) => `${n.langName} ${n.term}`.trim())
    .join(" > ");
}

// Enough to say what the word is, not so much that the etymology falls below the
// fold. Wiktionary lists eleven senses for `water`; the first two carry it.
//
// The length cap matters as much as the count. `computer`'s first sense runs
// three hundred characters, and two of those pushed the ancestry clean off the
// pane — an etymology extension showing everything except the etymology.
const MAX_SENSES = 2;
const MAX_POS = 2;
const MAX_GLOSS = 150;

function clampGloss(gloss: string): string {
  if (gloss.length <= MAX_GLOSS) return gloss;

  const window = gloss.slice(0, MAX_GLOSS);
  const cut = Math.max(window.lastIndexOf("; "), window.lastIndexOf(", "), window.lastIndexOf(" "));
  return `${window.slice(0, cut > MAX_GLOSS * 0.5 ? cut : MAX_GLOSS).trimEnd()}…`;
}

/**
 * What the word means, ahead of where it came from. An etymology on its own
 * assumes you already know the word, which is the opposite of why you looked.
 */
function definitionsMarkdown(definitions: Definition[]): string {
  return definitions
    .slice(0, MAX_POS)
    .map(({ pos, glosses }) => {
      const shown = glosses.slice(0, MAX_SENSES).map((g, i) => `${i + 1}. ${clampGloss(g)}`);
      const rest = glosses.length - shown.length;
      if (rest > 0) shown.push(`_and ${rest} more sense${rest === 1 ? "" : "s"}_`);
      return [`**${pos}**`, ...shown].join("\n");
    })
    .join("\n\n");
}

export function entryMarkdown(entry: Entry, view: "tree" | "prose"): string {
  const body = entry.sections
    .map((section) => {
      const parts: string[] = [];
      // Bold, not a heading. Raycast renders `###` nearly as large as the word
      // itself, and a page with two etymologies then reads as three titles.
      if (section.label) parts.push(`**${section.label}**`);
      if (section.definitions?.length) parts.push(definitionsMarkdown(section.definitions));

      // Prose is the fallback in tree view too: a section can have wording but no
      // parseable ancestry, and an empty pane would read as a failure.
      if (view === "tree" && section.tree) parts.push(treeMarkdown(section.tree));
      else if (section.prose) parts.push(section.prose);
      else if (section.tree) parts.push(treeMarkdown(section.tree));

      return parts.join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  const heading = `# ${entry.term}`;

  // No attribution line here. Set as body text with link colouring it outshouted
  // the etymology it was crediting; the metadata pane carries the source and
  // licence instead, which is where a reader looks for provenance anyway.
  if (!body) {
    return [
      heading,
      `Wiktionary has no etymology for **${entry.term}**${
        entry.langName ? ` under ${entry.langName}` : ""
      }.`,
    ].join("\n\n");
  }
  return [heading, body].join("\n\n");
}

/** Copy as Markdown, through the user's template. Unknown placeholders are left alone. */
export function applyTemplate(template: string, entry: Entry): string {
  const first = entry.sections.find((s) => s.tree) ?? entry.sections[0];

  const values: Record<string, string> = {
    term: entry.term,
    language: entry.langName,
    chain: first?.tree ? chainOneLine(first.tree) : "",
    tree: first?.tree ? treeMarkdown(first.tree) : "",
    prose: first?.prose ?? "",
    url: entry.pageUrl,
    attribution: ATTRIBUTION,
  };

  return template
    .replace(/\\n/g, "\n")
    .replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Flat text for the clipboard and for the AI tool, where markdown is noise. */
export function plainSummary(entry: Entry): string {
  return entry.sections
    .map((section) => {
      const head = section.label ? `${section.label}: ` : "";
      const chain = section.tree ? chainOneLine(section.tree) : "";
      return [head + chain, section.prose].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}
