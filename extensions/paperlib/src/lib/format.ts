import type { PaperEntity } from "./types";

export interface AuthorName {
  given: string;
  family: string;
}

const TITLE_STOP_WORDS = new Set(["the", "a", "an"]);

export function parseAuthors(authors: string): AuthorName[] {
  if (!authors.trim()) {
    return [];
  }

  const parts = authors.includes(";") ? authors.split(";") : authors.split(",");
  return parts
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const tokens = name.split(/\s+/);
      if (tokens.length === 1) {
        return { given: "", family: tokens[0] };
      }
      return {
        given: tokens.slice(0, -1).join(" "),
        family: tokens[tokens.length - 1],
      };
    });
}

export function citationKey(paper: PaperEntity): string {
  const authors = parseAuthors(paper.authors);
  let key = authors[0]?.family.toLowerCase() ?? "ref";
  key += paper.pubTime || "";

  for (const word of paper.title.split(/\s+/)) {
    const lower = word.toLocaleLowerCase();
    if (!TITLE_STOP_WORDS.has(lower) && word.length > 3) {
      key += stripSymbols(lower);
      break;
    }
  }

  return key || "ref";
}

export function toBibTeX(paper: PaperEntity): string {
  const type = bibtexType(paper.pubType);
  const key = citationKey(paper);
  const authors = parseAuthors(paper.authors)
    .map((author) => (author.given ? `${author.family}, ${author.given}` : author.family))
    .join(" and ");

  const fields: Array<[string, string]> = [
    ["title", braceTitle(paper.title)],
    ["author", authors],
    ["year", paper.pubTime],
    ["journal", paper.publication],
    ["booktitle", paper.pubType === 1 ? paper.publication : ""],
    ["publisher", paper.publisher],
    ["volume", paper.volume],
    ["number", paper.number],
    ["pages", paper.pages],
    ["doi", paper.doi],
    ["eprint", paper.arxiv],
    ["archivePrefix", paper.arxiv ? "arXiv" : ""],
  ];

  if (paper.pubType === 1) {
    // Conference papers use booktitle, not journal.
    const journalIndex = fields.findIndex(([name]) => name === "journal");
    if (journalIndex >= 0) {
      fields.splice(journalIndex, 1);
    }
  } else {
    const bookIndex = fields.findIndex(([name]) => name === "booktitle");
    if (bookIndex >= 0) {
      fields.splice(bookIndex, 1);
    }
  }

  const body = fields
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => `  ${name} = {${escapeLatex(value)}}`)
    .join(",\n");

  return `@${type}{${key},\n${body}\n}\n`;
}

export function toCitation(paper: PaperEntity, style: "apa" | "harvard" = "apa"): string {
  const authors = formatCitationAuthors(parseAuthors(paper.authors), style);
  const year = paper.pubTime || "n.d.";
  const title = trailingPeriod(paper.title);
  const venue = paper.publication ? ` ${paper.publication}.` : "";
  const doi = paper.doi ? ` https://doi.org/${paper.doi}` : "";

  if (style === "harvard") {
    return `${authors} ${year}. ${title}${venue}${doi}`.trim();
  }

  return `${authors} (${year}). ${title}${venue}${doi}`.trim();
}

function formatCitationAuthors(authors: AuthorName[], style: "apa" | "harvard"): string {
  if (authors.length === 0) {
    return "Unknown";
  }

  const formatted = authors.map((author) => {
    const initials = author.given
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}.`)
      .join(" ");
    return initials ? `${author.family}, ${initials}` : author.family;
  });

  if (formatted.length === 1) {
    return formatted[0];
  }

  const conjunction = style === "harvard" ? "&" : "&";
  if (formatted.length === 2) {
    return `${formatted[0]} ${conjunction} ${formatted[1]}`;
  }

  if (formatted.length <= 7) {
    return `${formatted.slice(0, -1).join(", ")}, ${conjunction} ${formatted[formatted.length - 1]}`;
  }

  return `${formatted.slice(0, 6).join(", ")}, … ${conjunction} ${formatted[formatted.length - 1]}`;
}

function bibtexType(pubType: number): string {
  return ["article", "inproceedings", "article", "book"][pubType] ?? "article";
}

function braceTitle(title: string): string {
  return title.replace(/\$/g, "$");
}

function escapeLatex(value: string): string {
  return value.replaceAll("&", "\\&").replaceAll("%", "\\%").replaceAll("#", "\\#");
}

function stripSymbols(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "");
}

function trailingPeriod(title: string): string {
  return /[.!?]$/.test(title) ? title : `${title}.`;
}
