// ─── Definition ──────────────────────────────────────────────────────────────

export interface DefinitionExample {
  text: string;
  author?: string;
  date?: string;
}

export interface DefinitionSubSection {
  label: string; // "a)", "b)", "α)", …
  text: string;
  examples: DefinitionExample[];
}

export interface DefinitionSection {
  /** Roman numeral or Arabic numeral label, e.g. "I", "II", "1", "2" */
  label: string;
  /** Short semantic label when available, e.g. "[Sens spatial]" */
  qualifier?: string;
  text: string;
  examples: DefinitionExample[];
  subSections: DefinitionSubSection[];
}

export interface DefinitionEntry {
  /** Normalised headword as returned by CNRTL */
  word: string;
  /** Grammatical category: "subst. fém.", "verbe trans.", … */
  partOfSpeech?: string;
  /** Variant spellings listed in the entry */
  variants?: string[];
  sections: DefinitionSection[];
  /** Plain-text version of the full entry (for copy/clipboard) */
  rawText: string;
  url: string;
}

// ─── Synonym / Antonym ────────────────────────────────────────────────────────

export type SynonymDegree = 1 | 2 | 3;

export interface SynonymEntry {
  word: string;
  /** Degree of proximity: 3 = very close, 2 = close, 1 = related */
  degree?: SynonymDegree;
  /** Semantic domain or register, e.g. "familier", "technique" */
  domain?: string;
  url: string;
}

export interface SynonymResult {
  word: string;
  /** Grouped by semantic section (may be a single group) */
  groups: SynonymGroup[];
  url: string;
}

export interface SynonymGroup {
  label?: string;
  entries: SynonymEntry[];
}

// ─── Etymology ────────────────────────────────────────────────────────────────

export interface EtymologyEntry {
  /** Approximate period/date if mentioned, e.g. "XIIe s." */
  period?: string;
  /** Language of origin, e.g. "latin", "grec ancien" */
  origin?: string;
  content: string;
  url: string;
}

// ─── Morphology ───────────────────────────────────────────────────────────────

export interface MorphologyForm {
  /** Inflection label, e.g. "Présent 1ère pers. sg." */
  label: string;
  form: string;
}

export interface MorphologyEntry {
  word: string;
  /** e.g. "verbe", "nom", "adjectif" */
  category?: string;
  forms: MorphologyForm[];
  url: string;
}

// ─── Shared result wrapper ────────────────────────────────────────────────────

export type CnrtlEndpoint = "definition" | "synonymie" | "antonymie" | "etymologie" | "morphologie";

export interface CnrtlError {
  type: "not_found" | "network" | "parse" | "unknown";
  message: string;
  word: string;
  endpoint: CnrtlEndpoint;
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  word: string;
  timestamp: number;
  endpoint: CnrtlEndpoint;
}
