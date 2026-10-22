import axios from "axios";
import { createHash, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { createReadStream } from "node:fs";
import { access, mkdir, open, readFile, realpath, rename, stat, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { isIP } from "node:net";
import { homedir } from "node:os";
import { basename, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { EagleClient, EagleItem, ItemChanges } from "../@types/eagle-v2";
import { eagleV2 } from "./api";
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
type PreparedSource = { key: string; path?: string; url?: string; local?: LocalSource };
type ImportAttempt = {
  version: 1;
  libraryId: string;
  itemId: string;
  createdAt: string;
  local?: LocalSource;
  expected: ItemChanges;
  state: "pending" | "complete";
};
type ImportOptions = {
  client?: EagleClient;
  polls?: number;
  pollIntervalMs?: number;
  inspectRemote?: typeof inspectRemoteAsset;
};

export async function fileHash(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function html(content: Buffer) {
  return /<!doctype\s+html|<html(?:\s|>)/i.test(content.toString("utf8"));
}

export function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  // Only global unicast IPv6; this also rejects mapped IPv4 and local addresses.
  return isIP(address) === 6 && /^[23]/i.test(address) && !/^2001:db8:/i.test(address);
}

async function publicUrl(value: string) {
  sourceUrl(value);
  const url = new URL(value);
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("assetUrl must use a public HTTP(S) port.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("assetUrl must point to a public direct asset, not a local or private server.");
  }
  return url;
}

/** Check each redirect and inspect actual bytes rather than trusting a file suffix. */
export async function inspectRemoteAsset(value: string): Promise<string> {
  let url = await publicUrl(value);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await axios.get<Readable>(url.href, {
      responseType: "stream",
      maxRedirects: 0,
      timeout: 15_000,
      proxy: false,
      headers: { Range: "bytes=0-1023" },
      validateStatus: () => true,
    });
    const stream = response.data;
    try {
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (!response.headers.location || redirects === 5) throw new Error("Too many asset redirects.");
        url = await publicUrl(new URL(response.headers.location, url).href);
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        throw new Error("The asset URL is not publicly downloadable. Supply a direct asset URL.");
      }
      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      if (!contentType || /text\/html|application\/xhtml/.test(contentType)) {
        throw new Error("The URL is an HTML webpage or has no asset content type. Supply a public direct asset URL.");
      }
      let preview = Buffer.alloc(0);
      for await (const chunk of stream) {
        preview = Buffer.concat([preview, Buffer.from(chunk).subarray(0, 1024 - preview.length)]);
        if (preview.length >= 1024) break;
      }
      if (!preview.length || html(preview)) throw new Error("The URL returned empty content or an HTML webpage.");
      return url.href;
    } finally {
      stream.destroy();
    }
  }
  throw new Error("Too many asset redirects.");
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
  const name = source.path
    ? basename(source.path, extname(source.path))
    : basename(decodeURIComponent(new URL(source.url!).pathname));
  const result = basename(name, source.path ? "" : extname(name)).replace(/\\/g, "_");
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
    ? { key: sourceIdentity(input), path: attempt.local?.path, url: input.assetUrl, local: attempt.local }
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
    expected,
    state: "pending",
  };
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await existingAttempt(path, libraryId);
    if (!existing) throw new Error("Import recovery record changed. Retry the same input to reconcile it.");
    return { attempt: existing, path, fresh: false };
  }
  try {
    try {
      await handle.writeFile(JSON.stringify(attempt));
      await handle.sync();
    } finally {
      await handle.close();
    }
    // Sync the containing directory as well as the file before the mutation.
    const folder = await open(directory, "r");
    try {
      await folder.sync();
    } finally {
      await folder.close();
    }
  } catch (error) {
    await unlink(path);
    throw error;
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
      if (html(preview.subarray(0, bytesRead))) throw new Error("The imported original is an HTML webpage.");
    } finally {
      await handle.close();
    }
  }
  return { size: original.size, localSourceMatches: local ? true : undefined };
}

/** Reserve before POST; an existing reservation is always reconciled, never posted again. */
export async function importItem(input: ImportInput, supportPath: string, options: ImportOptions = {}) {
  const client = options.client || eagleV2;
  const { library, source, attempt: prior } = await prepareImport(input, options, supportPath);
  const expected: ItemChanges = prior?.expected || {
    name: effectiveName(input, source),
    url: input.sourceUrl,
    annotation: input.notes,
    tags: input.tags === undefined ? undefined : strings(input.tags, "tags"),
    folders: input.folderIds === undefined ? undefined : strings(input.folderIds, "folderIds"),
  };
  const reserved = prior
    ? { attempt: prior, path: attemptPath(supportPath, library.id, source.key), fresh: false }
    : await reserveAttempt(join(supportPath, "ai-imports"), source.key, library.id, source, expected);
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
      throw error;
    }
    try {
      const response = await client.add({
        id: attempt.itemId,
        path: source.path,
        url: source.url,
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
        return {
          status: reserved.fresh ? "imported" : "already-imported",
          libraryId: library.id,
          item: itemDetails(item, current),
          original,
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
