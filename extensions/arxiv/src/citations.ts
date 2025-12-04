import { SearchResult } from "./types";
import {
  MAX_AUTHORS_APA,
  MAX_AUTHORS_APA_DISPLAY,
  MAX_AUTHORS_CHICAGO,
  MAX_AUTHORS_TURABIAN,
  MAX_AUTHORS_IEEE,
  MAX_AUTHORS_IEEE_DISPLAY,
  MAX_AUTHORS_ACM_FULL,
} from "./constants";
import {
  escapeHtml,
  formatAuthorList,
  formatAuthorLastFirst,
  formatAuthorFirstLast,
  formatAuthorFull,
} from "./utils/authorFormatting";

// Validate arXiv ID to prevent injection attacks
function validateArxivId(id: string): string {
  // arXiv IDs have specific formats:
  // New format: YYMM.NNNNN or YYMM.NNNNNvN (e.g., 2301.12345, 2301.12345v2)
  // Old format: category/YYMMNNN (e.g., math.GT/0605123)
  const newFormatRegex = /^\d{4}\.\d{4,5}(v\d+)?$/;
  const oldFormatRegex = /^[a-z-]+(\.\w+)?[/]\d{7}(v\d+)?$/i;

  if (newFormatRegex.test(id) || oldFormatRegex.test(id)) {
    return id;
  }

  // If the ID doesn't match expected patterns, sanitize it to prevent injection
  // Remove any characters that could be used for path traversal or URL manipulation
  let sanitized = id.replace(/[^a-zA-Z0-9./-]/g, "");

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\.\//g, "");
  sanitized = sanitized.replace(/\.\./g, "");

  return sanitized;
}

export type CitationStyle = "acm" | "apa" | "chicago" | "ieee" | "mla" | "harvard" | "turabian";

export const CITATION_STYLES = {
  "Computer Science & Engineering": [
    { id: "acm", name: "ACM" },
    { id: "ieee", name: "IEEE" },
  ],
  Humanities: [
    { id: "chicago", name: "Chicago" },
    { id: "harvard", name: "Harvard" },
    { id: "mla", name: "MLA" },
    { id: "turabian", name: "Turabian" },
  ],
  "Social Sciences": [{ id: "apa", name: "APA" }],
} as const;

export const DEFAULT_CITATION_STYLE: CitationStyle = "acm";

export function getCitation(paper: SearchResult, citationStyle: CitationStyle): string {
  switch (citationStyle) {
    case "apa":
      return formatAPA(paper);
    case "mla":
      return formatMLA(paper);
    case "chicago":
      return formatChicago(paper);
    case "ieee":
      return formatIEEE(paper);
    case "acm":
      return formatACM(paper);
    case "harvard":
      return formatHarvard(paper);
    case "turabian":
      return formatTurabian(paper);
    default:
      return formatACM(paper);
  }
}

function safeAuthors(authors?: string[]): string[] {
  return authors && authors.length > 0 ? authors : [];
}

function hasAuthors(authors?: string[]): boolean {
  return authors !== undefined && authors !== null && authors.length > 0;
}

export function formatBibTeX(paper: SearchResult): string {
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);
  const year = new Date(paper.published).getFullYear();
  const authors = safeAuthors(paper.authors);
  const firstAuthorLastName = hasAuthors(paper.authors)
    ? authors[0]
        .split(" ")
        .slice(-1)[0]
        .toLowerCase()
        .replace(/[^a-z]/g, "")
    : "unknown";

  // Extract first meaningful word from title (skip articles and common words)
  const titleWords = paper.title.toLowerCase().split(/\s+/);
  const skipWords = ["a", "an", "the", "on", "in", "of", "for", "and", "or", "but", "with", "to"];
  const firstTitleWord =
    titleWords
      .find((word) => !skipWords.includes(word) && word.replace(/[^a-z]/g, "").length > 0)
      ?.replace(/[^a-z]/g, "") || "paper";

  // Zotero-style entry key: authorYearWord (e.g., doe2023deep)
  const entryKey = `${firstAuthorLastName}${year}${firstTitleWord}`;

  const authorString = hasAuthors(paper.authors) ? authors.map(escapeHtml).join(" and ") : "Unknown";
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());

  let bibtex = `@article{${entryKey},
  author = {${authorString}},
  title = {${title}},
  year = {${year}},
  eprint = {${arxivId}},
  archivePrefix = {arXiv},
  primaryClass = {${escapeHtml(paper.category.split(",")[0].trim())}}`;

  if (paper.abstractUrl) {
    bibtex += `,\n  url = {${paper.abstractUrl}}`;
  }

  if (paper.doi) {
    bibtex += `,\n  doi = {${paper.doi}}`;
  }

  if (paper.journalRef) {
    bibtex += `,\n  journal = {${escapeHtml(paper.journalRef)}}`;
  }

  bibtex += "\n}";

  return bibtex;
}

export function formatAPA(paper: SearchResult): string {
  const year = new Date(paper.published).getFullYear();
  const authors = formatAuthorsAPA(paper.authors);
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);

  let citation = `${authors} (${year}). ${title}. arXiv preprint arXiv:${arxivId}`;

  if (paper.doi) {
    citation += `. https://doi.org/${paper.doi}`;
  }

  return citation;
}

export function formatMLA(paper: SearchResult): string {
  const authors = formatAuthorsMLA(paper.authors);
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);
  const date = new Date(paper.published);
  const formattedDate = `${date.getDate()} ${getMonthName(date.getMonth())} ${date.getFullYear()}`;

  return `${authors} "${title}." arXiv preprint arXiv:${arxivId}, ${formattedDate}. Web.`;
}

export function formatChicago(paper: SearchResult): string {
  const authors = formatAuthorsChicago(paper.authors);
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);
  const year = new Date(paper.published).getFullYear();

  let citation = `${authors}. "${title}." arXiv preprint arXiv:${arxivId} (${year})`;

  if (paper.doi) {
    citation += `. https://doi.org/${paper.doi}`;
  }

  return citation;
}

export function formatIEEE(paper: SearchResult): string {
  const authors = formatAuthorsIEEE(paper.authors);
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);
  const year = new Date(paper.published).getFullYear();
  const month = getMonthName(new Date(paper.published).getMonth());

  let citation = `${authors}, "${title}," arXiv preprint arXiv:${arxivId}, ${month} ${year}`;

  if (paper.doi) {
    citation += `, doi: ${paper.doi}`;
  }

  return citation + ".";
}

export function formatACM(paper: SearchResult): string {
  const authors = formatAuthorsACM(paper.authors);
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);
  const year = new Date(paper.published).getFullYear();

  let citation = `${authors}. ${year}. ${title}. arXiv preprint arXiv:${arxivId}`;

  if (paper.doi) {
    citation += `. DOI:https://doi.org/${paper.doi}`;
  }

  return citation + ".";
}

export function formatHarvard(paper: SearchResult): string {
  const authors = formatAuthorsHarvard(paper.authors);
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);
  const year = new Date(paper.published).getFullYear();

  let citation = `${authors} (${year}) '${title}', arXiv preprint arXiv:${arxivId}`;

  if (paper.doi) {
    citation += `. Available at: https://doi.org/${paper.doi}`;
  }

  return citation + ".";
}

export function formatTurabian(paper: SearchResult): string {
  const authors = formatAuthorsTurabian(paper.authors);
  const title = escapeHtml(paper.title.replace(/[\n\r]+/g, " ").trim());
  const rawArxivId = paper.id.split("/abs/")[1] || paper.id;
  const arxivId = validateArxivId(rawArxivId);
  const year = new Date(paper.published).getFullYear();

  let citation = `${authors}. "${title}." arXiv preprint arXiv:${arxivId} (${year})`;

  if (paper.doi) {
    citation += `. https://doi.org/${paper.doi}`;
  }

  return citation + ".";
}

function formatAuthorsAPA(authors: string[]): string {
  if (!authors || authors.length === 0) return "Unknown";

  if (authors.length === 1) {
    return formatAuthorLastFirst(authors[0]);
  }

  if (authors.length === 2) {
    return `${formatAuthorLastFirst(authors[0])}, & ${formatAuthorLastFirst(authors[1])}`;
  }

  const formatted = authors.map(formatAuthorLastFirst);
  const lastAuthor = formatted[formatted.length - 1];

  if (authors.length <= MAX_AUTHORS_APA) {
    return `${formatted.slice(0, -1).join(", ")}, & ${lastAuthor}`;
  } else {
    return `${formatted.slice(0, MAX_AUTHORS_APA_DISPLAY).join(", ")}, ... ${lastAuthor}`;
  }
}

function formatAuthorsMLA(authors: string[]): string {
  return formatAuthorList(authors, {
    maxAuthors: 3,
    formatSingle: formatAuthorFull,
    lastSeparator: ", and ",
    etAl: ", et al.",
    firstAuthorInverted: true,
  });
}

function formatAuthorsChicago(authors: string[]): string {
  return formatAuthorList(authors, {
    maxAuthors: MAX_AUTHORS_CHICAGO,
    formatSingle: formatAuthorFull,
    lastSeparator: ", and ",
    etAl: ", et al.",
    firstAuthorInverted: true,
  });
}

function formatAuthorsIEEE(authors: string[]): string {
  return formatAuthorList(authors, {
    maxAuthors: MAX_AUTHORS_IEEE,
    maxDisplay: MAX_AUTHORS_IEEE_DISPLAY,
    formatSingle: formatAuthorFirstLast,
    lastSeparator: ", and ",
    etAl: ", et al.",
    firstAuthorInverted: false,
  });
}

function formatAuthorsACM(authors: string[]): string {
  return formatAuthorList(authors, {
    maxAuthors: MAX_AUTHORS_ACM_FULL,
    formatSingle: formatAuthorFull,
    lastSeparator: ", and ",
    etAl: ", et al",
    firstAuthorInverted: true,
  });
}

function formatAuthorsHarvard(authors: string[]): string {
  return formatAuthorList(authors, {
    maxAuthors: MAX_AUTHORS_ACM_FULL,
    formatSingle: formatAuthorLastFirst,
    lastSeparator: " and ",
    etAl: " et al.",
    firstAuthorInverted: false,
  });
}

function formatAuthorsTurabian(authors: string[]): string {
  return formatAuthorList(authors, {
    maxAuthors: MAX_AUTHORS_TURABIAN,
    formatSingle: formatAuthorFull,
    lastSeparator: ", and ",
    etAl: " et al.",
    firstAuthorInverted: true,
  });
}

function getMonthName(monthIndex: number): string {
  const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  return months[monthIndex];
}
