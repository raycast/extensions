import type { DocumentEvidence, RenameValidation } from "./types";
import type { WorkResult } from "../types";
import { normalizeDoi } from "../lib/query";

export function validateRenameCandidate(
  evidence: DocumentEvidence,
  work: WorkResult,
): RenameValidation {
  const evidenceDoi = normalizeDoi(evidence.doi);
  const workDoi = normalizeDoi(work.identifiers.doi);
  const evidenceIsbn = normalizeIdentifier(evidence.isbn);
  const workIsbns = (work.identifiers.isbn ?? []).map(normalizeIdentifier);
  const identifierPassed = Boolean(
    (evidenceDoi && workDoi && evidenceDoi === workDoi) ||
    (evidenceIsbn && workIsbns.includes(evidenceIsbn)),
  );
  const identifierConflict = Boolean(
    (evidenceDoi && workDoi && evidenceDoi !== workDoi) ||
    (evidenceIsbn && workIsbns.length && !workIsbns.includes(evidenceIsbn)),
  );
  const ocrTitle = evidence.ocrTitle?.trim() ?? "";
  const titleScore = similarity(ocrTitle, work.title);
  const titlePassed = titleScore >= 0.82;
  const authorScore = authorOverlap(evidence.ocrAuthors, work.authors);
  const authorPassed = authorScore >= 0.5;
  const ocrPassed = Boolean(
    evidence.ocrCompleted && ocrTitle && evidence.ocrAuthors.length,
  );
  const safe =
    identifierPassed &&
    !identifierConflict &&
    ocrPassed &&
    titlePassed &&
    authorPassed;
  const confidence = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (identifierPassed ? 35 : 0) +
          titleScore * 30 +
          authorScore * 25 +
          (ocrPassed ? 10 : 0) -
          (identifierConflict ? 60 : 0),
      ),
    ),
  );
  const checks: RenameValidation["checks"] = [
    {
      id: "identifier",
      label: "DOI / ISBN",
      passed: identifierPassed,
      detail: identifierConflict
        ? "The file identifier conflicts with the bibliographic record"
        : identifierPassed
          ? "The identifier matches the bibliographic record exactly"
          : "No exact DOI or ISBN match",
    },
    {
      id: "ocr",
      label: "Independent OCR",
      passed: ocrPassed,
      detail: ocrPassed
        ? "OCR independently found a title and author"
        : "OCR did not independently identify both title and author",
    },
    {
      id: "title",
      label: "OCR title",
      passed: titlePassed,
      score: titleScore,
      detail: `${Math.round(titleScore * 100)}% title agreement`,
    },
    {
      id: "author",
      label: "OCR author",
      passed: authorPassed,
      score: authorScore,
      detail: `${Math.round(authorScore * 100)}% author agreement`,
    },
    {
      id: "conflict",
      label: "Contradictions",
      passed: !identifierConflict,
      detail: identifierConflict
        ? "A strong identifier contradicts the selected work"
        : "No strong contradiction was found",
    },
  ];
  return {
    safe,
    confidence,
    checks,
    reason: safe
      ? "Independent metadata, identifier and OCR evidence agree"
      : "Automatic rename is blocked until identifier, OCR title and OCR author all agree",
  };
}

export function sanitizeFilename(value: string): string {
  return value
    .normalize("NFC")
    .replace(/:/g, " - ")
    .replaceAll("/", "-")
    .replaceAll("\\", "-")
    .replaceAll(String.fromCharCode(0), "-")
    .replace(/\s+/g, " ")
    .replace(/(?:\s*-\s*){2,}/g, " - ")
    .replace(/\.{2,}/g, ".")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 220);
}

export function renderRenameTemplate(
  template: string,
  work: WorkResult,
  extension: string,
): string {
  const replacements: Record<string, string> = {
    author: work.authors.join(", ") || "Unknown Author",
    year: work.year ? String(work.year) : "n.d.",
    type: displayKind(work.kind),
    title: work.title,
    journal: work.citation?.containerTitle ?? "",
    publisher: work.publisher ?? "",
    doi: work.identifiers.doi ?? "",
    isbn: work.identifiers.isbn?.[0] ?? "",
  };
  const rendered = template.replace(
    /\{([a-z]+)\}/gi,
    (_, key: string) => replacements[key.toLowerCase()] ?? "",
  );
  const name = sanitizeFilename(
    rendered.replace(/\s+-\s+-/g, " -").replace(/-\s*$/, ""),
  );
  return `${name || sanitizeFilename(work.title)}.${extension}`;
}

function displayKind(kind: WorkResult["kind"]): string {
  const labels: Record<WorkResult["kind"], string> = {
    article: "Article",
    book: "Book",
    thesis: "Thesis",
    report: "Report",
    encyclopedia: "Encyclopedia",
    other: "Work",
  };
  return labels[kind];
}

function normalizeIdentifier(value?: string): string {
  return (value ?? "").replace(/[^0-9X]/gi, "").toUpperCase();
}

function similarity(left: string, right: string): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  const a = new Set(leftTokens);
  const b = new Set(rightTokens);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const containment = intersection / Math.max(1, Math.min(a.size, b.size));
  const union = new Set([...a, ...b]).size;
  return Math.max(intersection / union, containment * 0.94);
}

function authorOverlap(left: string[], right: string[]): number {
  const a = new Set(tokens(left.join(" ")).filter((token) => token.length > 2));
  const b = new Set(
    tokens(right.join(" ")).filter((token) => token.length > 2),
  );
  if (!a.size || !b.size) return 0;
  return (
    [...a].filter((token) => b.has(token)).length / Math.min(a.size, b.size)
  );
}

function tokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
]);
