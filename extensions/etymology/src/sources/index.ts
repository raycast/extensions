// The resolution ladder, cheapest first. The only entry point the commands use.
//
//   1. prop=wikitext -> templates.ts      -> chain + prose        (common case)
//   2. contains {{etymon and tree wanted:
//      prop=text -> tree.ts               -> full branching tree
//   3. no templates                       -> raw prose only
//   4. nothing                            -> "not on Wiktionary" + Etymonline link
//
// Each rung degrades into the next. A word never fails, it only gets thinner.

import { Definition, Entry, EtymSection } from "../model";
import { languageCode, languageName, resolveUnknownLanguages } from "../langcodes";
import { fetchHtml, fetchWikitext, pageUrl } from "./client";
import { buildTree, languageCodes } from "./templates";
import { treesForLanguage } from "./tree";
import {
  PosSection,
  etymologyScopes,
  etymologySections,
  languageSection,
  partsOfSpeech,
  toPlainText,
} from "./wikitext";

export { NotFoundError, etymonlineUrl, pageUrl, randomTermWithTree } from "./client";
export { suggest } from "./search";
export type { TitleSuggestion } from "./client";

/** Wiktionary only renders a tree where the entry uses {{etymon}} or its alias. */
const HAS_TREE = /\{\{\s*(etymon|ety)\s*\|/i;

export interface FetchOptions {
  /** Wiktionary language code. Following an ancestor changes this. */
  lang?: string;
  /** Skip the larger HTML request. Used where only the prose is on screen. */
  skipTree?: boolean;
}

export async function fetchEntry(term: string, options: FetchOptions = {}): Promise<Entry> {
  const lang = options.lang || "en";
  const wikitext = await fetchWikitext(term);

  const heading = languageName(lang);
  const body = languageSection(wikitext, heading);
  const section = body ? { language: heading, body } : firstLanguageSection(wikitext);

  // When the page has no section for the language we asked for, the entry takes
  // on the language it actually found. Leaving `lang` as the requested code let
  // a French-only page be cached, linked and tree-built as though it were
  // English: right content, wrong identity, and a cache key that collides with
  // a genuine English entry for the same spelling.
  const found = section && section.language !== heading ? languageCode(section.language) : undefined;
  const actualLang = found ?? lang;
  const actualName = section?.language ?? heading;

  const base: Entry = {
    term,
    lang: actualLang,
    langName: actualName,
    sections: [],
    source: "none",
    pageUrl: pageUrl(term, actualName),
    fetchedAt: Date.now(),
  };

  if (!section) return base;

  const blocks = etymologySections(section.body);

  // Where a page carries several etymologies it nests its parts of speech under
  // each one, so senses pair with the origin they belong to. Where it carries a
  // single etymology the parts of speech are its siblings and apply to all of it.
  const scopes = blocks.length > 1 ? etymologyScopes(section.body) : [];
  const shared = blocks.length > 1 ? [] : partsOfSpeech(section.body);
  const definitionsAt = (i: number): PosSection[] => (blocks.length > 1 ? partsOfSpeech(scopes[i] ?? "") : shared);

  // A word can have definitions and no etymology at all. Showing what it means
  // beats an empty pane saying Wiktionary knows nothing about it.
  if (blocks.length === 0) {
    const only = renderDefinitions(shared);
    return {
      ...base,
      sections: only.length ? [{ definitions: only }] : [],
      source: only.length ? "prose" : "none",
    };
  }

  // Name every language the page mentions before rendering, so prose never leaks
  // a bare code. One batched request, only for codes missing from the bundle.
  await resolveUnknownLanguages(blocks.flatMap((b) => languageCodes(b.body)));

  const multiple = blocks.length > 1;
  const sections: EtymSection[] = blocks.map((block, i) => ({
    label: multiple ? block.label : undefined,
    prose: toPlainText(block.body, languageName) || undefined,
    tree: buildTree(term, actualLang, block.body),
    definitions: renderDefinitions(definitionsAt(i)),
  }));

  let source: Entry["source"] = sections.some((s) => s.tree)
    ? "templates"
    : sections.some((s) => s.prose)
      ? "prose"
      : "none";

  // Upgrade to the rendered tree where one exists. Positional pairing: both lists
  // are in document order, and a page lists its etymology sections once.
  const treeBlocks = blocks.filter((b) => HAS_TREE.test(b.body));
  const partial = Boolean(options.skipTree) && treeBlocks.length > 0;

  if (!options.skipTree && treeBlocks.length > 0) {
    const trees = treesForLanguage(await fetchHtml(term), actualLang);
    let next = 0;

    for (let i = 0; i < blocks.length; i++) {
      if (!HAS_TREE.test(blocks[i].body)) continue;
      const tree = trees[next++];
      if (tree) {
        sections[i].tree = tree.root;
        source = "tree";
      }
    }
  }

  return { ...base, sections, source, partial };
}

/** Sense wikitext down to prose, dropping any that render to nothing. */
function renderDefinitions(sections: PosSection[]): Definition[] {
  return sections
    .map((section) => ({
      pos: section.pos,
      glosses: section.senses.map((s) => toPlainText(s, languageName)).filter(Boolean),
    }))
    .filter((d) => d.glosses.length > 0);
}

/**
 * A page reached by following an ancestor may not carry the language we asked
 * for, usually because the term is reconstructed and lives under a different
 * heading. Showing that page's first language beats showing nothing.
 */
function firstLanguageSection(wikitext: string): { language: string; body: string } | undefined {
  const m = /^==\s*([^=\n][^\n]*?)\s*==[ \t]*$/m.exec(wikitext);
  if (!m) return undefined;

  const body = languageSection(wikitext, m[1]);
  return body ? { language: m[1], body } : undefined;
}
