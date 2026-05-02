/**
 * @module ray-fb
 *
 * Single TS/native integration boundary for the `ray-fb` binary.
 * Owns binary path resolution, process execution, exit-code mapping,
 * stdout/stderr/error normalization, and command-level hooks/functions.
 */

import { environment } from "@raycast/api";
import { useExec } from "@raycast/utils";
export { useExec } from "@raycast/utils";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { SEARCH_DEBUG_ENV_KEY, isSearchDebugEnabled, logSearchDebug } from "$lib/search-debug";
import type { Item, SortMode, FinderTag } from "$lib/types";

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type RayFbErrorCode = "usage" | "not-found" | "permission" | "unsupported" | "internal" | "unknown";

export type RayFbError = Error & {
  code: RayFbErrorCode;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  args: readonly string[];
};

export type ListDirectoryItemsInput = {
  path: string;
  sort?: SortMode;
  showHidden?: boolean;
};

export type ListTagItemsInput = {
  name: string;
  sort?: SortMode;
  showHidden?: boolean;
};

export type ItemPathInput = { path: string };
export type RenameItemInput = { path: string; name: string };
export type SetItemCommentInput = { path: string; value: string };
export type SetItemBooleanFlagInput = { path: string; value: boolean };
export type ReplaceItemTagsInput = { path: string; values: string[] };

export type ItemPathResult = { path: string };
export type ItemBooleanResult = { value: boolean };

export type CreateItemInput = { directoryPath: string; name: string };
export type CopyItemInput = { sourcePath: string; destinationPath: string };
export type MoveItemInput = { sourcePath: string; destinationPath: string };
export type GetItemThumbnailInput = { path: string; maxSize?: number };

export type SearchItemsInput = {
  onlyIn: string;
  predicate: string;
  maxResults?: number;
  timeoutMs?: number;
};

export type SearchResult = {
  paths: string[];
  isTruncated: boolean;
  isTimedOut: boolean;
};

export type HydrateItemsInput = {
  paths: string[];
  showHidden?: boolean;
};

type ExecRayFbOptions = {
  env?: NodeJS.ProcessEnv;
  debugEvent?: string;
};

// ---------------------------------------------------------------------------
// Shared helpers (exported for sibling modules in this package)
// ---------------------------------------------------------------------------

export function getBinaryPath(): string {
  return join(environment.assetsPath, "ray-fb");
}

export function mapExitCode(code: number | null | undefined): RayFbErrorCode {
  switch (code) {
    case 2:
      return "usage";
    case 3:
      return "not-found";
    case 4:
      return "permission";
    case 5:
      return "unsupported";
    case 1:
      return "internal";
    default:
      return "unknown";
  }
}

function stripDebugLines(stderr: string): string {
  return stderr
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("[search-debug]"))
    .join("\n")
    .trim();
}

function createRayFbError(
  exitCode: number | null,
  stdout: string,
  stderr: string,
  args: readonly string[],
  causeMessage?: string,
): RayFbError {
  const code = mapExitCode(exitCode);
  const sanitizedStderr = stripDebugLines(stderr);
  const message = sanitizedStderr || causeMessage || `ray-fb exited with code ${exitCode ?? "null"}`;
  const error = new Error(message) as RayFbError;
  error.code = code;
  error.exitCode = exitCode;
  error.stdout = stdout;
  error.stderr = stderr;
  error.args = args;
  return error;
}

function execRayFb(args: string[], options: ExecRayFbOptions = {}): Promise<{ stdout: string; stderr: string }> {
  const binary = getBinaryPath();
  const env = options.env ? { ...process.env, ...options.env } : undefined;

  if (options.debugEvent) {
    logSearchDebug(options.debugEvent, {
      binary,
      args,
      command: [binary, ...args].join(" "),
    });
  }

  return new Promise((resolve, reject) => {
    execFile(binary, args, { env, maxBuffer: 100 * 1024 * 1024 }, (error, stdout, stderr) => {
      const outStr = stdout?.toString() ?? "";
      const errStr = stderr?.toString() ?? "";
      if (options.debugEvent && errStr.trim()) {
        logSearchDebug(`${options.debugEvent}:stderr`, errStr.trim());
      }
      if (error) {
        const errCode = (error as NodeJS.ErrnoException).code;
        const exitCode = typeof errCode === "number" ? errCode : null;
        reject(createRayFbError(exitCode, outStr, errStr, args, error.message));
      } else {
        resolve({ stdout: outStr, stderr: errStr });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Internal arg builders
// ---------------------------------------------------------------------------

function buildItemsListArgs(input: ListDirectoryItemsInput): string[] {
  const args = ["items", "list", "--path", input.path];
  if (input.sort) {
    args.push("--sort", input.sort);
  }
  const showHidden = input.showHidden ?? true;
  args.push("--show-hidden", showHidden ? "true" : "false");
  return args;
}

export function normaliseTagName(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildItemsByTagArgs(input: ListTagItemsInput): string[] {
  const args = ["items", "by-tag", "--name", input.name];
  if (input.sort) {
    args.push("--sort", input.sort);
  }
  const showHidden = input.showHidden ?? true;
  args.push("--show-hidden", showHidden ? "true" : "false");
  return args;
}

function buildRenameArgs(input: RenameItemInput): string[] {
  return ["item", "rename", "--path", input.path, "--to", input.name];
}

function buildCommentSetArgs(input: SetItemCommentInput): string[] {
  return ["item", "comment", "set", "--path", input.path, "--value", input.value];
}

function buildLockedGetArgs(input: ItemPathInput): string[] {
  return ["item", "locked", "get", "--path", input.path];
}

function buildLockedSetArgs(input: SetItemBooleanFlagInput): string[] {
  return ["item", "locked", "set", "--path", input.path, "--value", input.value ? "true" : "false"];
}

function buildStationerySetArgs(input: SetItemBooleanFlagInput): string[] {
  return ["item", "stationery", "set", "--path", input.path, "--value", input.value ? "true" : "false"];
}

function buildTagsReplaceArgs(input: ReplaceItemTagsInput): string[] {
  return ["item", "tags", "replace", "--path", input.path, "--values", ...input.values];
}

function buildCopyArgs(input: CopyItemInput): string[] {
  return ["item", "copy", "--path", input.sourcePath, "--to", input.destinationPath];
}

function buildCreateArgs(input: CreateItemInput): string[] {
  return ["item", "create", "--path", input.directoryPath, "--name", input.name];
}

function buildTagsListArgs(): string[] {
  return ["tags", "list"];
}

function buildMoveArgs(input: MoveItemInput): string[] {
  return ["item", "move", "--path", input.sourcePath, "--to", input.destinationPath];
}

function buildThumbnailArgs(input: GetItemThumbnailInput): string[] {
  const args = ["item", "thumbnail", "--path", input.path];
  if (input.maxSize) {
    args.push("--size", String(input.maxSize));
  }
  return args;
}

function buildSearchArgs(input: SearchItemsInput): string[] {
  const args = ["items", "search", "--only-in", input.onlyIn, "--predicate", input.predicate];
  if (input.maxResults) {
    args.push("--max-results", String(input.maxResults));
  }
  if (input.timeoutMs) {
    args.push("--timeout-ms", String(input.timeoutMs));
  }
  return args;
}

function buildHydrateArgs(input: HydrateItemsInput): string[] {
  const args = ["items", "hydrate", "--paths", ...input.paths];
  const showHidden = input.showHidden ?? true;
  args.push("--show-hidden", showHidden ? "true" : "false");
  return args;
}

// ---------------------------------------------------------------------------
// Internal stdout parsers
// ---------------------------------------------------------------------------

export function parseJsonArray<T>(stdout: string, label: string): T[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw createRayFbError(null, stdout, `Malformed JSON from ${label}`, []);
  }
  if (!Array.isArray(parsed)) {
    throw createRayFbError(null, stdout, `Expected JSON array from ${label}, got ${typeof parsed}`, []);
  }
  return parsed as T[];
}

export function parseTagItemsStdout(stdout: string): Item[] {
  return parseJsonArray<Item>(stdout, "items by-tag");
}

function parseBooleanStdout(stdout: string): boolean {
  const trimmed = stdout.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  throw createRayFbError(
    null,
    stdout,
    `Expected "true" or "false" from item locked get, got ${JSON.stringify(trimmed)}`,
    [],
  );
}

function parsePathStdout(stdout: string): string {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw createRayFbError(null, stdout, "Expected path from item rename, got empty stdout", []);
  }
  return trimmed;
}

function parseSearchResult(stdout: string): SearchResult {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { paths: [], isTruncated: false, isTimedOut: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw createRayFbError(null, stdout, "Malformed JSON from items search", []);
  }
  if (!parsed || typeof parsed !== "object") {
    throw createRayFbError(null, stdout, "Expected JSON object from items search", []);
  }
  const obj = parsed as Record<string, unknown>;
  return {
    paths: Array.isArray(obj.paths) ? (obj.paths as string[]) : [],
    isTruncated: typeof obj.isTruncated === "boolean" ? obj.isTruncated : false,
    isTimedOut: typeof obj.isTimedOut === "boolean" ? obj.isTimedOut : false,
  };
}

// ---------------------------------------------------------------------------
// Exported hooks
// ---------------------------------------------------------------------------

export function useDirectoryItems(input: ListDirectoryItemsInput | undefined) {
  const binary = getBinaryPath();

  const args = input ? buildItemsListArgs(input) : [];

  const exec = useExec<Item[]>(binary, args, {
    execute: args.length > 0,
    keepPreviousData: true,
    parseOutput: (output: { stdout: string }) => parseJsonArray<Item>(output.stdout, "items list"),
  });

  return {
    ...exec,
    data: exec.data ?? [],
  };
}

export function useFinderTags() {
  const binary = getBinaryPath();
  const args = buildTagsListArgs();

  const exec = useExec<FinderTag[]>(binary, args, {
    keepPreviousData: true,
    parseOutput: (output: { stdout: string }) => parseJsonArray<FinderTag>(output.stdout, "tags list"),
  });

  return {
    ...exec,
    data: exec.data ?? [],
  };
}

export function useTagItems(input: ListTagItemsInput | undefined) {
  const binary = getBinaryPath();

  const normalised = input ? normaliseTagName(input.name) : null;
  const args = normalised ? buildItemsByTagArgs({ ...input, name: normalised }) : [];

  const exec = useExec<Item[]>(binary, args, {
    execute: args.length > 0,
    keepPreviousData: true,
    parseOutput: (output: { stdout: string }) => parseTagItemsStdout(output.stdout),
  });

  return {
    ...exec,
    data: exec.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Exported imperative functions
// ---------------------------------------------------------------------------

export async function listDirectoryItems(input: ListDirectoryItemsInput): Promise<Item[]> {
  const args = buildItemsListArgs(input);
  const { stdout } = await execRayFb(args);
  return parseJsonArray<Item>(stdout, "items list");
}

export async function listFinderTags(): Promise<FinderTag[]> {
  const args = buildTagsListArgs();
  const { stdout } = await execRayFb(args);
  return parseJsonArray<FinderTag>(stdout, "tags list");
}

export async function listTagItems(input: ListTagItemsInput): Promise<Item[]> {
  const normalised = normaliseTagName(input.name);
  if (!normalised) {
    throw createRayFbError(null, "", "Tag name must not be empty", []);
  }
  const args = buildItemsByTagArgs({ ...input, name: normalised });
  const { stdout } = await execRayFb(args);
  return parseTagItemsStdout(stdout);
}

export async function renameItem(input: RenameItemInput): Promise<ItemPathResult> {
  const args = buildRenameArgs(input);
  const { stdout } = await execRayFb(args);
  return { path: parsePathStdout(stdout) };
}

export async function copyItem(input: CopyItemInput): Promise<ItemPathResult> {
  const args = buildCopyArgs(input);
  const { stdout } = await execRayFb(args);
  return { path: parsePathStdout(stdout) };
}

export async function setItemComment(input: SetItemCommentInput): Promise<void> {
  const args = buildCommentSetArgs(input);
  await execRayFb(args);
}

export async function getItemLocked(input: ItemPathInput): Promise<ItemBooleanResult> {
  const args = buildLockedGetArgs(input);
  const { stdout } = await execRayFb(args);
  return { value: parseBooleanStdout(stdout) };
}

export async function setItemLocked(input: SetItemBooleanFlagInput): Promise<void> {
  const args = buildLockedSetArgs(input);
  await execRayFb(args);
}

export async function setItemStationery(input: SetItemBooleanFlagInput): Promise<void> {
  const args = buildStationerySetArgs(input);
  await execRayFb(args);
}

export async function createItem(input: CreateItemInput): Promise<ItemPathResult> {
  const name = input.name.trim();
  if (!name) {
    throw createRayFbError(null, "", "Name is required", []);
  }
  if (name === "." || name === "..") {
    throw createRayFbError(null, "", "Name cannot be '.' or '..'.", []);
  }
  if (name.includes(":")) {
    throw createRayFbError(null, "", "Name cannot contain ':'.", []);
  }
  if (name.includes("/")) {
    throw createRayFbError(null, "", "Name cannot contain '/'.", []);
  }
  const args = buildCreateArgs({ ...input, name });
  const { stdout } = await execRayFb(args);
  return { path: parsePathStdout(stdout) };
}

export async function replaceItemTags(input: ReplaceItemTagsInput): Promise<void> {
  const args = buildTagsReplaceArgs(input);
  await execRayFb(args);
}

export async function moveItem(input: MoveItemInput): Promise<ItemPathResult> {
  const args = buildMoveArgs(input);
  const { stdout } = await execRayFb(args);
  return { path: parsePathStdout(stdout) };
}

export async function getItemThumbnail(input: GetItemThumbnailInput): Promise<{ path: string } | null> {
  try {
    const args = buildThumbnailArgs(input);
    const { stdout } = await execRayFb(args);
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    return { path: trimmed };
  } catch {
    return null;
  }
}

export async function execSearchItems(input: SearchItemsInput): Promise<SearchResult> {
  const args = buildSearchArgs(input);
  const debugEnv = isSearchDebugEnabled() ? { [SEARCH_DEBUG_ENV_KEY]: "1" } : undefined;
  const { stdout } = await execRayFb(args, { env: debugEnv, debugEvent: "ray-fb.items.search" });
  const result = parseSearchResult(stdout);
  logSearchDebug("ray-fb.items.search:result", {
    pathCount: result.paths.length,
    isTruncated: result.isTruncated,
    isTimedOut: result.isTimedOut,
  });
  return result;
}

/** Max approximate argv byte length per subprocess. macOS ARG_MAX ≥ 256 KB; 128 KB is conservative. */
const HYDRATE_BATCH_BYTE_LIMIT = 128 * 1024;

/** Split paths into batches whose cumulative byte length stays under `limit` minus base-arg overhead. */
function splitPathsIntoBatches(paths: string[], limit: number): string[][] {
  const baseArgsBytes = Buffer.byteLength("items hydrate --paths --show-hidden true", "utf8");
  const budget = limit - baseArgsBytes;

  if (budget <= 0) {
    return paths.map((p) => [p]);
  }

  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentBytes = 0;

  for (const path of paths) {
    const pathBytes = Buffer.byteLength(path, "utf8") + 1; // +1 separator/null

    if (currentBatch.length > 0 && currentBytes + pathBytes > budget) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBytes = 0;
    }

    currentBatch.push(path);
    currentBytes += pathBytes;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

export async function execHydrateItems(input: HydrateItemsInput): Promise<Item[]> {
  if (input.paths.length === 0) {
    return [];
  }

  const batches = splitPathsIntoBatches(input.paths, HYDRATE_BATCH_BYTE_LIMIT);

  if (batches.length === 1) {
    const args = buildHydrateArgs(input);
    const { stdout } = await execRayFb(args);
    return parseJsonArray<Item>(stdout, "items hydrate");
  }

  const allItems: Item[] = [];
  for (const batch of batches) {
    const args = buildHydrateArgs({ paths: batch, showHidden: input.showHidden });
    const { stdout } = await execRayFb(args);
    const items = parseJsonArray<Item>(stdout, "items hydrate");
    allItems.push(...items);
  }
  return allItems;
}
