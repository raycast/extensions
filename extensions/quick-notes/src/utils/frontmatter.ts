import { format } from "date-fns";
import { Note } from "../services/atoms";

// Jekyll-compatible date, e.g. 2026-05-07 10:00:00 +1000
const FRONTMATTER_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss xx";

export interface ParsedMarkdownNote {
  title?: string;
  tags?: string[];
  createdAt?: Date;
  body: string;
  hasFrontmatter: boolean;
}

const quoteYamlValue = (value: string): string => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const unquoteYamlValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\(.)/g, "$1");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
};

const parseYamlList = (value: string): string[] => {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  const items = inner.match(/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^,]+/g) ?? [];
  return items.map(unquoteYamlValue).filter((item) => item !== "");
};

/**
 * Renders a note as a markdown file with YAML frontmatter (title, date, tags)
 * followed by an H1 title, compatible with GitHub Pages / Jekyll and Obsidian.
 */
export const serializeNoteToMarkdown = (note: Note): string => {
  const lines = [
    "---",
    `title: ${quoteYamlValue(note.title)}`,
    `date: ${format(new Date(note.createdAt), FRONTMATTER_DATE_FORMAT)}`,
  ];
  if (note.tags.length > 0) {
    lines.push(`tags: [${note.tags.map(quoteYamlValue).join(", ")}]`);
  }
  lines.push("---", "");

  const body = note.body.replace(/^\s*\n/, "");
  const firstLine = body.split("\n", 1)[0]?.trimEnd();
  const heading = firstLine === `# ${note.title}` ? "" : `# ${note.title}\n\n`;
  const trailingNewline = body.endsWith("\n") || body === "" ? "" : "\n";
  return `${lines.join("\n")}\n${heading}${body}${trailingNewline}`;
};

/**
 * Extracts YAML frontmatter (title, date, tags) from a markdown file and
 * strips it, along with the generated H1 title, from the note body.
 */
export const parseMarkdownNote = (content: string): ParsedMarkdownNote => {
  const result: ParsedMarkdownNote = { body: content, hasFrontmatter: false };

  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (match) {
    result.hasFrontmatter = true;
    result.body = content.slice(match[0].length);
    for (const line of match[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!kv) {
        continue;
      }
      const [, key, value] = kv;
      if (key === "title") {
        result.title = unquoteYamlValue(value);
      } else if (key === "tags") {
        result.tags = parseYamlList(value);
      } else if (key === "date") {
        const date = new Date(value.trim());
        if (!isNaN(date.getTime())) {
          result.createdAt = date;
        }
      }
    }
  }

  result.body = result.body.replace(/^\s*\n/, "").trimEnd();
  if (result.title) {
    const lines = result.body.split("\n");
    if (lines[0]?.trimEnd() === `# ${result.title}`) {
      result.body = lines
        .slice(1)
        .join("\n")
        .replace(/^\s*\n/, "");
    }
  }
  return result;
};
