import { isMap, isNode, isScalar, isSeq, type LineCounter, type ParsedNode, type YAMLSeq } from "yaml";

import { parseGlossaryEntry } from "./glossary-entry";
import { createInvalidRootError } from "./glossary-error";
import type { ParsedGlossaryDocument } from "./glossary-types";
import type { Term } from "./utils/types";

const getTermsSequence = (contents: ParsedNode | null, lineCounter: LineCounter): YAMLSeq<unknown> => {
  if (!isMap(contents)) {
    throw createInvalidRootError(lineCounter, contents?.range);
  }

  const invalidRootPair = contents.items.find((pair) => !isScalar(pair.key) || pair.key.value !== "terms");
  if (invalidRootPair) {
    throw createInvalidRootError(
      lineCounter,
      isScalar(invalidRootPair.key) ? invalidRootPair.key.range : contents.range,
    );
  }

  if (contents.items.length !== 1) {
    throw createInvalidRootError(lineCounter, contents.range);
  }

  const termsPair = contents.items[0];
  if (!isScalar(termsPair.key) || termsPair.key.value !== "terms") {
    throw createInvalidRootError(lineCounter, isScalar(termsPair.key) ? termsPair.key.range : contents.range);
  }

  if (!isSeq(termsPair.value)) {
    throw createInvalidRootError(lineCounter, isNode(termsPair.value) ? termsPair.value.range : termsPair.key.range);
  }

  return termsPair.value;
};

export const parseGlossaryTerms = (document: ParsedGlossaryDocument, lineCounter: LineCounter): readonly Term[] => {
  const termsSequence = getTermsSequence(document.contents, lineCounter);
  const terms: Term[] = [];
  for (const [index, entry] of termsSequence.items.entries()) {
    terms.push(parseGlossaryEntry(entry, index, terms, lineCounter, termsSequence.range));
  }
  return Object.freeze(terms);
};
