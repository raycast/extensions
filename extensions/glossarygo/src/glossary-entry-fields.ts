import { isMap, isNode, isScalar, type LineCounter, type YAMLMap } from "yaml";

import { createLocatedError } from "./glossary-error";
import type { EntryPairs, SourceRange } from "./glossary-types";

export const getNodeRange = (node: unknown, fallbackNode: unknown): SourceRange => {
  if (isNode(node)) {
    return node.range;
  }
  if (isNode(fallbackNode)) {
    return fallbackNode.range;
  }
  return null;
};

const validateEntryFields = (entry: YAMLMap<unknown, unknown>, message: string, lineCounter: LineCounter): void => {
  const fieldNames = new Set<string>();
  let invalidFieldRange: SourceRange = null;
  for (const pair of entry.items) {
    if (!isScalar(pair.key) || (pair.key.value !== "term" && pair.key.value !== "definition")) {
      invalidFieldRange = isScalar(pair.key) ? pair.key.range : entry.range;
      break;
    }
    fieldNames.add(pair.key.value);
  }

  if (invalidFieldRange) {
    throw createLocatedError("invalid-schema", message, lineCounter, invalidFieldRange);
  }

  if (entry.items.length !== 2 || !fieldNames.has("term") || !fieldNames.has("definition")) {
    throw createLocatedError("invalid-schema", message, lineCounter, invalidFieldRange ?? entry.range);
  }
};

export const getEntryPairs = (
  entry: unknown,
  index: number,
  lineCounter: LineCounter,
  sequenceRange: SourceRange,
): EntryPairs => {
  const message = `Entry ${index + 1} must contain exactly the term and definition fields`;
  if (!isMap(entry)) {
    throw createLocatedError("invalid-schema", message, lineCounter, isNode(entry) ? entry.range : sequenceRange);
  }

  validateEntryFields(entry, message, lineCounter);
  const termPair = entry.items.find((pair) => isScalar(pair.key) && pair.key.value === "term");
  const definitionPair = entry.items.find((pair) => isScalar(pair.key) && pair.key.value === "definition");
  if (!termPair || !definitionPair) {
    throw createLocatedError("invalid-schema", message, lineCounter, entry.range);
  }

  return { definitionPair, termPair };
};
