import { isScalar, type LineCounter, parseAllDocuments, visit } from "yaml";

import { GlossaryError } from "./glossary-error";
import type { ParsedGlossaryDocument } from "./glossary-types";

export const parseGlossaryDocument = (source: string, lineCounter: LineCounter): ParsedGlossaryDocument => {
  const documents = parseAllDocuments(source, { lineCounter, prettyErrors: false, strict: true });
  const parseError = documents.find((document) => document.errors.length > 0)?.errors[0];
  if (parseError) {
    const line = lineCounter.linePos(parseError.pos[0]).line;
    throw new GlossaryError("invalid-yaml", `The glossary contains invalid YAML near line ${line}.`, line);
  }

  if (documents.length !== 1) {
    const line = lineCounter.linePos(documents[1]?.range[0] ?? 0).line;
    throw new GlossaryError(
      "multiple-documents",
      `The glossary must contain exactly one YAML document near line ${line}.`,
      line,
    );
  }

  return documents[0];
};

const findUnsupportedYamlOffset = (document: ParsedGlossaryDocument): number | null => {
  let offset: number | null = null;
  visit(document, {
    Alias(_key, node) {
      offset = node.range?.[0] ?? 0;
      return visit.BREAK;
    },
    Node(_key, node) {
      if (node.anchor || node.tag) {
        offset = node.range?.[0] ?? 0;
        return visit.BREAK;
      }
    },
    Pair(_key, pair) {
      if (isScalar(pair.key) && pair.key.value === "<<") {
        offset = pair.key.range?.[0] ?? 0;
        return visit.BREAK;
      }
    },
  });
  return offset;
};

export const rejectUnsupportedYaml = (
  source: string,
  document: ParsedGlossaryDocument,
  lineCounter: LineCounter,
): void => {
  const directiveOffset = /^%/m.exec(source)?.index;
  const warning = document.warnings[0];
  if (typeof directiveOffset === "number" || warning) {
    const line = lineCounter.linePos(directiveOffset ?? warning?.pos[0] ?? 0).line;
    throw new GlossaryError(
      "unsupported-yaml",
      `The glossary uses an unsupported YAML construct near line ${line}.`,
      line,
    );
  }

  const unsupportedOffset = findUnsupportedYamlOffset(document);
  if (unsupportedOffset !== null) {
    const line = lineCounter.linePos(unsupportedOffset).line;
    throw new GlossaryError(
      "unsupported-yaml",
      `The glossary uses an unsupported YAML construct near line ${line}.`,
      line,
    );
  }
};
