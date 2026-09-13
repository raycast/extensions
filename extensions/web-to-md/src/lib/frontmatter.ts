import type { ExtractedArticle } from "./extract";

export type Frontmatter = Record<string, string>;

export function buildFrontmatter(extracted: ExtractedArticle, includeRichMetadata: boolean): Frontmatter {
  const out: Frontmatter = {
    sourceURL: extracted.sourceUrl,
    savedDate: new Date().toISOString(),
  };

  if (includeRichMetadata) {
    if (extracted.title) out.title = extracted.title;
    if (extracted.author) out.author = extracted.author;
  }

  return out;
}

export function combineFrontmatterAndBody(frontmatter: Frontmatter | null, bodyMarkdown: string): string {
  const body = bodyMarkdown.trim() + "\n";
  if (!frontmatter) return body;

  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${yamlEscape(value)}`)
    .join("\n");

  return `---\n${yaml}\n---\n\n${body}`;
}

const YAML_ESCAPES: Record<string, string> = {
  "\\": "\\\\",
  '"': '\\"',
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

function yamlEscape(value: string): string {
  // Double-quoted YAML scalars cannot contain raw line breaks or control
  // characters. A page title holding a newline — accidental, or crafted to
  // inject a "---" document marker — would otherwise terminate the frontmatter
  // block early and leave the file unparseable.
  let escaped = "";

  for (const char of value) {
    const known = YAML_ESCAPES[char];
    if (known) {
      escaped += known;
      continue;
    }

    const code = char.codePointAt(0) ?? 0;
    escaped += code < 0x20 || code === 0x7f ? `\\x${code.toString(16).padStart(2, "0")}` : char;
  }

  return `"${escaped}"`;
}
