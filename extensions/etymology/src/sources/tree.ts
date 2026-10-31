// The rich path, available for roughly two thirds of entries.
//
// action=parse&prop=text (28-343 KB, ~1s). Entries using {{etymon|tree=1}} carry
// a <ul class="etymonid" data-ety-tree-json="..."> whose value is an already-built
// nested tree. Wiktionary has followed each ancestor to its own page to assemble
// it, so this reaches depths no single page states: `computer` resolves eleven
// levels down to Proto-Indo-European *ḱe.
//
// Only fetched when the wikitext contains {{etymon or {{ety and the tree view is
// wanted. Keeping the larger payload off the hot path is what keeps search fast.

import { EtymNode } from "../model";
import { languageName } from "../langcodes";
import { relationOf } from "./relations";

interface RawGroup {
  terms?: RawNode[];
  keyword?: string;
  keyword_label?: string;
  is_group?: boolean;
}

interface RawNode {
  term?: string | null;
  lang?: string;
  lang_name?: string;
  /** Usually "ok" | "missing" | "inline", but degrades to the raw template args. */
  status?: unknown;
  id?: string;
  children?: RawGroup[];
}

export interface PageTree {
  lang: string;
  title: string;
  id?: string;
  root: EtymNode;
}

const UL = /<ul\b[^>]*\bclass="etymonid"[^>]*>/gi;

export function extractTrees(html: string): PageTree[] {
  const out: PageTree[] = [];

  for (let m = UL.exec(html); m; m = UL.exec(html)) {
    const tag = m[0];
    const json = attribute(tag, "data-ety-tree-json");
    if (!json) continue;

    let raw: RawNode;
    try {
      raw = JSON.parse(json);
    } catch {
      continue;
    }

    const lang = attribute(tag, "data-lang") ?? raw.lang ?? "";
    const [root] = convert(raw, "unknown");
    if (!root) continue;

    out.push({
      lang,
      title: attribute(tag, "data-title") ?? raw.term ?? "",
      id: attribute(tag, "data-id"),
      root,
    });
  }
  UL.lastIndex = 0;
  return out;
}

/** Trees for one language, in document order, so they pair with the page's etymology sections. */
export function treesForLanguage(html: string, lang: string): PageTree[] {
  return extractTrees(html).filter((t) => t.lang === lang);
}

/**
 * Returns a list, not a node, because a node can vanish. Some entries in the tree
 * carry a language and a relation but no term - Wiktionary knows something came
 * through Proto-Italic without knowing the form. Rendering those as a bare
 * language name breaks the chain into nonsense, so the node is dropped and its
 * ancestors are spliced into its parent, which is what the link actually claims.
 */
function convert(raw: RawNode, relation: EtymNode["relation"]): EtymNode[] {
  const term = (raw.term ?? "").trim();
  const lang = raw.lang ?? "";
  const status = typeof raw.status === "string" ? raw.status : "unknown";

  const children: EtymNode[] = [];
  for (const group of raw.children ?? []) {
    const childRelation = relationOf(group.keyword ?? "") ?? "unknown";
    for (const child of group.terms ?? []) children.push(...convert(child, childRelation));
  }

  if (!term) return children;

  return [
    {
      term,
      // `*súrks//*swə́rks` gives two reconstructed forms; the first has the page.
      title: term.split("//")[0],
      lang,
      langName: raw.lang_name || languageName(lang),
      relation,
      hasPage: status === "ok",
      children,
    },
  ];
}

function attribute(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? decodeEntities(m[1]) : undefined;
}

/**
 * The tree JSON arrives inside an HTML attribute, so every brace, bracket and
 * quote in it has been entity-encoded. Numeric references cover almost all of it;
 * the five named ones are here because `&amp;` in particular must be decoded last.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
