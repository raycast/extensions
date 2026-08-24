import { isNode, isScalar, type LineCounter, type Pair } from "yaml";

import { getEntryPairs, getNodeRange } from "./glossary-entry-fields";
import { createLocatedError } from "./glossary-error";
import type { SourceRange } from "./glossary-types";
import { areTermsEquivalent } from "./search";
import type { Term } from "./utils/types";

const parseTermValue = (termPair: Pair<unknown, unknown>, index: number, lineCounter: LineCounter): string => {
  const termNode = termPair.value;
  if (
    !isScalar(termNode) ||
    typeof termNode.value !== "string" ||
    termNode.value.length === 0 ||
    termNode.value.trim() !== termNode.value
  ) {
    throw createLocatedError(
      "invalid-schema",
      `Entry ${index + 1} term must be a non-empty string without surrounding whitespace`,
      lineCounter,
      getNodeRange(termNode, termPair.key),
    );
  }
  return termNode.value;
};

const parseDefinitionValue = (
  definitionPair: Pair<unknown, unknown>,
  index: number,
  lineCounter: LineCounter,
): string => {
  const definitionNode = definitionPair.value;
  if (!isScalar(definitionNode) || typeof definitionNode.value !== "string" || definitionNode.value.length === 0) {
    throw createLocatedError(
      "invalid-schema",
      `Entry ${index + 1} definition must be a non-empty string`,
      lineCounter,
      getNodeRange(definitionNode, definitionPair.key),
    );
  }
  return definitionNode.value;
};

export const parseGlossaryEntry = (
  entry: unknown,
  index: number,
  terms: readonly Term[],
  lineCounter: LineCounter,
  sequenceRange: SourceRange,
): Term => {
  const { definitionPair, termPair } = getEntryPairs(entry, index, lineCounter, sequenceRange);
  const termValue = parseTermValue(termPair, index, lineCounter);
  const definitionValue = parseDefinitionValue(definitionPair, index, lineCounter);

  if (terms.some((term) => areTermsEquivalent(term.term, termValue))) {
    throw createLocatedError(
      "duplicate-term",
      `Entry ${index + 1} duplicates another term`,
      lineCounter,
      isNode(termPair.value) ? termPair.value.range : null,
    );
  }

  return Object.freeze({ definition: definitionValue, term: termValue });
};
