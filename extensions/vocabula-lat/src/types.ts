export interface DictionaryWord {
  definitions: string[];
  text: string;
  transformed: Transformed[];
  output: string;
}

export interface Transformed {
  additional: [];
  translation: string[];
  grammar: Grammar[];
  definition: Definition;
}

export interface Definition {
  base: string;
  infinitive: string;
  genitive: string;
  comparative: string;
  indicative: string;
  perfectum: string;
  supinum: string;
  supine: string;
  part_of_speech: string;
  gender: string;
  dictionary: Dictionary;
}

export interface Dictionary {
  age: Age;
  area: string;
  geo: string;
  frequency: Frequency;
  source: string;
  raw: Raw;
}

export interface Age {
  short: string;
  long: string;
}

export interface Frequency {
  short: string;
  long: string;
  number: number;
}

export interface Raw {
  age: string;
  area: string;
  geo: string;
  frequency: string;
  source: string;
}

export interface Grammar {
  word: string;
  part_of_speech: PartOfSpeech;
  declension: DeclensionType;
  case: CaseType;
  number: NumberType;
  gender: GenderType;
  conjugation: string[];
  comparison_type: ComparisonType;
  tense: TenseType;
  voice: VoiceType;
  mood: MoodType;
}

export interface LexicalData {
  pos: PosMap;
  declension: DeclensionMap;
  conjugation: ConjugationMap;
  case: CaseMap;
  number: NumberMap;
  gender: GenderMap;
  comparison_type: ComparisonTypeMap;
  tense: TenseMap;
  voice: VoiceMap;
  mood: MoodMap;
  definition: DefinitionMap; // Assuming 'definition' obeys some previously defined structure or any for simplicity
  dict: DictionaryMap; // Assuming this is available
}

type PartOfSpeech =
  | "X"
  | "N"
  | "PRON"
  | "PACK"
  | "ADJ"
  | "NUM"
  | "ADV"
  | "V"
  | "VPAR"
  | "SUPINE"
  | "PREP"
  | "CONJ"
  | "INTERJ"
  | "TACKON"
  | "PREFIX"
  | "SUFFIX";

interface PosMap {
  title: string;
  X: string;
  N: string;
  PRON: string;
  PACK: string;
  ADJ: string;
  NUM: string;
  ADV: string;
  V: string;
  VPAR: string;
  SUPINE: string;
  PREP: string;
  CONJ: string;
  INTERJ: string;
  TACKON: string;
  PREFIX: string;
  SUFFIX: string;
}

type DeclensionType = "N" | "ADJ";
interface DeclensionMap {
  title: string;
  N: { [key: string]: string };
  ADJ: { [key: string]: string };
}

interface ConjugationMap {
  title: string;
  [key: string]: string;
}

type CaseType = "NOM" | "VOC" | "GEN" | "LOC" | "DAT" | "ABL" | "ACC" | "X";
interface CaseMap {
  title: string;
  NOM: string;
  VOC: string;
  GEN: string;
  LOC: string;
  DAT: string;
  ABL: string;
  ACC: string;
  X: string;
}

type NumberType = "X" | "S" | "P";
interface NumberMap {
  title: string;
  X: string;
  S: string;
  P: string;
}

type GenderType = "X" | "M" | "F" | "N" | "C";
interface GenderMap {
  title: string;
  X: string;
  M: string;
  F: string;
  N: string;
  C: string;
}

type ComparisonType = "X" | "POS" | "COMP" | "SUP";
interface ComparisonTypeMap {
  title: string;
  X: string;
  POS: string;
  COMP: string;
  SUP: string;
}

type TenseType = "X" | "PRES" | "IMPF" | "FUT" | "PERF" | "PLUP" | "FUTP";
interface TenseMap {
  title: string;
  [key: string]: string;
}

type VoiceType = "X" | "ACTIVE" | "PASSIVE";
interface VoiceMap {
  title: string;
  X: string;
  ACTIVE: string;
  PASSIVE: string;
}

type MoodType = "X" | "IND" | "SUB" | "IMP" | "INF" | "PPL";
interface MoodMap {
  title: string;
  X: string;
  IND: string;
  SUB: string;
  IMP: string;
  INF: string;
  PPL: string;
}

interface DefinitionMap {
  infinitive: string;
  indicative: string;
  perfectum: string;
  base: string;
  comparative: string;
  supinum: string;
  genitive: string;
}

interface FrequencyMap {
  title: string;
  [key: string]: string;
}

interface SourceMap {
  title: string;
  [key: string]: string;
}

interface AgeMap {
  title: string;
  [key: string]: string;
}

interface AreaMap {
  title: string;
  [key: string]: string;
}

interface GeoMap {
  title: string;
  [key: string]: string;
}

interface DictionaryMap {
  age: AgeMap;
  area: AreaMap;
  geo: GeoMap;
  frequency: FrequencyMap;
  source: SourceMap;
}

export type AbbreviationListBase = Abbreviation[];

export interface Abbreviation {
  id: number;
  page_id: number;
  characters: string;
  transcription: string;
  period: string;
  language: string;
  position1: string;
  position2: number;
  position3: string;
  position4: string;
  position5: string;
  position6: string;
  position7: string;
  position8: string;
  position9: string;
  x: number;
  y: number;
  width: number;
  height: number;
  unsure: string;
}
