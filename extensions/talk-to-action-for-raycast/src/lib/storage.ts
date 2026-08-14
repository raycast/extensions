import { promises as fs } from "node:fs";
import path from "node:path";

export type InputMode = "note" | "task" | "shopping";
export type Destination = "daily-note" | "existing-file" | "new-file";
export type Position = "append" | "prepend";
export type Section = "none" | "after-heading" | "section-end";
export type LineFormat = "bullet" | "task" | "plain";

export interface Route {
  destination: Destination;
  filePath: string;
  position: Position;
  section: Section;
  heading: string;
  lineFormat: LineFormat;
  addCurrentTime: boolean;
}

export interface SaveInputOptions {
  vaultPath: string;
  dailyNoteFolder: string;
  dailyNoteFileFormat: string;
  route: Route;
  input: string;
  now?: Date;
}

export interface SaveResult {
  absolutePath: string;
  relativePath: string;
  created: boolean;
  lineCount: number;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

interface ResolvedTarget {
  vaultPath: string;
  absolutePath: string;
  relativePath: string;
  allowCreate: boolean;
}

interface HeadingMatch {
  level: number;
  text: string;
}

const DESTINATIONS: Destination[] = ["daily-note", "existing-file", "new-file"];
const POSITIONS: Position[] = ["append", "prepend"];
const SECTIONS: Section[] = ["none", "after-heading", "section-end"];
const LINE_FORMATS: LineFormat[] = ["bullet", "task", "plain"];

export async function saveInput(options: SaveInputOptions): Promise<SaveResult> {
  const inputLines = formatInputLines(
    options.input,
    options.route.lineFormat,
    options.route.addCurrentTime,
    options.now,
  );
  const target = await resolveTarget(options);
  return writeToTarget(target, inputLines, options.route);
}

export function formatInputLines(
  input: string,
  lineFormat: LineFormat,
  addCurrentTime: boolean,
  now = new Date(),
): string[] {
  assertEnum(lineFormat, LINE_FORMATS, "Line format");

  const values = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new StorageError("Input is empty.");
  }

  const time = addCurrentTime ? formatShortTime(now) + " " : "";

  return values.map((value) => {
    switch (lineFormat) {
      case "bullet":
        return "- " + time + value;
      case "task":
        return "- [ ] " + time + value;
      case "plain":
        return time + value;
    }
  });
}

export function formatShortTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDailyNoteFileName(format: string, date = new Date()): string {
  const trimmed = format.trim();
  if (!trimmed || trimmed.includes("\0") || /[\\/]/.test(trimmed) || trimmed.includes("..")) {
    throw new StorageError("Daily Note file format must be a file name, not a path.");
  }

  const replacements: Record<string, string> = {
    YYYY: String(date.getFullYear()).padStart(4, "0"),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    DD: String(date.getDate()).padStart(2, "0"),
  };

  const fileName = trimmed.replace(/YYYY|MM|DD/g, (token) => replacements[token]);
  return ensureMarkdownFileName(fileName, "Daily Note file format");
}

export function buildUpdatedContent(existingContent: string, newLines: string[], route: Route): string {
  assertRoute(route);

  const newline = existingContent.includes("\r\n") ? "\r\n" : "\n";
  const lines = stripTrailingEmptyLines(normalizeLineEndings(existingContent).split("\n"));

  if (route.section === "none") {
    if (route.position === "prepend") {
      lines.unshift(...newLines);
    } else {
      lines.push(...newLines);
    }
  } else {
    const headingIndex = findHeadingIndex(lines, route.heading);
    if (headingIndex === -1) {
      throw new StorageError('Heading "' + route.heading.trim() + '" was not found.');
    }

    if (route.section === "after-heading") {
      lines.splice(headingIndex + 1, 0, ...newLines);
    } else {
      const heading = parseHeading(lines[headingIndex]);
      if (!heading) {
        throw new StorageError('Heading "' + route.heading.trim() + '" was not found.');
      }

      let insertAt = lines.length;
      for (let index = headingIndex + 1; index < lines.length; index += 1) {
        const nextHeading = parseHeading(lines[index]);
        if (nextHeading && nextHeading.level <= heading.level) {
          insertAt = index;
          while (insertAt > headingIndex + 1 && lines[insertAt - 1] === "") {
            insertAt -= 1;
          }
          break;
        }
      }
      lines.splice(insertAt, 0, ...newLines);
    }
  }

  const content = lines.join("\n").replace(/\n+$/g, "") + "\n";
  return newline === "\r\n" ? content.replace(/\n/g, "\r\n") : content;
}

export function normalizeRelativePath(value: string, label: string): string {
  const normalized = value.trim().replaceAll("\\", "/");
  if (!normalized || normalized.includes("\0") || path.posix.isAbsolute(normalized)) {
    throw new StorageError(label + " must be a Vault-relative path.");
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new StorageError(label + " must stay inside the selected Vault.");
  }

  if (segments.some((segment) => segment === "" || segment === ".")) {
    throw new StorageError(label + " contains an invalid path segment.");
  }

  return segments.join(path.sep);
}

async function resolveTarget(options: SaveInputOptions): Promise<ResolvedTarget> {
  const vaultPath = await resolveVaultPath(options.vaultPath);
  let relativePath: string;
  let allowCreate: boolean;

  switch (options.route.destination) {
    case "daily-note": {
      const folder = options.dailyNoteFolder.trim()
        ? normalizeRelativeDirectory(options.dailyNoteFolder, "Daily Note folder")
        : "";
      const fileName = formatDailyNoteFileName(options.dailyNoteFileFormat, options.now ?? new Date());
      relativePath = folder ? path.join(folder, fileName) : fileName;
      allowCreate = true;
      break;
    }
    case "existing-file":
      relativePath = ensureMarkdownRelativePath(options.route.filePath, "File Path");
      allowCreate = false;
      break;
    case "new-file":
      relativePath = ensureMarkdownRelativePath(options.route.filePath, "File Path");
      allowCreate = true;
      break;
    default:
      assertNever(options.route.destination);
  }

  const absolutePath = await resolveInsideVault(vaultPath, relativePath);
  if (!allowCreate && !(await pathExists(absolutePath))) {
    throw new StorageError("Existing file was not found: " + relativePath);
  }

  return {
    vaultPath,
    absolutePath,
    relativePath: toVaultRelativePath(vaultPath, absolutePath),
    allowCreate,
  };
}

async function writeToTarget(target: ResolvedTarget, newLines: string[], route: Route): Promise<SaveResult> {
  await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existingContent = await readTextIfExists(target.absolutePath);

    if (existingContent === null) {
      if (!target.allowCreate) {
        throw new StorageError("Existing file was not found: " + target.relativePath);
      }

      const content = buildUpdatedContent("", newLines, route);
      try {
        await fs.writeFile(target.absolutePath, content, { encoding: "utf8", flag: "wx" });
        return {
          absolutePath: target.absolutePath,
          relativePath: target.relativePath,
          created: true,
          lineCount: newLines.length,
        };
      } catch (error) {
        if (isErrorCode(error, "EEXIST") && attempt === 0) {
          continue;
        }
        throw toStorageError(error, target.relativePath);
      }
    }

    const content = buildUpdatedContent(existingContent, newLines, route);
    const contentBeforeWrite = await readTextIfExists(target.absolutePath);
    if (contentBeforeWrite !== existingContent) {
      if (attempt === 0) {
        continue;
      }
      throw new StorageError("The file changed while saving. Please submit again.");
    }

    try {
      await fs.writeFile(target.absolutePath, content, { encoding: "utf8" });
      return {
        absolutePath: target.absolutePath,
        relativePath: target.relativePath,
        created: false,
        lineCount: newLines.length,
      };
    } catch (error) {
      throw toStorageError(error, target.relativePath);
    }
  }

  throw new StorageError("The file changed while saving. Please submit again.");
}

async function resolveVaultPath(value: string): Promise<string> {
  const trimmed = value.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) {
    throw new StorageError("Obsidian Vault must be an absolute folder path.");
  }

  let realPath: string;
  try {
    realPath = await fs.realpath(trimmed);
  } catch {
    throw new StorageError("Obsidian Vault was not found.");
  }

  const stats = await fs.stat(realPath);
  if (!stats.isDirectory()) {
    throw new StorageError("Obsidian Vault must be a folder.");
  }
  return realPath;
}

async function resolveInsideVault(vaultPath: string, relativePath: string): Promise<string> {
  const absolutePath = path.resolve(vaultPath, relativePath);
  if (!isInside(vaultPath, absolutePath)) {
    throw new StorageError("The path must stay inside the selected Vault.");
  }

  const existingAncestor = await nearestExistingAncestor(absolutePath);
  const realAncestor = await fs.realpath(existingAncestor);
  if (!isInside(vaultPath, realAncestor)) {
    throw new StorageError("The path must stay inside the selected Vault.");
  }

  if (await pathExists(absolutePath)) {
    const realFile = await fs.realpath(absolutePath);
    if (!isInside(vaultPath, realFile)) {
      throw new StorageError("The path must stay inside the selected Vault.");
    }
  }

  return absolutePath;
}

async function nearestExistingAncestor(value: string): Promise<string> {
  let current = value;
  while (!(await pathExists(current))) {
    const parent = path.dirname(current);
    if (parent === current) {
      throw new StorageError("Unable to resolve the Vault path.");
    }
    current = parent;
  }
  return current;
}

function normalizeRelativeDirectory(value: string, label: string): string {
  const normalized = value.trim().replaceAll("\\", "/").replace(/\/+$/g, "");
  if (!normalized) {
    return "";
  }
  return normalizeRelativePath(normalized, label);
}

function ensureMarkdownRelativePath(value: string, label: string): string {
  const normalized = normalizeRelativePath(value, label);
  const extension = path.extname(normalized);
  if (!extension) {
    return normalized + ".md";
  }
  if (extension.toLowerCase() !== ".md") {
    throw new StorageError(label + " must point to a Markdown file.");
  }
  return normalized;
}

function ensureMarkdownFileName(value: string, label: string): string {
  const extension = path.extname(value);
  if (!extension) {
    return value + ".md";
  }
  if (extension.toLowerCase() !== ".md") {
    throw new StorageError(label + " must produce a Markdown file.");
  }
  return value;
}

function assertRoute(route: Route): void {
  assertEnum(route.destination, DESTINATIONS, "Destination");
  assertEnum(route.position, POSITIONS, "Position");
  assertEnum(route.section, SECTIONS, "Section");
  assertEnum(route.lineFormat, LINE_FORMATS, "Line format");

  if (route.section !== "none" && !route.heading.trim()) {
    throw new StorageError("Heading is required when a section is selected.");
  }
}

function assertEnum<T extends string>(value: string, allowed: readonly T[], label: string): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new StorageError(label + " has an invalid value.");
  }
}

function assertNever(value: never): never {
  throw new StorageError("Unsupported setting: " + String(value) + ".");
}

function findHeadingIndex(lines: string[], headingName: string): number {
  const expected = headingName
    .trim()
    .replace(/^#+\s*/, "")
    .trim();
  if (!expected) {
    throw new StorageError("Heading is required when a section is selected.");
  }

  return lines.findIndex((line) => parseHeading(line)?.text === expected);
}

function parseHeading(line: string): HeadingMatch | null {
  const match = /^(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    text: match[2].replace(/[ \t]+#+[ \t]*$/, "").trim(),
  };
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function stripTrailingEmptyLines(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }
  return result;
}

function toVaultRelativePath(vaultPath: string, absolutePath: string): string {
  return path.relative(vaultPath, absolutePath).split(path.sep).join("/");
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(value: string): Promise<string | null> {
  try {
    return await fs.readFile(value, "utf8");
  } catch (error) {
    if (isErrorCode(error, "ENOENT")) {
      return null;
    }
    throw toStorageError(error, value);
  }
}

function isErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function toStorageError(error: unknown, relativePath: string): StorageError {
  if (error instanceof StorageError) {
    return error;
  }
  if (isErrorCode(error, "EACCES") || isErrorCode(error, "EPERM")) {
    return new StorageError("This Vault cannot be written: " + relativePath);
  }
  if (error instanceof Error) {
    return new StorageError(relativePath + ": " + error.message);
  }
  return new StorageError("Unable to write " + relativePath + ".");
}
