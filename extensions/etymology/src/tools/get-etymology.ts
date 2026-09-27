// AI tool: get-etymology.
//
// Returns the same structure the detail view renders, so an answer from Raycast AI
// and an answer from the command cannot disagree. `ray build` derives the input
// schema from the exported Input type, which is why package.json declares no
// schema of its own.

import { loadEntry } from "../entry";
import { chainOneLine } from "../render";
import { EtymNode } from "../model";

type Input = {
  /** The word to trace, e.g. "manifold". Give the dictionary form, lowercase. */
  word: string;
  /**
   * Wiktionary language code of the word. Defaults to English. Use this to follow
   * an ancestor, e.g. "ang" for Old English wæter.
   */
  language?: string;
};

interface Link {
  term: string;
  language: string;
  relation: string;
  gloss?: string;
}

export default async function tool(input: Input) {
  const entry = await loadEntry(input.word.trim(), input.language?.trim() || "en");

  return {
    word: entry.term,
    language: entry.langName,
    found: entry.sections.some((s) => s.tree || s.prose),
    source: entry.source,
    url: entry.pageUrl,
    etymologies: entry.sections.map((section) => ({
      label: section.label,
      chain: section.tree ? chainOneLine(section.tree) : undefined,
      ancestors: section.tree ? flatten(section.tree) : [],
      prose: section.prose,
    })),
    attribution: "Wiktionary, CC BY-SA 4.0",
  };
}

/** Breadth-first, so the immediate ancestors come first where a model truncates. */
function flatten(root: EtymNode): Link[] {
  const out: Link[] = [];
  let level = root.children;

  while (level.length > 0) {
    const next: EtymNode[] = [];
    for (const node of level) {
      out.push({
        term: node.term,
        language: node.langName,
        relation: node.relation,
        gloss: node.gloss,
      });
      next.push(...node.children);
    }
    level = next;
  }
  return out;
}
