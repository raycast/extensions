import assert from "node:assert/strict";
import { localExtractiveAnalysis } from "../src/local-library/local-analysis";
import {
  renderRenameTemplate,
  validateRenameCandidate,
} from "../src/local-library/validation";
import type { DocumentEvidence } from "../src/local-library/types";
import type { WorkResult } from "../src/types";

const work: WorkResult = {
  id: "doi:10.1000/test",
  title: "Identity in Physics: A Philosophical Analysis",
  authors: ["Steven French", "Décio Krause"],
  year: 2006,
  publisher: "Oxford University Press",
  kind: "book",
  identifiers: { doi: "10.1000/test", isbn: ["9780199278244"] },
  sources: ["Test Metadata"],
  accessLinks: [],
};

const verifiedEvidence: DocumentEvidence = {
  doi: "10.1000/test",
  embeddedAuthors: [],
  ocrTitle: "Identity in Physics A Philosophical Analysis",
  ocrAuthors: ["Steven French", "Decio Krause"],
  ocrText: "Identity in Physics\nSteven French and Decio Krause",
  ocrMethod: "apple-vision",
  ocrCompleted: true,
};

const verified = validateRenameCandidate(verifiedEvidence, work);
assert.equal(
  verified.safe,
  true,
  "concordant identifier, OCR title and OCR authors should pass",
);

const doiOnly = validateRenameCandidate(
  {
    ...verifiedEvidence,
    ocrTitle: undefined,
    ocrAuthors: [],
    ocrCompleted: false,
  },
  work,
);
assert.equal(
  doiOnly.safe,
  false,
  "a DOI alone must never authorize automatic rename",
);

const conflicting = validateRenameCandidate(
  { ...verifiedEvidence, doi: "10.1000/different" },
  work,
);
assert.equal(
  conflicting.safe,
  false,
  "a conflicting strong identifier must block rename",
);

const wrongAuthor = validateRenameCandidate(
  { ...verifiedEvidence, ocrAuthors: ["Completely Different"] },
  work,
);
assert.equal(
  wrongAuthor.safe,
  false,
  "an OCR author disagreement must block rename",
);

assert.equal(
  renderRenameTemplate("{author} - {year} - {type} - {title}", work, "pdf"),
  "Steven French, Décio Krause - 2006 - Book - Identity in Physics - A Philosophical Analysis.pdf",
);

const analysis = localExtractiveAnalysis({
  title: "Reproducible Research",
  authors: ["Ada Researcher"],
  text: "This study presents a reproducible research workflow for digital libraries. The comparative analysis evaluates metadata quality and document retrieval. The results show that identifier validation reduces catalog errors. The method combines a literature review with content analysis.",
  fingerprint: "fixture",
});
assert(analysis.summary.length > 20);
assert(analysis.keyPoints.length > 0);
assert(analysis.keywords.includes("research"));
assert(analysis.methods.includes("comparative analysis"));

console.log(
  "PASS local-library regression: multifactor rename gate, templates and local analysis",
);
