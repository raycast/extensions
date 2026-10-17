import { toCitation } from "./format";
import { paperWebUrl } from "./links";
import type { PaperEntity } from "./types";

export function paperMarkdown(paper: PaperEntity, citation: string = toCitation(paper)): string {
  const authors = paper.authors || "_No authors recorded_";
  const abstract =
    paper.abstract ||
    paper.note ||
    "_No abstract in this library record. Paperlib stores notes, not abstracts; enable remote abstract lookup in preferences._";
  const venue = [paper.publication, paper.pubTime].filter(Boolean).join(", ") || "_No venue_";
  const web = paperWebUrl(paper);
  const identifiers = [
    paper.doi ? `**DOI:** \`${paper.doi}\`` : "",
    paper.arxiv ? `**arXiv:** \`${paper.arxiv}\`` : "",
    web ? `**Web:** ${web}` : "",
    paper.mainURL ? `**PDF:** \`${paper.mainURL}\`` : "",
  ]
    .filter(Boolean)
    .join("  \n");

  const tags = paper.tags.map((tag) => `\`${tag.name}\``).join(" ");
  const folders = paper.folders.map((folder) => folder.name).join(", ");
  const notes = paper.note && paper.note !== paper.abstract ? `## Notes\n\n${paper.note}\n` : "";

  return `# ${paper.title || "Untitled paper"}

**Authors:** ${authors}

**Venue:** ${venue}
${identifiers ? `\n${identifiers}\n` : ""}
${tags ? `**Tags:** ${tags}\n` : ""}${folders ? `**Folders:** ${folders}\n` : ""}
## Abstract

${abstract}

${notes}## Citation

${citation}
`;
}
