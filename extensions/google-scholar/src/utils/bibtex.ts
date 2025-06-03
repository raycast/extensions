import { SearchResult } from "../search-articles";

export function generateBibtex(result: SearchResult): string {
  const { title, authors, publication, year } = result;
  let keyAuthorPart = "UnknownAuthor";
  if (authors) {
    const firstAuthor = authors.split(",")[0].trim();
    const lastName = firstAuthor
      .split(" ")
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, "");
    const firstNameInitial = firstAuthor.split(" ")[0][0]?.replace(/[^a-zA-Z0-9]/g, "");
    keyAuthorPart = lastName || firstNameInitial || firstAuthor.replace(/[^a-zA-Z0-9]/g, "") || "Author";
  }
  const keyYearPart = year?.replace(/[^a-zA-Z0-9]/g, "") || "Year";
  const keyTitleWord = title
    ?.split(" ")
    .find((word) => word.length > 3)
    ?.replace(/[^a-zA-Z0-9]/g, "");
  const keyTitlePart =
    keyTitleWord ||
    title
      ?.split(" ")[0]
      ?.replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 10) ||
    "Title";

  const bibtexKey = `${keyAuthorPart}${keyYearPart}${keyTitlePart}`.replace(/[^a-zA-Z0-9]/g, "");

  const formattedAuthors =
    authors
      ?.split(",")
      .map((author) => author.trim())
      .join(" and ") || "";

  let bibtexEntry = `@article{${bibtexKey},\n`;
  if (title) bibtexEntry += `  title     = {${title}},\n`; // Swapped order for preferred BibTeX format
  if (formattedAuthors) bibtexEntry += `  author    = {${formattedAuthors}},\n`;
  if (publication) bibtexEntry += `  journal   = {${publication}},\n`;
  if (year) bibtexEntry += `  year      = {${year}},\n`;
  // Optionally add other fields like volume, number, pages, doi if available
  // if (result.volume) bibtexEntry += `  volume    = {${result.volume}},\n`;
  // if (result.number) bibtexEntry += `  number    = {${result.number}},\n`;
  // if (result.pages) bibtexEntry += `  pages     = {${result.pages}},\n`;
  // if (result.doi) bibtexEntry += `  doi       = {${result.doi}},\n`;
  bibtexEntry += `}`;
  return bibtexEntry;
}
