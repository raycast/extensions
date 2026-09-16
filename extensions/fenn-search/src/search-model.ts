import { basename, extname, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

export const SEARCH_MODES = [
  { value: "discover", title: "Discover" },
  { value: "semantic", title: "Semantic" },
  { value: "keyword", title: "Keyword" },
  { value: "hybrid", title: "Hybrid" },
  { value: "exact", title: "Exact" },
  { value: "filename", title: "Filename" },
] as const;

export type SearchMode = (typeof SEARCH_MODES)[number]["value"];

// Category names are expanded by Fenn's expand_file_types. Other values are
// explicit extensions, following the filters in Fenn's search bar.
export const FILE_TYPES = [
  { value: "pdf", title: "PDF", filters: ["pdf"] },
  { value: "docx", title: "Word", filters: ["docx"] },
  { value: "pages", title: "Pages", filters: ["pages"] },
  { value: "powerpoint", title: "Slides", filters: ["powerpoint"] },
  { value: "sheets", title: "Sheets", filters: ["sheets"] },
  { value: "csv", title: "CSV", filters: ["csv"] },
  { value: "images", title: "Images", filters: ["images"] },
  { value: "videos", title: "Videos", filters: ["videos"] },
  { value: "audio", title: "Audio", filters: ["audio"] },
  {
    value: "email",
    title: "Email",
    filters: ["olk15msgsource", "eml", "emlx", "mbox"],
  },
  { value: "code", title: "Technical / Code", filters: ["code"] },
  { value: "psd", title: "Photoshop", filters: ["psd"] },
  { value: "ai", title: "Illustrator", filters: ["ai"] },
  { value: "indd", title: "InDesign", filters: ["indd"] },
  { value: "fig", title: "Figma", filters: ["fig"] },
  { value: "sketch", title: "Sketch", filters: ["sketch"] },
  { value: "ebook", title: "eBooks", filters: ["epub"] },
  { value: "notes", title: "Apple Notes", filters: ["notes"] },
  { value: "craft", title: "Craft", filters: ["craft"] },
  { value: "bear", title: "Bear", filters: ["bear"] },
  { value: "notion", title: "Notion", filters: ["notion"] },
] as const;

export function fileTypeFilters(selected: string[]): string[] {
  return [...new Set(FILE_TYPES.filter((type) => selected.includes(type.value)).flatMap((type) => [...type.filters]))];
}

export function fileTypeLabel(selected: string[]): string {
  return (
    FILE_TYPES.filter((type) => selected.includes(type.value))
      .map((type) => type.title)
      .join(", ") || "All File Types"
  );
}

export function isSearchMode(value: unknown): value is SearchMode {
  return SEARCH_MODES.some((mode) => mode.value === value);
}

type Match = {
  page?: number;
  slide?: number;
  name?: string;
  number?: number;
  timestamp?: number;
  start?: number;
  end?: number;
  start_line?: number;
  end_line?: number;
  chunk_index?: number;
  content?: string;
};

export type SearchResult = {
  original_file: string;
  filename: string;
  file_extension?: string;
  file_type?: string;
  generated_file?: string | null;
  mbox_index?: number;
  most_relevant_pages?: Match[];
  most_relevant_slides?: Match[];
  most_relevant_sheets?: Match[];
  most_relevant_timestamps?: Match[];
  most_relevant_audio_segments?: Match[];
  most_relevant_lines?: Match[];
  most_relevant_email_segments?: Match[];
};

export type ResultSection = {
  key: string;
  title: string;
  results: SearchResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRows(rows: unknown): SearchResult[] {
  if (!Array.isArray(rows)) throw new Error("Fenn returned an unexpected result format. Update Fenn and try again.");
  return rows.filter(
    (row): row is SearchResult =>
      isRecord(row) && typeof row.original_file === "string" && typeof row.filename === "string",
  );
}

export function parseSearchResponse(payload: unknown): ResultSection[] {
  if (!isRecord(payload)) throw new Error("Fenn returned an unexpected response.");
  const results = payload.results;
  if (isRecord(results) && results.superseded === true) return [];
  if (isRecord(results) && results.mode === "discover" && isRecord(results.sections)) {
    const sections = results.sections;
    return ["exact", "filename", "keyword", "semantic"].map((key) => ({
      key,
      title: SEARCH_MODES.find((mode) => mode.value === key)!.title,
      results: parseRows(sections[key] ?? []),
    }));
  }
  return [{ key: "results", title: "Results", results: parseRows(results) }];
}

// Indexed text is data: escape Markdown images/links/HTML before rendering it.
export function escapeMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&");
}

export function formatTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = String(value % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

function numeric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function resultTitle(result: SearchResult): string {
  const extension = result.file_extension?.trim() || extname(result.original_file);
  if (!extension) return result.filename;
  const suffix = extension.startsWith(".") ? extension : `.${extension}`;
  return result.filename.toLowerCase().endsWith(suffix.toLowerCase()) ? result.filename : `${result.filename}${suffix}`;
}

function excerptContent(content: string, result: SearchResult): string {
  // Fenn prepends the source name when indexing chunks. Remove only that
  // generated first-line header, leaving the actual excerpt untouched.
  const names = new Set([result.filename, resultTitle(result), basename(result.original_file)]);
  for (const name of [...names]) names.add(name.slice(0, name.length - extname(name).length));
  const firstLineEnd = content.indexOf("\n");
  if (firstLineEnd < 0) return content;
  const firstLine = content.slice(0, firstLineEnd).trim();
  for (const name of names) {
    if (!name || !firstLine.startsWith(name)) continue;
    const suffix = firstLine.slice(name.length);
    if (suffix === ":" || suffix === " (Audio):" || /^ \(Sheet: .+\):$/.test(suffix)) {
      return content.slice(firstLineEnd + 1).trimStart();
    }
  }
  return content;
}

export function resultMatches(result: SearchResult): { label: string; content?: string }[] {
  const matches: { label: string; content?: string }[] = [];
  const add = (rows: unknown, label: (match: Match) => string | undefined) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const text = label(row);
      if (text)
        matches.push({
          label: text,
          content: typeof row.content === "string" ? excerptContent(row.content, result) : undefined,
        });
    }
  };
  add(result.most_relevant_pages, (m) => (numeric(m.page) ? `Page ${m.page}` : undefined));
  add(result.most_relevant_slides, (m) => (numeric(m.slide) ? `Slide ${m.slide}` : undefined));
  add(result.most_relevant_sheets, (m) =>
    typeof m.name === "string" && m.name ? `Sheet: ${m.name}` : numeric(m.number) ? `Sheet ${m.number}` : undefined,
  );
  add(result.most_relevant_timestamps, (m) => (numeric(m.timestamp) ? formatTime(m.timestamp) : undefined));
  add(result.most_relevant_audio_segments, (m) =>
    numeric(m.start) ? `${formatTime(m.start)}${numeric(m.end) ? ` – ${formatTime(m.end)}` : ""}` : undefined,
  );
  add(result.most_relevant_lines, (m) =>
    numeric(m.start_line)
      ? `Line ${m.start_line}${numeric(m.end_line) && m.end_line !== m.start_line ? `–${m.end_line}` : ""}`
      : undefined,
  );
  add(
    result.most_relevant_email_segments,
    (m) => `Excerpt ${numeric(m.chunk_index) ? m.chunk_index + 1 : matches.length + 1}`,
  );
  return matches;
}

export function generatedImageUrl(result: SearchResult): string | undefined {
  const imagePath = result.generated_file;
  if (typeof imagePath !== "string" || !isAbsolute(imagePath)) return undefined;
  if (!/\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(imagePath)) return undefined;
  // Keep previews local and encode spaces, parentheses, and other characters
  // in the indexed path before placing it in a Markdown image destination.
  const url = pathToFileURL(imagePath);
  url.searchParams.set("raycast-width", "320");
  return url.href;
}

export function resultMarkdown(result: SearchResult, previewUrl?: string): string {
  const matches = resultMatches(result);
  const preview = previewUrl ?? generatedImageUrl(result);
  return (
    `# ${escapeMarkdown(resultTitle(result))}\n\n` +
    (preview ? `![File preview](<${preview}>)\n\n` : "") +
    (matches.length
      ? matches
          .map(
            (match) =>
              `### ${escapeMarkdown(match.label)}${match.content ? `\n\n${escapeMarkdown(match.content)}` : ""}`,
          )
          .join("\n\n")
      : "File match. No page or timestamp details were returned for this result.")
  );
}

export function resultPlainText(result: SearchResult): string {
  return [
    resultTitle(result),
    result.original_file,
    ...resultMatches(result).map((match) => `${match.label}${match.content ? `\n${match.content}` : ""}`),
  ].join("\n\n");
}
