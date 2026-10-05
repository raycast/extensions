import * as fs from "node:fs/promises";
import * as path from "node:path";

import dedent from "ts-dedent";

import { LinkFormState } from "../hooks/use-link-form";
import { File, FrontMatter, Preferences } from "../types";

import getFaviconField from "./favicon-field";
import { fileExists } from "./file-utils";
import getPublisher from "./get-publisher";
import { addToLocalStorageFiles } from "./localstorage-files";
import { addToLocalStorageTags } from "./localstorage-tags";
import slugify from "./slugify";
import tagify from "./tagify";
import { getSaveSubfolderPath } from "./vault-path";
import { getPreferenceValues } from "@raycast/api";

function formatDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Builds the frontmatter line holding the favicon override, using the field
 * name configured in preferences. Returns null when the feature is turned off
 * or when the bookmark doesn't override its favicon.
 */
function faviconLine(favicon: string | null | undefined): string | null {
  const value = favicon?.trim();
  if (!value) return null;

  const field = getFaviconField();

  // Field names aren't necessarily valid bare YAML keys, so quote anything
  // that isn't a plain identifier.
  const key = /^[\w-]+$/.test(field) ? field : JSON.stringify(field);
  return `${key}: ${JSON.stringify(value)}`;
}

function favoriteLine(favorite: number | null | undefined): string | null {
  return typeof favorite === "number" ? `favorite: ${favorite}` : null;
}

/** The optional frontmatter lines that follow `tags`, as a single suffix. */
function extraLines(attributes: FrontMatter): string {
  return [faviconLine(attributes.favicon), favoriteLine(attributes.favorite)]
    .filter((line) => line != null)
    .map((line) => `\n${line}`)
    .join("");
}

async function getFileName(filename: string): Promise<string> {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const savePath = await getSaveSubfolderPath();
  let file = path.join(savePath, filename);
  let index = 1;
  while (await fileExists(file)) {
    const newFilename = `${base}-${index++}.md`;
    file = path.join(savePath, newFilename);
  }
  return file;
}

export async function asFile(values: LinkFormState["values"]): Promise<File> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const attributes: FrontMatter = {
    source: values.url,
    publisher: getPublisher(values.url),
    favicon: values.favicon.trim() || null,
    title: values.title,
    tags: values.tags.flatMap((t) => tagify(t)),
    saved: midnight,
    read: false,
  };

  const body = dedent`
  # [${values.title.replace(/[[\]]/g, "")}](${values.url})

  ${values.description}
  `;

  const frontmatter =
    dedent`
  title: ${JSON.stringify(attributes.title)}
  saved: ${formatDate(midnight)}
  source: ${JSON.stringify(attributes.source)}
  publisher: ${JSON.stringify(attributes.publisher)}
  read: ${JSON.stringify(attributes.read)}
  tags: ${JSON.stringify(attributes.tags)}
  ` + extraLines(attributes);

  const { datePrefix } = getPreferenceValues<Preferences>();
  const prefix = datePrefix ? formatDate(midnight) + "-" : "";
  const fileSlug = `${prefix}${slugify(attributes.title)}`.slice(0, 150);
  const baseName = `${fileSlug}.md`;
  const fullPath = await getFileName(baseName);
  const fileName = path.basename(fullPath);
  const mtime = 1;

  return {
    attributes,
    frontmatter,
    body,
    fileName,
    fullPath,
    mtime,
    bodyBegin: 4 + frontmatter.length,
  };
}

/** Frontmatter fields this extension writes; every other field is kept as is. */
function managedFields(): Set<string> {
  return new Set(["title", "saved", "source", "publisher", "read", "tags", "favorite", getFaviconField()]);
}

const TOP_LEVEL_KEY = /^(?:"((?:[^"\\]|\\.)*)"|'((?:[^']|'')*)'|([^\s#'"-][^:]*?))[ \t]*:(?:\s|$)/;

/**
 * Returns the top-level entries of a raw YAML frontmatter that this extension
 * doesn't manage — `aliases`, `cssclasses`… — with their original text, so
 * nested values, comments and formatting survive a rewrite.
 */
export function unmanagedFrontmatter(raw: string): string {
  const managed = managedFields();
  const kept: string[] = [];
  let keep = true;

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(TOP_LEVEL_KEY);
    if (match) {
      const key = match[1] ?? match[2]?.replace(/''/g, "'") ?? match[3];
      keep = !managed.has(key);
    }
    // Indented lines, list items and comments belong to the entry above.
    if (keep) kept.push(line);
  }

  return kept.join("\n").trim();
}

async function readUnmanagedFrontmatter(fullPath: string): Promise<string> {
  let content: string;
  try {
    content = await fs.readFile(fullPath, { encoding: "utf-8" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }

  const raw = content.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)?.[1];
  return raw ? unmanagedFrontmatter(raw) : "";
}

export default async function saveToObsidian(file: File): Promise<string> {
  // Combine the form tags with the required tags
  const requiredTags = tagify(getPreferenceValues<Preferences>().requiredTags);
  const combinedTags = Array.from(new Set(file.attributes.tags.flatMap((t) => tagify(t)).concat(requiredTags)));

  // Read from disk rather than from the cache, so fields added in Obsidian
  // since the last scan aren't lost either.
  const unmanaged = await readUnmanagedFrontmatter(file.fullPath);

  const template = [
    "---",
    `title: ${JSON.stringify(file.attributes.title)}`,
    `saved: ${formatDate(file.attributes.saved)}`,
    `source: ${JSON.stringify(file.attributes.source)}`,
    `publisher: ${JSON.stringify(file.attributes.publisher)}`,
    `read: ${JSON.stringify(file.attributes.read)}`,
    `tags: ${JSON.stringify(combinedTags)}${extraLines(file.attributes)}`,
    ...(unmanaged ? [unmanaged] : []),
    "---",
    "",
    file.body ?? "",
  ].join("\n");

  // The caches must only learn about the bookmark once it's actually on disk,
  // and a failed write has to reach the caller.
  await fs.writeFile(file.fullPath, template, { encoding: "utf-8" });
  await Promise.allSettled([addToLocalStorageTags(file.attributes.tags), addToLocalStorageFiles([file])]);
  return file.fileName;
}

// The generated heading takes the whole first line. URLs can contain
// parentheses (Wikipedia's often do), so the link runs to the last `)`.
const BOOKMARK_HEADING = /^#\s+\[[^\]\n]*\]\([^\n]*\)[ \t]*(?:\n|$)/;

function splitBookmarkBody(body: string | undefined): { hasHeading: boolean; description: string } {
  const content = body ?? "";
  const match = content.match(BOOKMARK_HEADING);
  if (!match) return { hasHeading: false, description: content };

  return { hasHeading: true, description: content.slice(match[0].length).replace(/^\n+/, "") };
}

export function asFormValues(file: File): LinkFormState["values"] {
  return {
    url: file.attributes.source,
    title: file.attributes.title,
    favicon: file.attributes.favicon ?? "",
    tags: file.attributes.tags,
    description: splitBookmarkBody(file.body).description,
  };
}

export function asUpdatedFile(values: LinkFormState["values"], original: File): File {
  const requiredTags = tagify(getPreferenceValues<Preferences>().requiredTags);
  const urlChanged = values.url !== original.attributes.source;

  const attributes: FrontMatter = {
    ...original.attributes,
    source: values.url,
    publisher: urlChanged ? getPublisher(values.url) : original.attributes.publisher,
    favicon: values.favicon.trim() || null,
    title: values.title,
    tags: Array.from(new Set(values.tags.flatMap((t) => tagify(t)).concat(requiredTags))),
  };

  const frontmatter =
    dedent`
  title: ${JSON.stringify(attributes.title)}
  saved: ${formatDate(attributes.saved)}
  source: ${JSON.stringify(attributes.source)}
  publisher: ${JSON.stringify(attributes.publisher)}
  read: ${JSON.stringify(attributes.read)}
  tags: ${JSON.stringify(attributes.tags)}
  ` + extraLines(attributes);

  const { hasHeading } = splitBookmarkBody(original.body);
  const heading = `# [${values.title.replace(/[[\]]/g, "")}](${values.url})`;

  return {
    ...original,
    attributes,
    frontmatter,
    body: hasHeading ? `${heading}\n\n${values.description}` : values.description,
  };
}
