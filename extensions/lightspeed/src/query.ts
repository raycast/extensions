import type { SearchScope } from "./types";

export interface CompiledSearch {
  sql: string;
  parameters: Array<string | number>;
}

function lex(query: string): string[] {
  const tokens: string[] = [];
  let token = "";
  let quoted = false;
  for (const character of query.trim()) {
    if (character === '"') quoted = !quoted;
    else if (/\s/.test(character) && !quoted) {
      if (token) tokens.push(token);
      token = "";
    } else token += character;
  }
  if (token) tokens.push(token);
  return tokens;
}

function likeValue(value: string): string {
  return `%${value}%`;
}

const SCOPE_EXTENSIONS = {
  documents: ["pdf", "doc", "docx", "txt", "rtf", "md", "odt", "xls", "xlsx", "csv", "ppt", "pptx"],
  images: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "svg", "heic", "avif"],
  audio: ["mp3", "wav", "flac", "m4a", "aac", "ogg", "wma", "opus"],
  video: ["mp4", "mkv", "mov", "avi", "webm", "m4v", "wmv", "mpeg", "mpg"],
} satisfies Record<Exclude<SearchScope, "all" | "files" | "folders">, string[]>;

export function compileSearchQuery(
  query: string,
  scope: SearchScope,
  limit: number,
  useFullTextIndex = true,
): CompiledSearch {
  const predicates: string[] = [];
  const parameters: Array<string | number> = [];
  const plainTerms: string[] = [];

  for (const rawToken of lex(query)) {
    const excluded = rawToken.startsWith("!");
    const token = (excluded ? rawToken.slice(1) : rawToken).toLowerCase();
    const separator = token.indexOf(":");
    const possibleModifier = separator > 0 ? token.slice(0, separator) : "";
    const modifier = ["ext", "path", "file", "folder", "regex"].includes(possibleModifier) ? possibleModifier : "";
    const value = modifier ? token.slice(separator + 1) : token;
    let predicate: string;
    let values: Array<string | number> = [];

    if (modifier === "ext") {
      const extensions = value.split(";").map((item) => item.replace(/^\./, ""));
      predicate = `extension IN (${extensions.map(() => "?").join(", ")})`;
      values = extensions;
    } else if (modifier === "path") {
      predicate = "path LIKE ?";
      values = [likeValue(value)];
    } else if (modifier === "file" || modifier === "folder") {
      predicate = `is_directory = ${modifier === "folder" ? 1 : 0}`;
      if (value) {
        predicate += " AND path LIKE ?";
        values = [likeValue(value)];
      }
      predicate = `(${predicate})`;
    } else if (modifier === "regex") {
      try {
        void new RegExp(value, "i");
        predicate = "regexp(?, path)";
        values = [value];
      } catch {
        predicate = "0";
      }
    } else if (value.includes("*") || value.includes("?")) {
      predicate = "lower(name) GLOB ?";
      values = [value];
    } else {
      predicate = "name LIKE ?";
      values = [likeValue(value)];
      if (!excluded) plainTerms.push(value);
      if (useFullTextIndex && !excluded && value.length >= 3) {
        predicate += " AND id IN (SELECT rowid FROM files_fts WHERE name LIKE ?)";
        values.push(likeValue(value));
      }
      predicate = `(${predicate})`;
    }

    predicates.push(excluded ? `NOT (${predicate})` : predicate);
    parameters.push(...values);
  }

  if (scope === "files") predicates.push("is_directory = 0");
  else if (scope === "folders") predicates.push("is_directory = 1");
  else if (scope !== "all") {
    const extensions = SCOPE_EXTENSIONS[scope];
    predicates.push(`is_directory = 0 AND extension IN (${extensions.map(() => "?").join(", ")})`);
    parameters.push(...extensions);
  }

  const rankingTerm = plainTerms.join(" ");
  parameters.push(rankingTerm, `${rankingTerm}%`, `%${rankingTerm}%`, limit);
  return {
    sql: `
      SELECT path, name, is_directory
      FROM files
      WHERE ${predicates.length > 0 ? predicates.join(" AND ") : "0"}
      ORDER BY CASE
        WHEN name = ? COLLATE NOCASE THEN 0
        WHEN name LIKE ? THEN 1
        WHEN name LIKE ? THEN 2
        ELSE 3
      END, length(name), name COLLATE NOCASE
      LIMIT ?
    `,
    parameters,
  };
}
