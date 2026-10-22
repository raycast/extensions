import { NodeHtmlMarkdown } from "node-html-markdown";

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return entities[entity.toLowerCase()] ?? match;
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return Number.isNaN(code) ? match : String.fromCodePoint(code);
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>#|]/g, "\\$&");
}

function parts(snippet: string): { text: string; match: boolean }[] {
  return snippet
    .split(/(<mark>.*?<\/mark>)/s)
    .filter(Boolean)
    .map((part) => {
      const match = part.startsWith("<mark>");
      const text = decodeEntities((match ? part.slice(6, -7) : part).replace(/<[^>]+>/g, ""));
      return { text: text.replace(/\s+/g, " "), match };
    });
}

export function snippetText(snippet: string): string {
  return parts(snippet)
    .map((part) => part.text)
    .join("")
    .trim();
}

export function snippetMarkdown(snippet: string): string {
  return parts(snippet)
    .map(({ text, match }) => (match && text.trim() ? `**${escapeMarkdown(text)}**` : escapeMarkdown(text)))
    .join("")
    .trim();
}

export function htmlToMarkdown(html: string): string {
  return NodeHtmlMarkdown.translate(html, { maxConsecutiveNewlines: 2 }).trim();
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
