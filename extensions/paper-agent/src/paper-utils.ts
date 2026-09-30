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

export function parseCliPapers(rawJson: string, options: ParseOptions): Paper[] {
  let data: unknown;
  try {
    data = JSON.parse(rawJson);
  } catch {
    return [];
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => {
      const id = (e.id as string) ?? "";
      const date = (e.date as string) ?? options.fallbackDate;
      const published = e.published as string | undefined;
      const rawNotePath = e.note_path as string | undefined;
      const notePath = rawNotePath
        ? path.join(options.paperDir, rawNotePath)
        : path.join(options.libraryDir, date || options.fallbackDate, `${id || "note"}.md`);
      const rs = e.research_summary as Record<string, unknown> | undefined;
      const related = Array.isArray(e.related_local_papers) ? e.related_local_papers : [];

      return {
        id: id || path.basename(notePath, ".md"),
        title: (e.title as string) ?? "Untitled",
        date,
        published,
        authors: e.authors as string[] | undefined,
        abstract: e.abstract as string | undefined,
        whyThisPaper: e.why_this_paper as string | undefined,
        categories: e.categories as string[] | undefined,
        researchSummary: rs ? { heading: rs.heading as string, body: rs.body as string } : undefined,
        relatedLocalPapers: related
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item) => {
            const rawRelatedNotePath = item.note_path as string | undefined;
            return {
              id: (item.id as string) ?? "",
              title: (item.title as string) ?? "Untitled",
              date: item.date as string | undefined,
              notePath: rawRelatedNotePath ? path.join(options.paperDir, rawRelatedNotePath) : undefined,
              hasNote: rawRelatedNotePath ? fs.existsSync(path.join(options.paperDir, rawRelatedNotePath)) : false,
              link: item.link as string | undefined,
              reasons: Array.isArray(item.reasons) ? (item.reasons as string[]) : [],
            } satisfies RelatedLocalPaper;
          }),
        link: e.link as string | undefined,
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
