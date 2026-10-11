// The one shape every source produces and every view consumes. Nothing in here
// knows about Wiktionary; swapping in a bundled offline source must not touch
// any file outside src/sources/.

export type Relation =
  | "inherited"
  | "borrowed"
  | "learned-borrowing"
  | "derived"
  | "affix"
  | "calque"
  | "root"
  | "cognate"
  | "influenced"
  | "unknown";

export interface EtymNode {
  /** The form shown to the reader, which for Arabic and Latin is often vocalised. */
  term: string;
  /**
   * The Wiktionary page title, which is not always the displayed form: `algebra`
   * displays Arabic الْجَبْر but links to جبر. Empty when there is no page.
   */
  title: string;
  lang: string; // Wiktionary language code, e.g. "ang", "ine-pro"
  langName: string;
  relation: Relation;
  gloss?: string;
  transliteration?: string;
  /** False when Wiktionary has no page for this term, so it cannot be followed. */
  hasPage: boolean;
  /** The ancestors of this node. More than one means the term was compounded. */
  children: EtymNode[];
}

export interface Definition {
  pos: string;
  glosses: string[];
}

/** A page can carry several unrelated etymologies for one spelling, e.g. `manifold`. */
export interface EtymSection {
  label?: string;
  prose?: string;
  tree?: EtymNode;
  /** What the word means, which an etymology alone never tells you. */
  definitions?: Definition[];
}

/** Which rung of the ladder in sources/index.ts produced this entry. */
export type EntrySource = "tree" | "templates" | "prose" | "none";

export interface Entry {
  term: string;
  lang: string;
  langName: string;
  sections: EtymSection[];
  source: EntrySource;
  pageUrl: string;
  fetchedAt: number;
  /**
   * True when the rendered tree was available but not fetched. Browsing a search
   * list reads one entry per keypress, so the preview takes the cheap wikitext
   * and leaves the 343 KB page alone; opening the entry fills it in.
   */
  partial?: boolean;
}

export function isEmpty(entry: Entry): boolean {
  return entry.sections.every((s) => !s.tree && !s.prose);
}

/** Depth-first ancestors of a tree, root excluded, in reading order. */
export function ancestors(node: EtymNode): EtymNode[] {
  const out: EtymNode[] = [];
  const visit = (n: EtymNode) => {
    for (const child of n.children) {
      out.push(child);
      visit(child);
    }
  };
  visit(node);
  return out;
}

/** The single path that reads as "the" chain of a word. */
export function spine(node: EtymNode): EtymNode[] {
  const out: EtymNode[] = [node];
  let current = node;

  while (current.children.length > 0) {
    // Follow the ancestor, not the affix. `computer` is compute + -er, and -er
    // has the longer history of the two, so taking the deepest branch walks off
    // into the story of a suffix and never mentions computing. Where every
    // branch is morphological the first component is the base by convention.
    const lineage = current.children.find((c) => c.relation !== "affix" && c.relation !== "root");
    current = lineage ?? current.children[0];
    out.push(current);
  }
  return out;
}

export function depth(node: EtymNode): number {
  return node.children.length === 0 ? 1 : 1 + Math.max(...node.children.map(depth));
}
