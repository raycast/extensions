import * as fs from "node:fs";
import * as path from "node:path";

export type ResearchSummary = {
  heading?: string;
  body?: string;
};

export type RelatedLocalPaper = {
  id: string;
  title: string;
  date?: string;
  notePath?: string;
  hasNote?: boolean;
  link?: string;
  reasons?: string[];
};

export type Paper = {
  id: string;
  title: string;
  date: string;
  published?: string;
  authors?: string[];
  abstract?: string;
  whyThisPaper?: string;
  categories?: string[];
  researchSummary?: ResearchSummary;
  relatedLocalPapers?: RelatedLocalPaper[];
  link?: string;
  notePath: string;
  hasNote: boolean;
};

type ParseOptions = {
  paperDir: string;
  libraryDir: string;
  fallbackDate: string;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isPaperRecord(value: unknown): value is Paper {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.date === "string" &&
    typeof value.notePath === "string" &&
    ["published", "abstract", "whyThisPaper", "link"].every(
      (key) => value[key] === undefined || typeof value[key] === "string",
    ) &&
    (value.researchSummary === undefined ||
      (isRecord(value.researchSummary) &&
        [value.researchSummary.heading, value.researchSummary.body].every(
          (item) => item === undefined || typeof item === "string",
        ))) &&
    (value.relatedLocalPapers === undefined ||
      (Array.isArray(value.relatedLocalPapers) &&
        value.relatedLocalPapers.every(
          (item) =>
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            [item.date, item.notePath, item.link].every((field) => field === undefined || typeof field === "string") &&
            (item.reasons === undefined ||
              (Array.isArray(item.reasons) && item.reasons.every((reason) => typeof reason === "string"))),
        ))) &&
    (value.authors === undefined ||
      (Array.isArray(value.authors) && value.authors.every((item) => typeof item === "string"))) &&
    (value.categories === undefined ||
      (Array.isArray(value.categories) && value.categories.every((item) => typeof item === "string")))
  );
}

export function parseSavedPapers(rawJson: string): Paper[] {
  const data: unknown = JSON.parse(rawJson);
  const withoutNulls = (record: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null));
  const papers = Array.isArray(data)
    ? data.map((value) => {
        if (!isRecord(value)) return value;
        // Older versions persisted null for missing optional metadata. Keep every
        // saved entry and its timestamps, treating those nulls as absent fields.
        const paper = withoutNulls(value);
        if (isRecord(paper.researchSummary)) paper.researchSummary = withoutNulls(paper.researchSummary);
        if (Array.isArray(paper.relatedLocalPapers)) {
          paper.relatedLocalPapers = paper.relatedLocalPapers.map((item) =>
            isRecord(item) ? withoutNulls(item) : item,
          );
        }
        return paper;
      })
    : undefined;
  if (!papers || !papers.every(isPaperRecord)) {
    throw new Error("Saved papers are invalid. Existing data has not been overwritten.");
  }
  return papers;
}

export function parseCliPapers(rawJson: string, options: ParseOptions): Paper[] {
  let data: unknown;
  try {
    data = JSON.parse(rawJson);
  } catch {
    throw new Error("Paper Agent returned invalid JSON. Check that your core installation is up to date.");
  }

  if (!Array.isArray(data)) {
    throw new Error("Paper Agent returned an unexpected response. Check that your core installation is up to date.");
  }

  return data.filter(isRecord).map((e) => {
    const id = stringValue(e.id) ?? "";
    const date = stringValue(e.date) || options.fallbackDate;
    const published = stringValue(e.published);
    const rawNotePath = stringValue(e.note_path);
    const notePath = rawNotePath
      ? path.resolve(options.paperDir, rawNotePath)
      : path.join(options.libraryDir, date || options.fallbackDate, `${id || "note"}.md`);
    const rs = isRecord(e.research_summary) ? e.research_summary : undefined;
    const related = Array.isArray(e.related_local_papers) ? e.related_local_papers : [];

    return {
      id: id || path.basename(notePath, ".md"),
      title: stringValue(e.title) ?? "Untitled",
      date,
      published,
      authors: stringList(e.authors),
      abstract: stringValue(e.abstract),
      whyThisPaper: stringValue(e.why_this_paper),
      categories: stringList(e.categories),
      researchSummary: rs ? { heading: stringValue(rs.heading), body: stringValue(rs.body) } : undefined,
      relatedLocalPapers: related.filter(isRecord).map((item) => {
        const rawRelatedNotePath = stringValue(item.note_path);
        return {
          id: stringValue(item.id) ?? "",
          title: stringValue(item.title) ?? "Untitled",
          date: stringValue(item.date),
          notePath: rawRelatedNotePath ? path.resolve(options.paperDir, rawRelatedNotePath) : undefined,
          hasNote: rawRelatedNotePath ? fs.existsSync(path.resolve(options.paperDir, rawRelatedNotePath)) : false,
          link: stringValue(item.link),
          reasons: stringList(item.reasons),
        } satisfies RelatedLocalPaper;
      }),
      link: stringValue(e.link),
      notePath,
      hasNote: fs.existsSync(notePath),
    } satisfies Paper;
  });
}

export function renderPaperDetailMarkdown(paper: Paper, displayDate: string): string {
  const relatedSection =
    paper.relatedLocalPapers && paper.relatedLocalPapers.length > 0
      ? `\n---\n\n## Related local papers\n\n${paper.relatedLocalPapers
          .map((item) => {
            const reasonText = item.reasons && item.reasons.length > 0 ? `\n  - ${item.reasons.join("\n  - ")}` : "";
            return `- **${item.title}**${item.date ? ` (${item.date})` : ""}${reasonText}`;
          })
          .join("\n")}`
      : "";
  return `# ${paper.title}

${paper.authors?.length ? `**Authors:** ${paper.authors.join(", ")}\n\n` : ""}${paper.categories?.length ? `**Categories:** ${paper.categories.join(", ")}\n\n` : ""}**Date:** ${displayDate}

---

**Why this paper**

${paper.whyThisPaper ?? "N/A"}

---

${paper.abstract ?? "No abstract available."}
${relatedSection}
${
  paper.researchSummary?.body
    ? `

---

## ${paper.researchSummary.heading ?? "Research summary"}

${paper.researchSummary.body}`
    : ""
}
${paper.link ? `\n---\n[Open Paper](${paper.link})` : ""}
`;
}
