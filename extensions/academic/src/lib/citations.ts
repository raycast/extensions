import type { WorkResult } from "../types";

export type CitationStyle = "abnt" | "apa" | "chicago" | "mla";

export function formatCitation(work: WorkResult, style: CitationStyle): string {
  switch (style) {
    case "abnt":
      return formatAbnt(work);
    case "apa":
      return formatApa(work);
    case "chicago":
      return formatChicago(work);
    case "mla":
      return formatMla(work);
  }
}

export function formatBibTeX(work: WorkResult): string {
  const type =
    work.kind === "book"
      ? "book"
      : work.kind === "thesis"
        ? "phdthesis"
        : "article";
  const fields: Array<[string, string | undefined]> = [
    ["title", work.title],
    ["author", work.authors.join(" and ") || undefined],
    ["year", work.year ? String(work.year) : undefined],
    [
      type === "article" ? "journal" : "publisher",
      work.citation?.containerTitle ?? work.publisher,
    ],
    ["volume", work.citation?.volume],
    ["number", work.citation?.issue],
    ["pages", work.citation?.pages?.replace(/–/g, "--")],
    ["edition", work.citation?.edition],
    ["doi", work.identifiers.doi],
    ["isbn", work.identifiers.isbn?.[0]],
    ["url", bestRecordUrl(work)],
  ];
  const body = fields
    .filter((field): field is [string, string] => Boolean(field[1]))
    .map(([key, value]) => `  ${key} = {${escapeBibTeX(value)}},`)
    .join("\n");
  return `@${type}{${citationKey(work)},\n${body}\n}`;
}

export function formatRis(work: WorkResult): string {
  const type =
    work.kind === "book"
      ? "BOOK"
      : work.kind === "thesis"
        ? "THES"
        : work.kind === "report"
          ? "RPRT"
          : "JOUR";
  const lines = [`TY  - ${type}`, `TI  - ${work.title}`];
  for (const author of work.authors) lines.push(`AU  - ${author}`);
  if (work.year) lines.push(`PY  - ${work.year}`);
  if (work.citation?.containerTitle ?? work.publisher)
    lines.push(`T2  - ${work.citation?.containerTitle ?? work.publisher}`);
  if (work.citation?.volume) lines.push(`VL  - ${work.citation.volume}`);
  if (work.citation?.issue) lines.push(`IS  - ${work.citation.issue}`);
  if (work.citation?.pages) lines.push(`SP  - ${work.citation.pages}`);
  if (work.identifiers.doi) lines.push(`DO  - ${work.identifiers.doi}`);
  if (work.identifiers.isbn?.[0])
    lines.push(`SN  - ${work.identifiers.isbn[0]}`);
  const url = bestRecordUrl(work);
  if (url) lines.push(`UR  - ${url}`);
  if (work.abstract)
    lines.push(`AB  - ${work.abstract.replace(/\s+/g, " ").trim()}`);
  lines.push("ER  - ");
  return lines.join("\n");
}

export function formatCslJson(work: WorkResult): string {
  const type =
    work.kind === "book"
      ? "book"
      : work.kind === "thesis"
        ? "thesis"
        : work.kind === "report"
          ? "report"
          : work.kind === "encyclopedia"
            ? "entry-encyclopedia"
            : "article-journal";
  return JSON.stringify(
    {
      id: citationKey(work),
      type,
      title: work.title,
      author: work.authors.map((author) => {
        const parsed = splitAuthor(author);
        return { family: parsed.family, given: parsed.given };
      }),
      issued: work.year ? { "date-parts": [[work.year]] } : undefined,
      publisher: work.publisher,
      "container-title": work.citation?.containerTitle,
      volume: work.citation?.volume,
      issue: work.citation?.issue,
      page: work.citation?.pages,
      DOI: work.identifiers.doi,
      ISBN: work.identifiers.isbn,
      ISSN: work.identifiers.issn,
      URL: bestRecordUrl(work),
      language: work.languages?.[0],
    },
    null,
    2,
  );
}

export function formatMarkdownReference(work: WorkResult): string {
  const citation = formatCitation(work, "apa");
  const url = bestRecordUrl(work);
  return url ? `[${citation.replace(url, "").trim()}](${url})` : citation;
}

export function formatLatexCite(work: WorkResult): string {
  return `\\cite{${citationKey(work)}}`;
}
export function formatPandocCite(work: WorkResult): string {
  return `[@${citationKey(work)}]`;
}

export function bestRecordUrl(work: WorkResult): string | undefined {
  if (work.identifiers.doi) return `https://doi.org/${work.identifiers.doi}`;
  return (
    work.citation?.url ??
    work.accessLinks.find(
      (link) => link.kind === "record" || link.kind === "read",
    )?.url
  );
}

function formatAbnt(work: WorkResult): string {
  const authors = formatAuthorsAbnt(work.authors);
  const title = `${work.title}.`;
  const container = work.citation?.containerTitle ?? work.publisher;
  const details = compact([
    container,
    work.citation?.volume ? `v. ${work.citation.volume}` : undefined,
    work.citation?.issue ? `n. ${work.citation.issue}` : undefined,
    work.citation?.pages ? `p. ${work.citation.pages}` : undefined,
    work.year ? String(work.year) : undefined,
  ]).join(", ");
  return finish(
    `${authors ? `${authors}. ` : ""}${title}${details ? ` ${details}.` : ""}`,
    work,
  );
}

function formatApa(work: WorkResult): string {
  const authors = formatAuthorsApa(work.authors);
  const year = work.year ? `(${work.year}).` : "(n.d.).";
  const container = work.citation?.containerTitle ?? work.publisher;
  const journalDetails = [
    container,
    work.citation?.volume
      ? `${container ? ", " : ""}${work.citation.volume}`
      : undefined,
    work.citation?.issue ? `(${work.citation.issue})` : undefined,
    work.citation?.pages ? `, ${work.citation.pages}` : undefined,
  ]
    .filter(Boolean)
    .join("");
  return finish(
    `${authors ? `${authors} ` : ""}${year} ${work.title}.${journalDetails ? ` ${journalDetails}.` : ""}`,
    work,
  );
}

function formatChicago(work: WorkResult): string {
  const authors = formatAuthorsNatural(work.authors);
  const container = work.citation?.containerTitle ?? work.publisher;
  const issue = work.citation?.issue ? `, no. ${work.citation.issue}` : "";
  const year = work.year ? ` (${work.year})` : "";
  const pages = work.citation?.pages ? `: ${work.citation.pages}` : "";
  const title = work.kind === "article" ? `“${work.title}.”` : `${work.title}.`;
  return finish(
    `${authors ? `${authors}. ` : ""}${title}${container ? ` ${container}${work.citation?.volume ? ` ${work.citation.volume}` : ""}${issue}${year}${pages}.` : year ? `${year}.` : ""}`,
    work,
  );
}

function formatMla(work: WorkResult): string {
  const authors = formatAuthorsNatural(work.authors);
  const container = work.citation?.containerTitle ?? work.publisher;
  const title = work.kind === "article" ? `“${work.title}.”` : `${work.title}.`;
  const details = compact([
    container,
    work.citation?.volume ? `vol. ${work.citation.volume}` : undefined,
    work.citation?.issue ? `no. ${work.citation.issue}` : undefined,
    work.year ? String(work.year) : undefined,
    work.citation?.pages ? `pp. ${work.citation.pages}` : undefined,
  ]).join(", ");
  return finish(
    `${authors ? `${authors}. ` : ""}${title}${details ? ` ${details}.` : ""}`,
    work,
  );
}

function finish(value: string, work: WorkResult): string {
  const locator = work.identifiers.doi
    ? `https://doi.org/${work.identifiers.doi}`
    : bestRecordUrl(work);
  return `${value.replace(/\s+/g, " ").trim()}${locator ? ` ${locator}.` : ""}`;
}

function formatAuthorsAbnt(authors: string[]): string {
  if (!authors.length) return "";
  return (
    authors
      .slice(0, 3)
      .map((author) => {
        const { family, given } = splitAuthor(author);
        return `${family.toUpperCase()}, ${given}`.trim().replace(/,$/, "");
      })
      .join("; ") + (authors.length > 3 ? "; et al" : "")
  );
}

function formatAuthorsApa(authors: string[]): string {
  const formatted = authors.slice(0, 20).map((author) => {
    const { family, given } = splitAuthor(author);
    const initials = given
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part[0]?.toUpperCase()}.`)
      .join(" ");
    return `${family}, ${initials}`.trim().replace(/,$/, "");
  });
  if (formatted.length < 2) return formatted[0] ?? "";
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted.at(-1)}`;
}

function formatAuthorsNatural(authors: string[]): string {
  if (!authors.length) return "";
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
  return `${authors[0]} et al.`;
}

function splitAuthor(author: string): { family: string; given: string } {
  if (author.includes(",")) {
    const [family, ...given] = author.split(",");
    return { family: family.trim(), given: given.join(",").trim() };
  }
  const parts = author.trim().split(/\s+/);
  return { family: parts.pop() ?? author, given: parts.join(" ") };
}

export function citationKey(work: WorkResult): string {
  const family = work.authors[0]
    ? splitAuthor(work.authors[0]).family
    : "unknown";
  return `${family}${work.year ?? "nd"}${work.title.split(/\s+/)[0] ?? "work"}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "");
}

function escapeBibTeX(value: string): string {
  return value
    .replace(/([{}])/g, "\\$1")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}
