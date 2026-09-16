import type { ProofreadingIssue } from "./types";

const SEPARATE_NE_INTERESTNO_PATTERN =
  /(?<![\p{L}])не\s+интересно(?![\p{L}])/giu;
const EXPLICIT_NEGATION_PREFIX =
  /(?:^|[^\p{L}])(?:совсем|вовсе|далеко|отнюдь|нисколько|ничуть)\s*$/iu;
const CONTRAST_OR_QUESTION_SUFFIX = /^\s*,?\s*(?:а|но|ли)(?![\p{L}])/iu;

function overlaps(left: ProofreadingIssue, right: ProofreadingIssue): boolean {
  return (
    left.offset < right.offset + right.length &&
    right.offset < left.offset + left.length
  );
}

export function findRussianContextIssues(text: string): ProofreadingIssue[] {
  return [...text.matchAll(SEPARATE_NE_INTERESTNO_PATTERN)].flatMap((match) => {
    const matchedText = match[0];
    const offset = match.index ?? -1;

    if (
      offset < 0 ||
      EXPLICIT_NEGATION_PREFIX.test(text.slice(0, offset)) ||
      CONTRAST_OR_QUESTION_SUFFIX.test(text.slice(offset + matchedText.length))
    ) {
      return [];
    }

    return [
      {
        message:
          "В значении «скучно» слово «неинтересно» обычно пишется слитно. Раздельное написание нужно при явном отрицании или противопоставлении.",
        shortMessage: "Слитное написание «не»",
        replacements: [matchedText.replace(/\s+/gu, "")],
        offset,
        length: matchedText.length,
        category: "spelling",
        ruleId: "RU_NE_INTERESTNO",
      },
    ];
  });
}

export function mergeRussianContextIssues(
  text: string,
  issues: ProofreadingIssue[],
): ProofreadingIssue[] {
  const contextIssues = findRussianContextIssues(text).filter(
    (contextIssue) => !issues.some((issue) => overlaps(issue, contextIssue)),
  );

  return [...issues, ...contextIssues].sort(
    (left, right) => left.offset - right.offset,
  );
}

function isValidIssue(text: string, issue: ProofreadingIssue): boolean {
  return (
    Number.isInteger(issue.offset) &&
    Number.isInteger(issue.length) &&
    issue.offset >= 0 &&
    issue.length >= 0 &&
    issue.offset + issue.length <= text.length &&
    typeof issue.replacements[0] === "string"
  );
}

export function applyCorrections(
  text: string,
  issues: ProofreadingIssue[],
): string {
  const candidates = issues
    .map((issue, index) => ({ issue, index }))
    .filter(({ issue }) => isValidIssue(text, issue))
    .sort(
      (left, right) =>
        left.issue.offset - right.issue.offset ||
        right.issue.length - left.issue.length ||
        left.index - right.index,
    );

  const selected: ProofreadingIssue[] = [];
  let coveredUntil = -1;

  for (const { issue } of candidates) {
    if (issue.offset < coveredUntil) {
      continue;
    }

    selected.push(issue);
    coveredUntil = issue.offset + issue.length;
  }

  return selected
    .sort((left, right) => right.offset - left.offset)
    .reduce(
      (correctedText, issue) =>
        correctedText.slice(0, issue.offset) +
        issue.replacements[0] +
        correctedText.slice(issue.offset + issue.length),
      text,
    );
}
