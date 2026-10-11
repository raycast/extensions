// The cheap path, and the only one guaranteed to exist.
//
// action=parse&prop=wikitext (4-32 KB, ~0.7s). Wiktionary writes ancestry out
// linearly - "From {{inh|en|enm|water}}, from {{inh|en|ang|wæter|t=water}}, from
// {{inh|en|gmw-pro|*watar}}" - so the templates in document order already are
// the chain. No prose understanding required.
//
// Produces a shallower tree than sources/tree.ts: it sees only what this one page
// states, where the rendered tree has followed every ancestor's own page.

import { EtymNode, Relation } from "../model";
import { languageName } from "../langcodes";
import { isAncestral, isMultiPart, relationOf } from "./relations";
import { Template, parseTemplates, stripMarkup } from "./wikitext";

/**
 * Two accounts of a word can appear in one section: a chain of ancestors, and a
 * statement of how the word was built from parts. `cereal` has both. They hang
 * off the headword as separate branches rather than being forced into one line.
 */
export function buildTree(headword: string, lang: string, body: string): EtymNode | undefined {
  const chain: EtymNode[] = [];
  const parts: EtymNode[] = [];
  const roots: EtymNode[] = [];

  for (const t of parseTemplates(body)) {
    const relation = relationOf(t.name);
    if (!relation || !isAncestral(relation)) continue;

    if (relation === "root") {
      roots.push(...components(t, relation));
    } else if (isMultiPart(t.name)) {
      parts.push(...components(t, relation));
    } else {
      const node = ancestor(t, relation);
      if (node) chain.push(node);
    }
  }

  // Nest the chain: each ancestor is the parent of the one named before it.
  for (let i = chain.length - 1; i > 0; i--) chain[i - 1].children.push(chain[i]);

  const children = [...(chain.length ? [chain[0]] : []), ...parts, ...roots];
  if (children.length === 0) return undefined;

  return {
    term: headword,
    title: headword,
    lang,
    langName: languageName(lang),
    relation: "unknown",
    hasPage: true,
    children,
  };
}

/** `{{inh|en|enm|water|alt|gloss}}` - arg 1 is the source language, 2 the term. */
function ancestor(t: Template, relation: Relation): EtymNode | undefined {
  const lang = t.args[1];
  const title = t.args[2] ?? "";
  const display = t.named.alt || t.args[3] || title;
  if (!lang || !display) return undefined;

  return {
    term: stripMarkup(display),
    title: stripMarkup(title),
    lang,
    langName: languageName(lang),
    relation,
    gloss: pick(t.named.t, t.named.gloss, t.args[4]),
    transliteration: t.named.tr || undefined,
    hasPage: Boolean(title),
    children: [],
  };
}

/**
 * `{{af|en|Ceres|-al|alt1=Cere(s)}}`, `{{suffix|en||-ic}}`, `{{root|en|ine-pro|*ḱer-}}`.
 * Argument 0 is the language and the rest are components, each optionally
 * redirected to another language by `langN=`. An empty component is the headword
 * standing in for itself, which carries no information here.
 */
function components(t: Template, relation: Relation): EtymNode[] {
  const defaultLang = relation === "root" ? t.args[1] : t.args[0];
  const from = relation === "root" ? 2 : 1;
  const out: EtymNode[] = [];

  for (let i = from; i < t.args.length; i++) {
    const title = t.args[i];
    if (!title) continue;

    const n = i - from + 1;
    const lang = t.named[`lang${n}`] || defaultLang;
    const display = t.named[`alt${n}`] || title;

    out.push({
      term: stripMarkup(display),
      title: stripMarkup(title),
      lang,
      langName: languageName(lang),
      relation,
      gloss: pick(t.named[`t${n}`], t.named[`gloss${n}`]),
      hasPage: true,
      children: [],
    });
  }
  return out;
}

/** Every language code the section mentions, for resolving names not yet bundled. */
export function languageCodes(body: string): string[] {
  const out: string[] = [];
  for (const t of parseTemplates(body)) {
    const relation = relationOf(t.name);
    if (!relation) continue;
    out.push(relation === "root" ? t.args[1] : isMultiPart(t.name) ? t.args[0] : t.args[1]);
    for (const [key, value] of Object.entries(t.named)) if (/^lang\d+$/.test(key)) out.push(value);
  }
  return out.filter(Boolean);
}

function pick(...values: (string | undefined)[]): string | undefined {
  const found = values.find(Boolean);
  return found ? stripMarkup(found) : undefined;
}
