import { Item } from "./api";

export function formatAuthors(authors: string[] = [], max = 3): string {
  if (authors.length === 0) return "";
  if (authors.length <= max) return authors.join(", ");
  return `${authors.slice(0, max).join(", ")} et al.`;
}

// A compact APA-like reference: "Authors (Year). Title. Journal, Volume(Issue), Pages. https://doi.org/..."
export function formatCitation(item: Item): string {
  const { title, authors, year, journal, volume, issue, pagination } = item.article;
  const parts: string[] = [];

  const authorText = formatAuthors(authors, 6);
  parts.push(`${authorText || "Unknown"}${year ? ` (${year})` : ""}.`);
  if (title) parts.push(`${title.replace(/\.$/, "")}.`);

  let source = journal ?? "";
  if (volume) source += `${source ? ", " : ""}${volume}${issue ? `(${issue})` : ""}`;
  if (pagination) source += `${source ? ", " : ""}${pagination.replace(/\s+/g, "")}`;
  if (source) parts.push(`${source}.`);

  if (item.ext_ids.doi) parts.push(`https://doi.org/${item.ext_ids.doi}`);
  return parts.join(" ");
}
