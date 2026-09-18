// Wiktionary names its derivations twice: the wikitext templates use short codes
// ({{inh}}, {{bor+}}, {{lbor}}) and the rendered etymology tree uses a mix of
// long words and short codes ("inherited", "bor", "uder"). One table covers both
// so that the two parsers cannot disagree about what a link means.

import { Relation } from "../model";

const RELATIONS: Record<string, Relation> = {
  // inherited
  inh: "inherited",
  inherit: "inherited",
  inherited: "inherited",

  // borrowed
  bor: "borrowed",
  borrow: "borrowed",
  borrowed: "borrowed",
  ubor: "borrowed",
  obor: "borrowed",
  psm: "borrowed",
  "phono-semantic matching": "borrowed",

  // learned borrowing, kept apart because it is the interesting case for a
  // reader: the word re-entered through scholarship, not through speech.
  lbor: "learned-borrowing",
  slbor: "learned-borrowing",
  "learned borrowing": "learned-borrowing",
  "semi-learned borrowing": "learned-borrowing",

  // derived
  der: "derived",
  derive: "derived",
  derived: "derived",
  uder: "derived",
  from: "derived",
  nominalization: "derived",
  "semantic loan": "derived",
  sl: "derived",

  // morphological
  af: "affix",
  affix: "affix",
  suffix: "affix",
  suf: "affix",
  prefix: "affix",
  pre: "affix",
  confix: "affix",
  com: "affix",
  compound: "affix",
  blend: "affix",
  surf: "affix",
  univerbation: "affix",
  univ: "affix",

  // calque
  cal: "calque",
  calq: "calque",
  calque: "calque",
  clq: "calque",

  root: "root",

  cog: "cognate",
  cognate: "cognate",
  ncog: "cognate",
  noncog: "cognate",
  doublet: "cognate",

  influence: "influenced",
  influenced: "influenced",
};

/** Templates whose arguments are a list of components rather than one ancestor. */
const MULTI_PART = new Set([
  "af",
  "affix",
  "suffix",
  "suf",
  "prefix",
  "pre",
  "confix",
  "com",
  "compound",
  "blend",
  "surf",
  "univerbation",
  "univ",
  "root",
]);

/** A trailing "+" means "render introductory text too"; it does not change meaning. */
function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\+$/, "");
}

export function relationOf(name: string): Relation | undefined {
  return RELATIONS[normalize(name)];
}

export function isMultiPart(name: string): boolean {
  return MULTI_PART.has(normalize(name));
}

/** True for links that describe ancestry rather than a sideways comparison. */
export function isAncestral(relation: Relation): boolean {
  return relation !== "cognate" && relation !== "unknown";
}

export const RELATION_LABELS: Record<Relation, string> = {
  inherited: "inherited from",
  borrowed: "borrowed from",
  "learned-borrowing": "learned borrowing from",
  derived: "from",
  affix: "formed from",
  calque: "calque of",
  root: "root",
  cognate: "cognate with",
  influenced: "influenced by",
  unknown: "from",
};

/**
 * Gutter mark in the rendered tree. Two arrows rather than one word per line: at
 * depth eleven the relation names are longer than the terms they describe, and
 * the distinction that actually matters to a reader is passed down versus taken in.
 */
export const RELATION_MARKS: Record<Relation, string> = {
  inherited: "←",
  derived: "←",
  unknown: "←",
  borrowed: "⇠",
  "learned-borrowing": "⇠",
  calque: "=",
  affix: "+",
  root: "√",
  influenced: "≈",
  cognate: "|",
};

/**
 * Legend names. Keyed by relation rather than by mark, because two relations
 * share a mark: "←" covers both inheritance and derivation, and calling a
 * borrowing from Spanish "inherited" is the one thing an etymology must not do.
 */
export const RELATION_SHORT: Record<Relation, string> = {
  inherited: "inherited",
  derived: "derived",
  borrowed: "borrowed",
  "learned-borrowing": "learned borrowing",
  calque: "calque",
  affix: "component",
  root: "root",
  influenced: "influenced",
  cognate: "cognate",
  unknown: "from",
};
