import type { ProofreadingIssue, ProofreadingResult } from "./types";

const CATEGORY_LABELS: Record<ProofreadingIssue["category"], string> = {
  spelling: "Spelling",
  punctuation: "Punctuation",
  grammar: "Grammar",
  style: "Style",
  other: "Other",
};

export function getIssueCategoryLabel(
  category: ProofreadingIssue["category"],
): string {
  return CATEGORY_LABELS[category];
}

function longestBacktickRun(text: string): number {
  let longest = 0;
  let current = 0;

  for (const character of text) {
    if (character === "`") {
      current += 1;
      continue;
    }

    longest = Math.max(longest, current);
    current = 0;
  }

  return Math.max(longest, current);
}

export function asMarkdownCodeBlock(text: string): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(text) + 1));
  return `${fence}\n${text}\n${fence}`;
}

export function getIssueExcerpt(
  result: ProofreadingResult,
  issue: ProofreadingIssue,
): string {
  const excerpt = result.text.slice(issue.offset, issue.offset + issue.length);
  return excerpt || "(no text)";
}

function asSingleLine(text: string): string {
  return text.replace(/\s+/gu, " ").trim() || "(no text)";
}

export function formatIssueTitle(
  result: ProofreadingResult,
  issue: ProofreadingIssue,
): string {
  const replacement = issue.replacements[0] ?? "(no automatic suggestion)";
  return `${asSingleLine(getIssueExcerpt(result, issue))} → ${asSingleLine(replacement)}`;
}

export function formatIssueDetail(
  result: ProofreadingResult,
  issue: ProofreadingIssue,
  index: number,
): string {
  const replacement = issue.replacements[0] ?? "(no automatic suggestion)";

  return [
    `#### ${index + 1}. ${CATEGORY_LABELS[issue.category]}`,
    "",
    "**Found**",
    "",
    asMarkdownCodeBlock(getIssueExcerpt(result, issue)),
    "",
    "**Suggested**",
    "",
    asMarkdownCodeBlock(replacement),
    "",
    "**Why**",
    "",
    asMarkdownCodeBlock(issue.message),
  ].join("\n");
}

export function formatCorrectedText(result: ProofreadingResult): string {
  return [
    "## Corrected text",
    "",
    asMarkdownCodeBlock(result.correctedText),
    "",
    "### Original text",
    "",
    asMarkdownCodeBlock(result.text),
  ].join("\n");
}

export function formatResult(result: ProofreadingResult): string {
  const issueCount = result.issues.length;
  const heading =
    issueCount === 0
      ? "## No issues found"
      : `## ${issueCount} ${issueCount === 1 ? "issue" : "issues"} found`;
  const sections = [
    heading,
    "",
    "### Corrected text",
    "",
    asMarkdownCodeBlock(result.correctedText),
  ];

  if (issueCount > 0) {
    sections.push(
      "",
      "### Suggestions",
      "",
      ...result.issues.map((issue, index) =>
        formatIssueDetail(result, issue, index),
      ),
    );
  } else {
    sections.push("", "Russian spelling and punctuation look good.");
  }

  sections.push("", "### Original text", "", asMarkdownCodeBlock(result.text));
  return sections.join("\n");
}
