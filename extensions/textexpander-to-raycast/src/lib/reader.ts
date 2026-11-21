import { execFile } from "node:child_process";
import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import plist from "plist";
import { parse } from "csv-parse/sync";
import {
  raycastSnippetSchema,
  type Library,
  type MigrationSession,
  type SnippetKind,
  type SourceSnippet,
} from "./types";

const execFileAsync = promisify(execFile);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error(`Invalid TextExpander field: ${key} must be text.`);
  return value;
}

function arrayField(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Invalid TextExpander field: ${key} must be a list.`);
  return value;
}

function snippetKind(value: unknown): SnippetKind {
  switch (value) {
    case undefined:
    case 0:
      return "plain";
    case 1:
      return "rich";
    case 2:
      return "applescript";
    case 3:
      return "shell";
    default:
      return "unknown";
  }
}

function readSnippet(value: unknown, group: string, fallbackId: string): SourceSnippet {
  if (!isRecord(value)) throw new Error("Invalid TextExpander snippet: expected a dictionary.");
  // A rich-text or image-only record may have no plain-text representation.
  const text = stringField(value, "plainText");
  return {
    id: stringField(value, "uuidString") || fallbackId,
    group,
    label: stringField(value, "label"),
    abbreviation: stringField(value, "abbreviation"),
    text,
    kind: snippetKind(value.snippetType),
  };
}

function isSuggested(name: string): boolean {
  return name.trim().toLowerCase() === "suggested snippets";
}

function parseCsvLibrary(text: string, group: string): Library {
  let rows: unknown;
  try {
    rows = parse(text, { bom: true, skip_empty_lines: true });
  } catch {
    throw new Error("Could not read this CSV. Use a comma-separated TextExpander export with quoted multiline text.");
  }
  if (!Array.isArray(rows)) throw new Error("Expected CSV rows.");
  const records: string[][] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || !row.every((field): field is string => typeof field === "string")) {
      throw new Error("Expected text fields in the CSV.");
    }
    records.push(row);
  }
  const headers = records[0]?.map((field) => field.trim().toLowerCase()) ?? [];
  const hasHeaders = headers.includes("abbreviation") && headers.includes("snippet");
  const looksLikeHeaders = headers.filter((field) => ["abbreviation", "snippet", "label"].includes(field)).length >= 2;
  if (looksLikeHeaders && !hasHeaders) {
    throw new Error("CSV headers must include abbreviation and snippet, with an optional label column.");
  }
  if (hasHeaders && new Set(headers).size !== headers.length) {
    throw new Error("CSV headers must be unique. Remove repeated column names before converting.");
  }
  const abbreviationIndex = hasHeaders ? headers.indexOf("abbreviation") : 0;
  const textIndex = hasHeaders ? headers.indexOf("snippet") : 1;
  const labelIndex = hasHeaders ? headers.indexOf("label") : 2;
  const data = hasHeaders ? records.slice(1) : records;
  if (!hasHeaders && data.some((row) => row.length < 2 || row.length > 3)) {
    throw new Error("CSV needs abbreviation and snippet columns, with an optional label column.");
  }
  if (isSuggested(group)) return { snippets: [], suggestedCount: data.length };
  return {
    snippets: data.map((row, index) => ({
      id: `csv-${index}`,
      group,
      abbreviation: row[abbreviationIndex] ?? "",
      text: row[textIndex] ?? "",
      label: row[labelIndex] ?? "",
      kind: "plain",
    })),
    suggestedCount: 0,
  };
}

function parseLibrary(value: unknown): Library {
  if (!isRecord(value)) throw new Error("Expected a TextExpander property-list dictionary.");

  const snippets: SourceSnippet[] = [];
  let suggestedCount = 0;

  if ("snippetsTE2" in value || "groupsTE2" in value) {
    const groupInfo = value.groupInfo;
    if (groupInfo !== undefined && !isRecord(groupInfo)) {
      throw new Error("Invalid TextExpander group info: expected a dictionary.");
    }
    const exportedGroup = groupInfo ? stringField(groupInfo, "groupName") || "Ungrouped" : "Ungrouped";
    const groups = arrayField(value, "groupsTE2");
    const groupById = new Map<string, string>();
    const excludedIds = new Set<string>();
    for (const group of groups) {
      if (!isRecord(group)) throw new Error("Invalid TextExpander group: expected a dictionary.");
      const name = stringField(group, "name") || "Ungrouped";
      for (const id of arrayField(group, "snippetUUIDs")) {
        if (typeof id !== "string") throw new Error("Invalid TextExpander group: snippet UUID must be text.");
        if (isSuggested(name)) excludedIds.add(id);
        else if (!groupById.has(id)) groupById.set(id, name);
      }
    }
    for (const [index, item] of arrayField(value, "snippetsTE2").entries()) {
      if (!isRecord(item)) throw new Error("Invalid TextExpander snippet: expected a dictionary.");
      const id = stringField(item, "uuidString");
      if (isSuggested(exportedGroup) || excludedIds.has(id)) {
        suggestedCount++;
        continue;
      }
      snippets.push(readSnippet(item, groupById.get(id) || exportedGroup, `legacy-${index}`));
    }
  } else if ("snippetPlists" in value) {
    const name = stringField(value, "name") || "Ungrouped";
    const items = arrayField(value, "snippetPlists");
    if (isSuggested(name)) suggestedCount = items.length;
    else items.forEach((item, index) => snippets.push(readSnippet(item, name, `group-${index}`)));
  } else {
    throw new Error(
      "This file has no TextExpander snippets. Choose Settings.textexpander or a .textexpander group export.",
    );
  }
  return { snippets, suggestedCount };
}

async function readPlist(filePath: string): Promise<unknown> {
  try {
    // plutil validates XML and binary inputs before the JS parser reads them.
    const result = await execFileAsync("/usr/bin/plutil", ["-convert", "xml1", "-o", "-", "--", filePath], {
      maxBuffer: 64 * 1024 * 1024,
      timeout: 30_000,
    });
    return plist.parse(result.stdout);
  } catch {
    throw new Error(
      "Could not read this property list. Choose an uncompressed TextExpander settings file or group export.",
    );
  }
}

async function readLibrary(sourcePath: string): Promise<Library> {
  const info = await stat(sourcePath);
  if (info.isFile() && extname(sourcePath).toLowerCase() === ".csv") {
    return parseCsvLibrary(await readFile(sourcePath, "utf8"), basename(sourcePath, extname(sourcePath)));
  }
  if (!info.isDirectory()) return parseLibrary(await readPlist(sourcePath));

  const files = (await readdir(sourcePath)).filter((name) => /^group.*\.xml$/i.test(name)).sort();
  if (files.length === 0) throw new Error("This folder has no group XML files. Choose a .textexpandersettings bundle.");
  const result: Library = { snippets: [], suggestedCount: 0 };
  for (const name of files) {
    const library = parseLibrary(await readPlist(join(sourcePath, name)));
    result.snippets.push(...library.snippets.map((snippet) => ({ ...snippet, id: `${name}:${snippet.id}` })));
    result.suggestedCount += library.suggestedCount;
  }
  return result;
}

export async function findLocalSettings(): Promise<string> {
  const directory = join(homedir(), "Library", "Application Support", "TextExpander");
  for (const name of ["Settings.textexpandersettings", "Settings.textexpander"]) {
    const candidate = join(directory, name);
    try {
      await access(candidate);
      return candidate;
    } catch (error) {
      if (isRecord(error) && error.code === "ENOENT") continue;
      throw error;
    }
  }
  throw new Error(
    "No local TextExpander settings found. Choose a CSV or .textexpander export, or locate your .textexpandersettings bundle manually.",
  );
}

export async function readLibraries(paths: string[]) {
  if (!paths.length) throw new Error("Choose at least one TextExpander source.");
  const canonicalPaths = [...new Set(await Promise.all(paths.map((path) => realpath(path))))];
  const library: Library = { snippets: [], suggestedCount: 0 };
  const sources: MigrationSession["sources"] = [];
  for (const path of canonicalPaths) {
    try {
      const result = await readLibrary(path);
      library.snippets.push(
        ...result.snippets.map((snippet) => ({ ...snippet, id: `${path}:${snippet.id}`, sourcePath: path })),
      );
      library.suggestedCount += result.suggestedCount;
      sources.push({ path, snippetCount: result.snippets.length, suggestedCount: result.suggestedCount });
    } catch (error) {
      throw new Error(`${basename(path)}: ${error instanceof Error ? error.message : "Could not read this source."}`);
    }
  }
  return { library, sources };
}

export async function readRaycastExport(path: string) {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  const result = raycastSnippetSchema.array().safeParse(value);
  if (!result.success)
    throw new Error("Choose a Raycast JSON export containing snippet names and text, with optional keywords.");
  return result.data;
}
