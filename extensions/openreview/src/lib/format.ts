import { Submission } from "../types";

export function reviewerShort(reviewer: string): string {
  return reviewer.replace(/^Reviewer\s+/, "");
}

export function dateText(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Markdown body for the pushed Detail page: the title, authors right beneath
// it, then the abstract. Per-reviewer scores live in the metadata sidebar as
// colored tags (rendered in SubmissionDetail), so the body stays content-rich.
export function submissionMarkdown(s: Submission): string {
  const lines: string[] = [`# ${s.title}`];
  if (s.authors.length) lines.push(`_${s.authors.join(", ")}_`);
  if (s.abstract) {
    lines.push("", "---", "", s.abstract);
  } else if (s.reviews.length === 0) {
    lines.push("", "_No abstract or reviews available yet._");
  }
  return lines.join("\n").trimEnd();
}
