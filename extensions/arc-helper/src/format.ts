import { ItemRef } from "./api";

export function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : "—";
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function formatStatName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function isUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//.test(value);
}

/** Inline image sized for markdown tables. */
export function iconMarkdown(url: string | null | undefined, size = 24): string {
  if (!isUrl(url)) return "";
  const sized = new URL(url);
  sized.searchParams.set("raycast-width", String(size));
  sized.searchParams.set("raycast-height", String(size));
  return `![](${sized.toString()})`;
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export interface ItemRow {
  item: Pick<ItemRef, "name" | "icon" | "rarity"> | null | undefined;
  quantity?: number | string;
  note?: string;
}

/** Renders a list of item references as a markdown table with icons. */
export function itemTable(allRows: ItemRow[], noteHeader?: string): string {
  // Relationship rows can briefly lack their nested item while MetaForge imports new content.
  const rows = allRows.filter((row): row is ItemRow & { item: NonNullable<ItemRow["item"]> } => !!row.item?.name);
  if (rows.length === 0) return "";
  const hasQuantity = rows.some((row) => row.quantity !== undefined);
  const hasNote = noteHeader !== undefined;
  const headers = ["", "Item", ...(hasQuantity ? ["Qty"] : []), "Rarity", ...(hasNote ? [noteHeader] : [])];
  const lines = rows.map((row) =>
    [
      iconMarkdown(row.item.icon),
      escapeCell(row.item.name),
      ...(hasQuantity ? [row.quantity !== undefined ? `×${row.quantity}` : ""] : []),
      row.item.rarity || "—",
      ...(hasNote ? [escapeCell(row.note ?? "")] : []),
    ].join(" | "),
  );
  return [
    `| ${headers.join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...lines.map((line) => `| ${line} |`),
  ].join("\n");
}

export function section(title: string, body: string): string {
  return body.trim() ? `## ${title}\n\n${body}\n` : "";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/**
 * Converts the small HTML subset MetaForge uses in item articles (p, strong, em, a, ul/ol/li, br)
 * into markdown, since Raycast's Detail view does not render HTML.
 */
export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";
  const markdown = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, text: string) => {
      const label = stripTags(text).trim();
      return label ? `[${label}](${href})` : "";
    })
    .replace(/<(strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, _tag, _attrs, text: string) => `**${text.trim()}**`)
    .replace(/<(em|i)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, _tag, _attrs, text: string) => `_${text.trim()}_`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text: string) => `\n- ${stripTags(text).trim()}`)
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, text: string) => `\n### ${stripTags(text).trim()}\n`);
  return decodeEntities(stripTags(markdown))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
