import type { Document, Pair } from "yaml";

export type ParsedGlossaryDocument = Document.Parsed;
export type SourceRange = readonly number[] | null | undefined;
export type EntryPairs = Readonly<{
  definitionPair: Pair<unknown, unknown>;
  termPair: Pair<unknown, unknown>;
}>;
