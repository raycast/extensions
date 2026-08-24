import type { LineCounter } from "yaml";

import type { SourceRange } from "./glossary-types";

export type GlossaryErrorCode =
  | "duplicate-term"
  | "invalid-encoding"
  | "invalid-extension"
  | "invalid-schema"
  | "invalid-yaml"
  | "multiple-documents"
  | "too-large"
  | "unsupported-yaml"
  | "unreadable";

export class GlossaryError extends Error {
  constructor(
    readonly code: GlossaryErrorCode,
    message: string,
    readonly line?: number,
  ) {
    super(message);
    this.name = "GlossaryError";
  }
}

export const createLocatedError = (
  code: GlossaryErrorCode,
  message: string,
  lineCounter: LineCounter,
  range: SourceRange,
): GlossaryError => {
  const line = lineCounter.linePos(range?.[0] ?? 0).line;
  return new GlossaryError(code, `${message} near line ${line}.`, line);
};

export const createUnreadableError = (): GlossaryError => {
  return new GlossaryError(
    "unreadable",
    "The glossary file could not be read. Check that it still exists and is accessible.",
  );
};

export const createInvalidRootError = (lineCounter: LineCounter, range: SourceRange): GlossaryError => {
  return createLocatedError(
    "invalid-schema",
    "The glossary root must contain exactly one terms sequence",
    lineCounter,
    range,
  );
};
