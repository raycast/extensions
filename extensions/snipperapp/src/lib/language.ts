import type { Language } from "./types";

const MARKDOWN_IDS = new Set(["markdown", "md", "mdx"]);
/** Raycast's markdown renderer is superlinear; cap the rendered preview. */
const DETAIL_MAX = 10_000;

/** The fenced-code alias for a language id (first alias, else the id itself). */
export function aliasFor(languageId: string | null, languages?: Map<string, Language>): string {
  if (!languageId) return "";
  return languages?.get(languageId)?.aliases?.[0] ?? languageId;
}

/** Human display name for a language id. */
export function displayNameFor(languageId: string | null, languages?: Map<string, Language>): string {
  if (!languageId) return "Plain Text";
  return languages?.get(languageId)?.displayName ?? languageId;
}

/** Markdown for the Detail view — fenced + truncated. */
export function toDetailMarkdown(
  title: string,
  content: string,
  languageId: string | null,
  languages?: Map<string, Language>,
): string {
  const body = content.length > DETAIL_MAX ? content.slice(0, DETAIL_MAX) + "\n\n… (truncated)" : content;
  const fenced =
    languageId && MARKDOWN_IDS.has(languageId) ? body : "```" + aliasFor(languageId, languages) + "\n" + body + "\n```";
  return `# ${title}\n\n${fenced}`;
}

/** A full fenced markdown code block (no truncation) for "Copy as Markdown". */
export function toMarkdownBlock(content: string, languageId: string | null, languages?: Map<string, Language>): string {
  if (languageId && MARKDOWN_IDS.has(languageId)) return content;
  return "```" + aliasFor(languageId, languages) + "\n" + content + "\n```";
}
