import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, link, mkdir, open, readFile, realpath, rename, rmdir, stat, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { EagleClient, EagleItem, ItemChanges } from "../@types/eagle-v2";
import { eagleV2 } from "./api";
import { downloadRemoteAsset, inspectRemoteAsset, isHtml } from "./remote-asset";
export { inspectRemoteAsset, isPublicAddress } from "./remote-asset";
import {
  exactItem,
  identifier,
  itemDetails,
  LibraryInfo,
  requireLibrary,
  resolveFolders,
  sourceUrl,
  strings,
  text,
} from "./ai-library";

export type ImportInput = {
  libraryId: string;
  path?: string;
  assetUrl?: string;
  name?: string;
  sourceUrl?: string;
  notes?: string;
  tags?: string[];
  folderIds?: string[];
};
type LocalSource = { path: string; size: number; sha256: string };
type PreparedSource = { key: string; path?: string; url?: string; local?: LocalSource; staged?: boolean };
type ImportAttempt = {
  version: 1;
  libraryId: string;
  itemId: string;
  createdAt: string;
  local?: LocalSource;
  staged?: boolean;
  expected: ItemChanges;
  state: "pending" | "complete";
};
type ImportOptions = {
  client?: EagleClient;
  polls?: number;
  pollIntervalMs?: number;
  inspectRemote?: typeof inspectRemoteAsset;
  downloadRemote?: typeof downloadRemoteAsset;
};

export async function fileHash(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export function validateImport(input: ImportInput) {
  text(input.libraryId, "libraryId");
  if ((input.path !== undefined) === (input.assetUrl !== undefined)) {
    throw new Error("Supply exactly one local path or assetUrl.");
  }
  if (input.path !== undefined) text(input.path, "path");
  if (input.assetUrl !== undefined) sourceUrl(input.assetUrl);
  if (input.name !== undefined) {
    text(input.name, "name");
    if (/[\\/]/.test(input.name) || input.name === "." || input.name === "..") {
      throw new Error("name must be a file name without path separators.");
    }
  }
  if (input.sourceUrl !== undefined) sourceUrl(input.sourceUrl);
  if (input.notes !== undefined) text(input.notes, "notes", true);
  strings(input.tags, "tags");
  strings(input.folderIds, "folderIds").forEach((id) => identifier(id, "folder ID"));
}

export async function prepareSource(input: ImportInput, inspectRemote = inspectRemoteAsset): Promise<PreparedSource> {
  const identity = sourceIdentity(input);
  if (input.path !== undefined) {
    const expanded = expandPath(input.path);
    const path = await realpath(expanded);
    await access(path, constants.R_OK);
    const info = await stat(path);
    if (!info.isFile() || !info.size) throw new Error("path must be a readable, non-empty regular file.");
    const sha256 = await fileHash(path);
    return { path, key: identity, local: { path, size: info.size, sha256 } };
  }
  const url = await inspectRemote(input.assetUrl!);
  return { url, key: identity };
}

function expandPath(path: string) {
  const expanded = path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
  if (!isAbsolute(expanded)) throw new Error("path must be absolute or start with ~/.");
  return resolve(expanded);
}

function sourceIdentity(input: ImportInput) {
  if (input.path !== undefined) return `file:${expandPath(input.path)}`;
  const requested = new URL(input.assetUrl!);
  requested.hash = "";
  return `url:${requested.href}`;
}

function attemptPath(supportPath: string, libraryId: string, key: string) {
  return join(supportPath, "ai-imports", `${createHash("sha256").update(`${libraryId}:${key}`).digest("hex")}.json`);
}

async function existingAttempt(path: string, libraryId: string) {
  try {
    const attempt = JSON.parse(await readFile(path, "utf8")) as ImportAttempt;
    identifier(attempt.itemId, "recorded item ID");
    if (attempt.version !== 1 || attempt.libraryId !== libraryId || !attempt.expected) {
      throw new Error("Invalid import recovery record.");
    }
    return attempt;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function effectiveName(input: ImportInput, source: PreparedSource) {
  if (input.name !== undefined) return input.name;
  const name = input.assetUrl
    ? basename(decodeURIComponent(new URL(input.assetUrl).pathname))
    : basename(source.path!, extname(source.path!));
  const result = basename(name, input.assetUrl ? extname(name) : "").replace(/\\/g, "_");
  return result && result !== "." && result !== ".." ? result : "Imported Asset";
}

export async function prepareImport(input: ImportInput, options: ImportOptions = {}, supportPath?: string) {
  validateImport(input);
  const client = options.client || eagleV2;
  const library = await requireLibrary(input.libraryId, client);
  const attempt = supportPath
    ? await existingAttempt(attemptPath(supportPath, library.id, sourceIdentity(input)), library.id)
    : undefined;
  const folders = attempt
    ? (attempt.expected.folders || []).map(
        (id) =>
          library.folders.find((folder) => folder.id === id) || {
            id,
            name: "Unavailable folder",
            path: "Unavailable folder",
          },
      )
    : resolveFolders(strings(input.folderIds, "folderIds"), library);
  if (attempt?.state === "complete" && attempt.local && input.path) {
    try {
      const currentSource = expandPath(input.path);
      if (
        (await stat(currentSource)).size !== attempt.local.size ||
        (await fileHash(currentSource)) !== attempt.local.sha256
      ) {
        throw new Error(
          "The file at this path has changed since its completed import. Use a new source path for the replacement asset.",
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      // A missing source does not prevent verification of an already imported original.
    }
  }
  const source = attempt
    ? {
        key: sourceIdentity(input),
        path: attempt.local?.path,
        url: input.assetUrl,
        local: attempt.local,
        staged: attempt.staged,
      }
    : await prepareSource(input, options.inspectRemote);
  return { library, folders, source, attempt, name: attempt?.expected.name || effectiveName(input, source) };
}

async function writeAttempt(path: string, attempt: ImportAttempt) {
  const temporary = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(attempt));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path);
}

async function reserveAttempt(
  directory: string,
  key: string,
  libraryId: string,
  source: PreparedSource,
  expected: ItemChanges,
) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, `${createHash("sha256").update(`${libraryId}:${key}`).digest("hex")}.json`);
  const attempt: ImportAttempt = {
    version: 1,
    libraryId,
    itemId: randomBytes(9).toString("hex").toUpperCase(),
    createdAt: new Date().toISOString(),
    local: source.local,
    staged: source.staged,
    expected,
    state: "pending",
  };
  const temporary = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  let published = false;
  try {
    try {
      await handle.writeFile(JSON.stringify(attempt));
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      // Publish complete JSON exclusively; concurrent imports can never read a partial reservation.
      await link(temporary, path);
      published = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await existingAttempt(path, libraryId);
      if (!existing) throw new Error("Import recovery record changed. Retry the same input to reconcile it.");
      return { attempt: existing, path, fresh: false };
    }
    const folder = await open(directory, "r");
    try {
      await folder.sync();
    } finally {
      await folder.close();
    }
  } catch (error) {
    if (published) await unlink(path);
    throw error;
  } finally {
    await unlink(temporary);
  }
  return { attempt, path, fresh: true };
}

async function originalFile(item: EagleItem, library: LibraryInfo) {
  identifier(item.id, "item ID");
  text(item.name, "item name");
  text(item.ext, "item extension", true);
  if (/[\\/]/.test(item.name) || item.name === "." || item.name === ".." || !/^[a-zA-Z0-9]*$/.test(item.ext)) {
    throw new Error("Eagle returned an unsafe original file name.");
  }
  const expected = join(library.path, "images", `${item.id}.info`, `${item.name}${item.ext ? `.${item.ext}` : ""}`);
  const path = await realpath(expected);
  const within = relative(library.path, path);
  if (within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within)) {
    throw new Error("The original file resolves outside the active Eagle library.");
  }
  const info = await stat(path);
  if (!info.isFile() || !info.size) throw new Error("The imported original is missing or empty.");
  return { path, size: info.size };
}

export async function verifyOriginal(item: EagleItem, library: LibraryInfo, local?: LocalSource) {
  const original = await originalFile(item, library);
  if (local && (original.size !== local.size || (await fileHash(original.path)) !== local.sha256)) {
    throw new Error("The imported original does not match the local source's size and SHA-256 hash.");
  }
  if (!local) {
    const handle = await open(original.path, "r");
    try {
      const preview = Buffer.alloc(1024);
      const { bytesRead } = await handle.read(preview, 0, preview.length, 0);
      if (isHtml(preview.subarray(0, bytesRead))) throw new Error("The imported original is an HTML webpage.");
    } finally {
      await handle.close();
    }
  }
  return { size: original.size, localSourceMatches: local ? true : undefined };
}

async function cleanupStaged(source: { staged?: boolean; local?: LocalSource }, supportPath: string) {
  if (!source.staged || !source.local) return;
  const path = source.local.path;
  const directory = dirname(path);
  const root = await realpath(join(supportPath, "ai-import-staging")).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!root) return;
  const ownedDirectory = await realpath(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!ownedDirectory) return;
  if (
    dirname(ownedDirectory) !== root ||
    !/^asset-[a-zA-Z0-9]+$/.test(basename(directory)) ||
    !/^asset\.[a-zA-Z0-9]+$/.test(basename(path))
  ) {
    throw new Error("Refusing to remove a staged file outside extension-owned storage.");
  }
  await unlink(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  await rmdir(directory);
}

/** Reserve before POST; an existing reservation is always reconciled, never posted again. */
export async function importItem(input: ImportInput, supportPath: string, options: ImportOptions = {}) {
  const client = options.client || eagleV2;
  const prepared = await prepareImport(input, options, supportPath);
  const { library, attempt: prior } = prepared;
  let source: PreparedSource = prepared.source;
  const expected: ItemChanges = prior?.expected || {
    name: effectiveName(input, source),
    url: input.sourceUrl ?? input.assetUrl,
    annotation: input.notes,
    tags: input.tags === undefined ? undefined : strings(input.tags, "tags"),
    folders: input.folderIds === undefined ? undefined : strings(input.folderIds, "folderIds"),
  };
  let reserved;
  try {
    if (!prior && input.assetUrl) {
      const downloaded = await (options.downloadRemote || downloadRemoteAsset)(input.assetUrl, supportPath);
      source = { ...source, path: downloaded.path, url: downloaded.url, local: downloaded, staged: true };
    }
    reserved = prior
      ? { attempt: prior, path: attemptPath(supportPath, library.id, source.key), fresh: false }
      : await reserveAttempt(join(supportPath, "ai-imports"), source.key, library.id, source, expected);
  } catch (error) {
    await cleanupStaged(source, supportPath);
    throw error;
  }
  if (!reserved.fresh && !prior) await cleanupStaged(source, supportPath);
  const { attempt } = reserved;
  let accepted = false;
  let message = "An earlier import attempt is being reconciled; no new import was sent.";
  if (reserved.fresh) {
    // Validation can take time. Check the library and the source again directly before POST.
    try {
      if (
        source.local &&
        ((await stat(source.local.path)).size !== source.local.size ||
          (await fileHash(source.local.path)) !== source.local.sha256)
      ) {
        throw new Error("The source file changed before import. Check it and try again.");
      }
      const current = await requireLibrary(input.libraryId, client);
      resolveFolders(strings(input.folderIds, "folderIds"), current);
    } catch (error) {
      // No request has been sent, so this fresh reservation can safely be discarded.
      await unlink(reserved.path);
      await cleanupStaged(source, supportPath);
      throw error;
    }
    try {
      const response = await client.add({
        id: attempt.itemId,
        path: source.path,
        name: attempt.expected.name,
        website: attempt.expected.url,
        annotation: attempt.expected.annotation,
        tags: attempt.expected.tags,
        folders: attempt.expected.folders,
      });
      accepted = response.id === attempt.itemId;
      message = accepted
        ? "Eagle accepted the request; waiting for a saved library item and its original file."
        : "Eagle returned an unexpected ID. Read the library before attempting any further import.";
    } catch {
      message = "The import response was lost or failed. The reserved item ID will be reconciled without resubmitting.";
    }
  }
  const notSaved =
    "The item is not yet in the saved library. Resolve any Eagle duplicate alert, then reconcile this same ID.";
  let verificationError = notSaved;
  for (let poll = 0; poll < (options.polls ?? 8); poll++) {
    try {
      const current = await requireLibrary(input.libraryId, client);
      const item = await exactItem(attempt.itemId, client);
      if (item && !item.isDeleted) {
        for (const [key, value] of Object.entries(attempt.state === "complete" ? {} : attempt.expected)) {
          if (value === undefined) continue;
          const actual = item[key as keyof ItemChanges];
          if (
            Array.isArray(value)
              ? !value.every((entry) => Array.isArray(actual) && actual.includes(entry))
              : actual !== value
          ) {
            throw new Error(`The imported item's ${key} metadata does not match the requested value.`);
          }
        }
        const original = await verifyOriginal(item, current, attempt.local);
        await requireLibrary(input.libraryId, client);
        await writeAttempt(reserved.path, { ...attempt, state: "complete" });
        let stagedCleanupPending = false;
        try {
          await cleanupStaged(attempt, supportPath);
        } catch {
          stagedCleanupPending = true;
        }
        return {
          status: reserved.fresh ? "imported" : "already-imported",
          libraryId: library.id,
          item: itemDetails(item, current),
          original: {
            ...original,
            localSourceMatches: input.path ? original.localSourceMatches : undefined,
            sourceMatches: !!attempt.local,
          },
          stagedCleanupPending: stagedCleanupPending || undefined,
          message: reserved.fresh
            ? "The item and non-empty original file were verified."
            : "The earlier attempt was verified. No duplicate was imported; use update-item for metadata changes.",
        };
      }
      verificationError = item?.isDeleted ? "The reserved item is in Eagle's trash." : notSaved;
    } catch (error) {
      verificationError = error instanceof Error ? error.message : "Readback failed.";
    }
    if (poll + 1 < (options.polls ?? 8)) {
      await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs ?? 750));
    }
  }
  return {
    status: accepted ? "pending" : "uncertain",
    libraryId: library.id,
    itemId: attempt.itemId,
    link: `eagle://item/${attempt.itemId}`,
    message,
    verificationError,
    nextStep:
      "Keep Eagle on this library, resolve any duplicate alert, and repeat the same input to reconcile this ID. Cancel or Use Existing may remove it; inspect existing items before any further capture. Do not import another copy.",
  };
}
