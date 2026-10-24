// Amino acid reference data and lookup logic. No Raycast imports here, so this
// file can be tested with plain Node (see test/amino-acids.test.ts).

type SideChain =
  | "Nonpolar, aliphatic"
  | "Aromatic"
  | "Polar, uncharged"
  | "Positively charged"
  | "Negatively charged"
  | "Non-standard"
  | "Ambiguity code"
  | "Stop";

export interface AminoAcid {
  oneLetter: string;
  threeLetter: string;
  name: string;
  /** Side-chain class, as in common textbook groupings. */
  sideChain: SideChain;
  /** One of the 20 amino acids of the standard genetic code. */
  standard: boolean;
  /** Average molecular weight of the free amino acid, g/mol. */
  mw?: number;
  /** DNA codons in the standard genetic code. */
  codons?: string[];
  /** Other names people type, e.g. "aspartate". */
  synonyms?: string[];
  note?: string;
}

/** The three ways of writing an amino acid. Matches the field names on AminoAcid. */
export type Notation = "oneLetter" | "threeLetter" | "name";

// One entry per line so the table can be proofread at a glance.
// prettier-ignore
const AMINO_ACIDS: AminoAcid[] = [
  { oneLetter: "A", threeLetter: "Ala", name: "Alanine",       sideChain: "Nonpolar, aliphatic", standard: true, mw: 89.09,  codons: ["GCT", "GCC", "GCA", "GCG"] },
  { oneLetter: "R", threeLetter: "Arg", name: "Arginine",      sideChain: "Positively charged",  standard: true, mw: 174.2,  codons: ["CGT", "CGC", "CGA", "CGG", "AGA", "AGG"] },
  { oneLetter: "N", threeLetter: "Asn", name: "Asparagine",    sideChain: "Polar, uncharged",    standard: true, mw: 132.12, codons: ["AAT", "AAC"] },
  { oneLetter: "D", threeLetter: "Asp", name: "Aspartic acid", sideChain: "Negatively charged",  standard: true, mw: 133.1,  codons: ["GAT", "GAC"], synonyms: ["Aspartate"] },
  { oneLetter: "C", threeLetter: "Cys", name: "Cysteine",      sideChain: "Polar, uncharged",    standard: true, mw: 121.16, codons: ["TGT", "TGC"] },
  { oneLetter: "Q", threeLetter: "Gln", name: "Glutamine",     sideChain: "Polar, uncharged",    standard: true, mw: 146.15, codons: ["CAA", "CAG"] },
  { oneLetter: "E", threeLetter: "Glu", name: "Glutamic acid", sideChain: "Negatively charged",  standard: true, mw: 147.13, codons: ["GAA", "GAG"], synonyms: ["Glutamate"] },
  { oneLetter: "G", threeLetter: "Gly", name: "Glycine",       sideChain: "Nonpolar, aliphatic", standard: true, mw: 75.07,  codons: ["GGT", "GGC", "GGA", "GGG"] },
  { oneLetter: "H", threeLetter: "His", name: "Histidine",     sideChain: "Positively charged",  standard: true, mw: 155.16, codons: ["CAT", "CAC"] },
  { oneLetter: "I", threeLetter: "Ile", name: "Isoleucine",    sideChain: "Nonpolar, aliphatic", standard: true, mw: 131.17, codons: ["ATT", "ATC", "ATA"] },
  { oneLetter: "L", threeLetter: "Leu", name: "Leucine",       sideChain: "Nonpolar, aliphatic", standard: true, mw: 131.17, codons: ["TTA", "TTG", "CTT", "CTC", "CTA", "CTG"] },
  { oneLetter: "K", threeLetter: "Lys", name: "Lysine",        sideChain: "Positively charged",  standard: true, mw: 146.19, codons: ["AAA", "AAG"] },
  { oneLetter: "M", threeLetter: "Met", name: "Methionine",    sideChain: "Nonpolar, aliphatic", standard: true, mw: 149.21, codons: ["ATG"], note: "Start codon" },
  { oneLetter: "F", threeLetter: "Phe", name: "Phenylalanine", sideChain: "Aromatic",            standard: true, mw: 165.19, codons: ["TTT", "TTC"] },
  { oneLetter: "P", threeLetter: "Pro", name: "Proline",       sideChain: "Nonpolar, aliphatic", standard: true, mw: 115.13, codons: ["CCT", "CCC", "CCA", "CCG"] },
  { oneLetter: "S", threeLetter: "Ser", name: "Serine",        sideChain: "Polar, uncharged",    standard: true, mw: 105.09, codons: ["TCT", "TCC", "TCA", "TCG", "AGT", "AGC"] },
  { oneLetter: "T", threeLetter: "Thr", name: "Threonine",     sideChain: "Polar, uncharged",    standard: true, mw: 119.12, codons: ["ACT", "ACC", "ACA", "ACG"] },
  { oneLetter: "W", threeLetter: "Trp", name: "Tryptophan",    sideChain: "Aromatic",            standard: true, mw: 204.23, codons: ["TGG"] },
  { oneLetter: "Y", threeLetter: "Tyr", name: "Tyrosine",      sideChain: "Aromatic",            standard: true, mw: 181.19, codons: ["TAT", "TAC"] },
  { oneLetter: "V", threeLetter: "Val", name: "Valine",        sideChain: "Nonpolar, aliphatic", standard: true, mw: 117.15, codons: ["GTT", "GTC", "GTA", "GTG"] },

  { oneLetter: "U", threeLetter: "Sec", name: "Selenocysteine", sideChain: "Non-standard", standard: false, mw: 168.06, codons: ["TGA"], note: "TGA read through via SECIS element" },
  { oneLetter: "O", threeLetter: "Pyl", name: "Pyrrolysine",    sideChain: "Non-standard", standard: false, mw: 255.32, codons: ["TAG"], note: "TAG read through in some archaea and bacteria" },

  { oneLetter: "B", threeLetter: "Asx", name: "Asparagine or aspartic acid", sideChain: "Ambiguity code", standard: false },
  { oneLetter: "Z", threeLetter: "Glx", name: "Glutamine or glutamic acid",  sideChain: "Ambiguity code", standard: false },
  { oneLetter: "J", threeLetter: "Xle", name: "Leucine or isoleucine",       sideChain: "Ambiguity code", standard: false },
  { oneLetter: "X", threeLetter: "Xaa", name: "Any amino acid",              sideChain: "Ambiguity code", standard: false, synonyms: ["Unknown"] },
  { oneLetter: "*", threeLetter: "Ter", name: "Stop",                        sideChain: "Stop",           standard: false, codons: ["TAA", "TAG", "TGA"], synonyms: ["Termination", "Stop codon"] },
];

export const STANDARD_AMINO_ACIDS = AMINO_ACIDS.filter((aa) => aa.standard);

// ---------------------------------------------------------------------------
// Code lookups

const byOneLetter = new Map(AMINO_ACIDS.map((aa) => [aa.oneLetter, aa]));
const byThreeLetter = new Map(AMINO_ACIDS.map((aa) => [aa.threeLetter.toLowerCase(), aa]));
const STOP = byOneLetter.get("*") as AminoAcid;
// Also accept "Stop" and "*" as three-letter stop tokens, alongside "Ter".
byThreeLetter.set("stop", STOP);
byThreeLetter.set("*", STOP);

function fromOneLetter(code: string): AminoAcid | undefined {
  return byOneLetter.get(code.toUpperCase());
}

function fromThreeLetter(code: string): AminoAcid | undefined {
  return byThreeLetter.get(code.toLowerCase());
}

/** Look up every code; undefined if any of them is not a valid code. */
function lookupAll(codes: string[], lookup: (code: string) => AminoAcid | undefined): AminoAcid[] | undefined {
  const residues: AminoAcid[] = [];
  for (const code of codes) {
    const aa = lookup(code);
    if (!aa) return undefined;
    residues.push(aa);
  }
  return residues;
}

// ---------------------------------------------------------------------------
// Single amino acid search

/** How well a search matched. Lower values are listed first. */
const MatchQuality = {
  Exact: 0,
  NameStartsWith: 1,
  CodeStartsWith: 2,
  NameContains: 3,
} as const;

export interface ResidueMatch {
  aa: AminoAcid;
  /** Which notation the user typed, so the UI can offer the other ones first. */
  typed: Notation;
  quality: number;
}

function matchResidue(aa: AminoAcid, q: string): ResidueMatch | undefined {
  const names = [aa.name, ...(aa.synonyms ?? [])].map((n) => n.toLowerCase());
  const three = aa.threeLetter.toLowerCase();
  const match = (typed: Notation, quality: number): ResidueMatch => ({ aa, typed, quality });

  if (q.length === 1 && aa.oneLetter.toLowerCase() === q) return match("oneLetter", MatchQuality.Exact);
  if (three === q) return match("threeLetter", MatchQuality.Exact);
  if (names.includes(q)) return match("name", MatchQuality.Exact);
  if (q.length < 2) return undefined;
  if (names.some((n) => n.startsWith(q))) return match("name", MatchQuality.NameStartsWith);
  if (three.startsWith(q)) return match("threeLetter", MatchQuality.CodeStartsWith);
  if (q.length >= 3 && names.some((n) => n.includes(q))) return match("name", MatchQuality.NameContains);
  return undefined;
}

/** Amino acids whose code or name matches the query, best matches first. */
export function findResidues(query: string): ResidueMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return AMINO_ACIDS.map((aa) => matchResidue(aa, q))
    .filter((m): m is ResidueMatch => m !== undefined)
    .sort((a, b) => a.quality - b.quality || Number(b.aa.standard) - Number(a.aa.standard));
}

// ---------------------------------------------------------------------------
// Whole sequence conversion

export interface SequenceConversion {
  direction: "threeToOne" | "oneToThree";
  input: string;
  residues: AminoAcid[];
  output: string;
}

/** Split "Met-Lys-Thr", "Met Lys Thr" or "MetLysThr" into codes. */
function splitThreeLetterSequence(s: string): string[] | undefined {
  if (/[-\s,.]/.test(s)) {
    const parts = s.split(/[-\s,.]+/).filter(Boolean);
    return parts.length >= 2 ? parts : undefined;
  }
  if (s.length >= 6 && s.length % 3 === 0) return s.match(/.{3}/g) ?? undefined;
  return undefined;
}

/** Read the query as a three-letter sequence, e.g. "Met-Lys-Thr" → "MKT". */
export function threeToOne(query: string): SequenceConversion | undefined {
  const input = query.trim();
  const codes = splitThreeLetterSequence(input);
  const residues = codes && lookupAll(codes, fromThreeLetter);
  if (!residues) return undefined;
  return { direction: "threeToOne", input, residues, output: residues.map((aa) => aa.oneLetter).join("") };
}

/** Read the query as a one-letter sequence, e.g. "MKT" → "Met-Lys-Thr". Whitespace is ignored. */
export function oneToThree(query: string): SequenceConversion | undefined {
  const input = query.replace(/\s+/g, "").toUpperCase();
  if (input.length < 2) return undefined;
  const residues = lookupAll([...input], fromOneLetter);
  if (!residues) return undefined;
  return { direction: "oneToThree", input, residues, output: residues.map((aa) => aa.threeLetter).join("-") };
}

/** Average mass of a peptide: residue masses minus one water per peptide bond. */
export function peptideMass(residues: AminoAcid[]): number | undefined {
  const WATER = 18.02;
  let sum = 0;
  for (const aa of residues) {
    if (aa.mw === undefined) return undefined;
    sum += aa.mw;
  }
  return sum - WATER * (residues.length - 1);
}
