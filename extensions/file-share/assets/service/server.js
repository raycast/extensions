#!/usr/bin/env node
"use strict";

/**
 * Local sharing service for the File Share Raycast extension.
 *
 * The Raycast command starts this file with Raycast's own Node, detached so the service outlives the command.
 * It owns the share list (a list of files, directories and text that hosts and visitors both add to and remove
 * from) and two planes:
 *
 *   - control plane on 127.0.0.1:<controlPort> -> status, stop, reload, list mutations. Only this Mac can reach it.
 *   - data plane on <interface address>:<port>  -> the page visitors use: list, browse, preview, download,
 *                                                 chunked upload, text, remove.
 *
 * Only Node built-ins are used: this file ships in the extension assets and is run by Raycast's Node runtime.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { pipeline } = require("node:stream/promises");

const EXTENSION_ID = "file-share";
const LIST_VERSION = 1;
const MAX_TEXT_LENGTH = 10000;
const MAX_JSON_BODY = 64 * 1024;
const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_CHUNK_SIZE = 64 * 1024 * 1024;
/** The largest value a classic zip field can hold; anything above it has to use the Zip64 extensions. */
const ZIP32_MAX = 0xffffffff;
const ZIP32_MAX_ENTRIES = 0xffff;
/** Unfinished uploads older than this are cleaned up when the service starts. */
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;

const supportPath = process.argv[2];
if (!supportPath) {
  console.error("usage: server.js <supportPath>");
  process.exit(2);
}

const configFile = path.join(supportPath, "config.json");
const listFile = path.join(supportPath, "list.json");
const qrFile = path.join(supportPath, "qr.png");
const startedAt = new Date().toISOString();

let dataServer = null;
let controlServer = null;
/** Host and port the data plane is actually listening on (frozen at startup). */
let boundHost = null;
let boundPort = null;
let lastGoodConfig = null;
let writeQueue = Promise.resolve();
const subscribers = new Set();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* --------------------------------------------------------------------------------------------- config */

async function readConfigFile() {
  const parsed = JSON.parse(await fsp.readFile(configFile, "utf8"));
  if (parsed.extension !== EXTENSION_ID) throw new Error("config.json belongs to another extension");
  return parsed;
}

/**
 * Re-read on every request: that is what makes the receiving directory apply without a restart. A config that
 * cannot be read right now falls back to the last good one instead of taking the service down.
 */
async function currentConfig() {
  try {
    lastGoodConfig = await readConfigFile();
  } catch (error) {
    if (!lastGoodConfig) throw error;
    console.error(`config: ${error.message}`);
  }
  return lastGoodConfig;
}

function receiveDirectoryOf(config) {
  const configured = String(config.receiveDirectory ?? "").trim();
  return path.resolve(configured === "" ? os.homedir() : expandHome(configured));
}

function expandHome(input) {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

async function writeJsonAtomic(filePath, value) {
  const temporary = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.tmp`);
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(temporary, filePath);
}

/* ----------------------------------------------------------------------------------------- share list */

async function readList() {
  try {
    const parsed = JSON.parse(await fsp.readFile(listFile, "utf8"));
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return { version: LIST_VERSION, entries: entries.filter((entry) => entry && typeof entry.id === "string") };
  } catch {
    return { version: LIST_VERSION, entries: [] };
  }
}

/** Mutations are serialised and always written atomically, so two requests cannot interleave a write. */
async function mutateList(mutate) {
  const run = writeQueue.then(async () => {
    const list = await readList();
    const result = await mutate(list);
    await writeJsonAtomic(listFile, list);
    broadcastListChange();
    return result;
  });
  writeQueue = run.catch(() => {});
  return run;
}

function normalizeEntry(input, source) {
  const type = input?.type;
  if (type !== "file" && type !== "directory" && type !== "text") {
    throw new HttpError(400, "Entry type must be file, directory or text");
  }
  const id = typeof input.id === "string" && input.id !== "" ? input.id : crypto.randomUUID();
  const addedAt = new Date().toISOString();

  if (type === "text") {
    const content = typeof input.content === "string" ? input.content : "";
    if (content.trim() === "") throw new HttpError(400, "The text is empty");
    if (content.length > MAX_TEXT_LENGTH) {
      throw new HttpError(400, `The text is longer than ${MAX_TEXT_LENGTH} characters`);
    }
    const name = typeof input.name === "string" && input.name.trim() !== "" ? input.name.trim() : firstLine(content);
    return { id, type, name, content, source, addedAt };
  }

  const target = typeof input.path === "string" ? path.resolve(input.path) : "";
  if (target === "") throw new HttpError(400, "Entry needs a path");
  const name = typeof input.name === "string" && input.name.trim() !== "" ? input.name.trim() : path.basename(target);
  return { id, type, name, path: target, source, addedAt };
}

function firstLine(text) {
  const line = text.split("\n").find((value) => value.trim() !== "") ?? "";
  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}

async function addEntry(input, source) {
  const entry = normalizeEntry(input, source);
  await mutateList((list) => {
    list.entries.unshift(entry);
  });
  return entry;
}

async function removeEntry(id) {
  const removed = await mutateList((list) => {
    const index = list.entries.findIndex((entry) => entry.id === id);
    if (index === -1) return false;
    list.entries.splice(index, 1);
    return true;
  });
  if (!removed) throw new HttpError(404, "Entry not found");
}

/** Emptying the list touches the list only: every file and folder stays exactly where it is. */
async function removeAllEntries() {
  await mutateList((list) => {
    list.entries = [];
  });
}

/** What the page and the panel see: everything the list holds, with sizes for paths that still exist. */
async function describeList() {
  const list = await readList();
  const entries = [];
  for (const entry of list.entries) {
    if (entry.type === "text") {
      entries.push({ ...entry, previewable: true });
      continue;
    }
    try {
      const stat = await fsp.stat(entry.path);
      entries.push({
        ...entry,
        type: stat.isDirectory() ? "directory" : "file",
        size: stat.isDirectory() ? 0 : stat.size,
        mtimeMs: stat.mtimeMs,
        missing: false,
      });
    } catch {
      entries.push({ ...entry, size: 0, missing: true });
    }
  }
  return entries;
}

/* ---------------------------------------------------------------------------------------------- paths */

function normalizeRelative(input) {
  const raw = String(input ?? "");
  if (raw === "") return "";
  if (raw.startsWith("/") || raw.startsWith("\\")) throw new HttpError(403, "Path outside the shared range");
  const normalized = path.posix.normalize(raw.replace(/\\/g, "/"));
  if (normalized === ".") return "";
  if (normalized.startsWith("..") || path.posix.isAbsolute(normalized)) {
    throw new HttpError(403, "Path outside the shared range");
  }
  return normalized;
}

async function findEntry(id) {
  const list = await readList();
  const entry = list.entries.find((item) => item.id === id);
  if (!entry) throw new HttpError(404, "This entry is no longer shared");
  return entry;
}

/**
 * Resolves a request inside one list entry. Every request has to name an entry first, so nothing outside the
 * list is reachable; relative paths are confined to that entry and symlinks may not escape it either.
 */
async function resolveEntry(id, relative) {
  const entry = await findEntry(id);
  if (entry.type === "text") throw new HttpError(400, "Text entries have no files");

  const normalized = normalizeRelative(relative);
  if (entry.type === "file") {
    if (normalized !== "") throw new HttpError(403, "Path outside the shared range");
    const real = await fsp.realpath(entry.path).catch(() => {
      throw new HttpError(404, "The shared file is gone");
    });
    return { abs: real, root: path.dirname(real), isDirectory: false, relative: "" };
  }

  const root = await fsp.realpath(entry.path).catch(() => {
    throw new HttpError(404, "The shared directory is gone");
  });
  const candidate = normalized === "" ? root : path.resolve(root, normalized);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new HttpError(403, "Path outside the shared range");
  }
  const real = await fsp.realpath(candidate).catch(() => {
    throw new HttpError(404, "Not found");
  });
  if (real !== root && !real.startsWith(root + path.sep)) {
    throw new HttpError(403, "Path outside the shared range");
  }
  const stat = await fsp.stat(real);
  return { abs: real, root, isDirectory: stat.isDirectory(), relative: normalized };
}

async function resolveItem(id, relative) {
  const entry = await findEntry(id);
  if (entry.type === "text") throw new HttpError(400, "Text entries cannot be downloaded as files");
  const target = await resolveEntry(id, relative);
  return { entry, target };
}

/* ----------------------------------------------------------------------------------------------- http */

function sendJson(response, status, payload) {
  const body = Buffer.from(`${JSON.stringify(payload)}\n`, "utf8");
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function describeError(error) {
  if (error instanceof HttpError) return error.message;
  const code = error && error.code ? `${error.code}: ` : "";
  return `${code}${error && error.message ? error.message : String(error)}`;
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > MAX_JSON_BODY) throw new HttpError(413, "Request body is too large");
  }
  if (body.trim() === "") return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Request body is not valid JSON");
  }
}

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
  ".m4a": "audio/mp4",
  ".md": "text/plain; charset=utf-8",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/**
 * The download name has to survive two kinds of clients. Browsers follow RFC 5987 and read `filename*`, but
 * mobile download managers (Quark, and some Android browsers) read the plain `filename` and — when both
 * parameters are present — paste them together, which turned 星网员工手册.md into
 * "______.md星网员工手册.md". So only the quoted name is sent, carrying the real UTF-8 bytes: Node writes
 * header strings as latin1, hence the byte-preserving round trip below.
 */
function contentDisposition(name) {
  const cleaned = name.replace(/[\u0000-\u001f\u007f"\\]/g, "_");
  const bytes = Buffer.from(cleaned, "utf8").toString("latin1");
  return `attachment; filename="${bytes}"`;
}

function parseRange(header, size) {
  if (typeof header !== "string" || !header.startsWith("bytes=")) return undefined;
  const [spec] = header.slice("bytes=".length).split(",");
  const match = /^(\d*)-(\d*)$/.exec(spec.trim());
  if (!match) return "invalid";
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return "invalid";
  if (size === 0) return "invalid";

  if (rawStart === "") {
    const length = Number(rawEnd);
    if (length <= 0) return "invalid";
    return { start: Math.max(size - length, 0), end: size - 1 };
  }
  const start = Number(rawStart);
  if (start >= size) return "invalid";
  const end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (end < start) return "invalid";
  return { start, end };
}

async function writeChunk(response, buffer) {
  if (!response.write(buffer)) await once(response, "drain");
}

/* ------------------------------------------------------------------------------------------ data plane */

async function handleDataRequest(request, response) {
  try {
    const url = new URL(request.url, "http://localhost");
    const config = await currentConfig();

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return await serveWebAsset(response, config, "index.html");
    }
    if (request.method === "GET" && url.pathname.startsWith("/static/")) {
      const relative = path.posix.join("static", url.pathname.slice("/static/".length));
      return await serveWebAsset(response, config, relative);
    }
    if (request.method === "GET" && url.pathname === "/qr.png") {
      return await serveQr(response);
    }
    if (request.method === "GET" && url.pathname === "/api/list") {
      return sendJson(response, 200, { entries: await describeList() });
    }
    if (request.method === "GET" && url.pathname === "/api/browse") {
      return sendJson(response, 200, await browse(url.searchParams.get("entry") ?? "", url.searchParams.get("path") ?? ""));
    }
    if (request.method === "GET" && url.pathname === "/api/file") {
      const item = await resolveItem(url.searchParams.get("entry") ?? "", url.searchParams.get("path") ?? "");
      return await serveFile(request, response, item, url.searchParams.get("download") === "1");
    }
    if (request.method === "GET" && url.pathname === "/api/zip") {
      return await serveZip(response, url.searchParams.getAll("entry"), url.searchParams.getAll("path"));
    }
    if (request.method === "POST" && url.pathname === "/api/download") {
      return sendJson(response, 200, await prepareDownload(await readJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/list") {
      const body = await readJsonBody(request);
      // Visitors may only contribute text; files reach the list through the upload endpoints.
      return sendJson(response, 200, { entry: await addEntry({ content: body.content, name: body.name, type: "text" }, clientIp(request)) });
    }
    if (request.method === "DELETE" && url.pathname === "/api/list") {
      // `all=1` empties the list in one atomic write; otherwise a single entry is removed.
      if (url.searchParams.get("all") === "1") await removeAllEntries();
      else await removeEntry(url.searchParams.get("id") ?? "");
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === "POST" && url.pathname === "/api/upload/init") {
      return sendJson(response, 200, await uploadInit(await readJsonBody(request), config));
    }
    if (request.method === "POST" && url.pathname === "/api/upload/chunk") {
      return sendJson(response, 200, await uploadChunk(request, url.searchParams, config));
    }
    if (request.method === "POST" && url.pathname === "/api/upload/complete") {
      return sendJson(response, 200, await uploadComplete(url.searchParams, config, clientIp(request)));
    }
    if (request.method === "DELETE" && url.pathname === "/api/upload") {
      await uploadCancel(url.searchParams, config);
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === "GET" && url.pathname === "/api/events") {
      return subscribe(response);
    }
    throw new HttpError(404, "Not found");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    // A visitor who leaves the page (or cancels an upload) drops the socket mid-chunk; that is not an error
    // worth a stack trace, and the response is already gone.
    if (isAbortedRequest(error)) {
      if (!response.headersSent) response.destroy();
      return;
    }
    console.error(`${request.method} ${request.url}: ${describeError(error)}`);
    if (response.headersSent) response.destroy();
    else sendJson(response, status, { error: describeError(error) });
  }
}

function isAbortedRequest(error) {
  if (!error || typeof error !== "object") return false;
  const code = error.code ?? "";
  if (code === "ECONNRESET" || code === "ERR_STREAM_PREMATURE_CLOSE" || code === "EPIPE") return true;
  return /aborted|premature close/i.test(String(error.message ?? ""));
}

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded !== "") return forwarded.split(",")[0].trim();
  const address = request.socket?.remoteAddress ?? "";
  return address.replace(/^::ffff:/, "");
}

async function serveWebAsset(response, config, relative) {
  const root = path.resolve(config.assetsPath, "web");
  const normalized = normalizeRelative(relative === "" ? "index.html" : relative);
  const target = path.resolve(root, normalized);
  if (target !== root && !target.startsWith(root + path.sep)) throw new HttpError(403, "Not available");
  let body;
  try {
    body = await fsp.readFile(target);
  } catch {
    throw new HttpError(404, "Not found");
  }
  response.writeHead(200, {
    "Content-Type": contentTypeFor(target),
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

/** The panel renders the QR code from this endpoint, so it needs no local-file image support. */
async function serveQr(response) {
  let body;
  try {
    body = await fsp.readFile(qrFile);
  } catch {
    throw new HttpError(404, "No QR code has been generated yet");
  }
  response.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

async function browse(entryId, relative) {
  const entry = await findEntry(entryId);
  if (entry.type === "text") throw new HttpError(400, "Text entries have no directory");
  const target = await resolveEntry(entryId, relative);
  if (!target.isDirectory) throw new HttpError(400, "This entry is not a directory");

  const entries = [];
  for (const dirent of await fsp.readdir(target.abs, { withFileTypes: true })) {
    const absolute = path.join(target.abs, dirent.name);
    const relativePath = target.relative === "" ? dirent.name : `${target.relative}/${dirent.name}`;
    try {
      const real = await fsp.realpath(absolute);
      if (real !== target.root && !real.startsWith(target.root + path.sep)) continue;
      const stat = await fsp.stat(real);
      entries.push({
        name: dirent.name,
        path: relativePath,
        type: stat.isDirectory() ? "directory" : "file",
        size: stat.isDirectory() ? 0 : stat.size,
        mtimeMs: stat.mtimeMs,
      });
    } catch {
      // Broken symlink or a file that vanished between readdir and stat.
    }
  }
  entries.sort(
    (left, right) =>
      Number(right.type === "directory") - Number(left.type === "directory") ||
      left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }),
  );

  return {
    entry: { id: entry.id, name: entry.name, type: entry.type },
    dir: target.relative,
    parent: target.relative === "" ? null : target.relative.split("/").slice(0, -1).join("/"),
    entries,
  };
}

async function serveFile(request, response, item, isDownload) {
  if (item.target.isDirectory) throw new HttpError(400, "This entry is a directory");
  const stat = await fsp.stat(item.target.abs);
  const headers = {
    "Content-Type": contentTypeFor(item.target.abs),
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Last-Modified": new Date(stat.mtimeMs).toUTCString(),
  };
  if (isDownload) headers["Content-Disposition"] = contentDisposition(path.basename(item.target.abs));

  const range = parseRange(request.headers.range, stat.size);
  if (range === "invalid") {
    response.writeHead(416, { ...headers, "Content-Range": `bytes */${stat.size}` });
    response.end();
    return;
  }
  if (range) {
    response.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
      "Content-Length": range.end - range.start + 1,
    });
    await pipeline(fs.createReadStream(item.target.abs, { start: range.start, end: range.end }), response);
    return;
  }
  response.writeHead(200, { ...headers, "Content-Length": stat.size });
  await pipeline(fs.createReadStream(item.target.abs), response);
}

/** Resolves a batch download into the file list the archive will hold; also used for the pre-flight check. */
async function collectZipFiles(entryIds, relatives) {
  if (entryIds.length === 0) throw new HttpError(400, "Select at least one entry");
  const files = [];
  for (let index = 0; index < entryIds.length; index += 1) {
    const entryId = entryIds[index];
    const relative = relatives[index] ?? "";
    const item = await resolveItem(entryId, relative);
    if (item.target.isDirectory) {
      const prefix = item.target.relative === "" ? item.entry.name : path.posix.basename(item.target.relative);
      await collectFiles(item.target.abs, prefix, files);
    } else {
      files.push({ abs: item.target.abs, name: path.basename(item.target.abs) });
    }
  }
  if (files.length === 0) throw new HttpError(400, "Nothing to download");
  return files;
}

/**
 * Turns the entries the page selected into the URL to download. The page asks for it instead of navigating
 * straight at the file, so a request that cannot be served answers with a message it can show; one entry that
 * happens to be a directory — or several entries at once — simply becomes a zip.
 */
async function prepareDownload(body) {
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) throw new HttpError(400, "Select at least one entry");
  const entryIds = items.map((item) => String(item?.entry ?? ""));
  const relatives = items.map((item) => String(item?.path ?? ""));

  if (items.length === 1 && relatives[0] === "") {
    const item = await resolveItem(entryIds[0], "");
    if (!item.target.isDirectory) {
      // Fails here — with a message the page can show — when the file is gone.
      await fsp.stat(item.target.abs);
      return { url: `/api/file?entry=${encodeURIComponent(entryIds[0])}&path=&download=1` };
    }
  }

  await collectZipFiles(entryIds, relatives);
  const query = entryIds
    .map((entryId, index) => `entry=${encodeURIComponent(entryId)}&path=${encodeURIComponent(relatives[index])}`)
    .join("&");
  return { url: `/api/zip?${query}` };
}

async function serveZip(response, entryIds, relatives) {
  const files = await collectZipFiles(entryIds, relatives);

  response.writeHead(200, {
    "Content-Type": "application/zip",
    "Cache-Control": "no-store",
    "Content-Disposition": contentDisposition(`file-share-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`),
  });
  await streamZip(response, files);
}

async function collectFiles(directory, prefix, out) {
  for (const dirent of await fsp.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, dirent.name);
    const name = `${prefix}/${dirent.name}`;
    if (dirent.isDirectory()) await collectFiles(absolute, name, out);
    else if (dirent.isFile()) out.push({ abs: absolute, name });
  }
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value;
  }
  return table;
})();

function crc32Update(crc, buffer) {
  let value = crc;
  for (let index = 0; index < buffer.length; index += 1) {
    value = CRC_TABLE[(value ^ buffer[index]) & 0xff] ^ (value >>> 8);
  }
  return value;
}

function dosDateTime(mtimeMs) {
  const date = new Date(mtimeMs);
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** A Zip64 "extended information" extra field holding 8 byte values in the order the spec prescribes. */
function zip64Extra(values) {
  const extra = Buffer.alloc(4 + values.length * 8);
  extra.writeUInt16LE(0x0001, 0);
  extra.writeUInt16LE(values.length * 8, 2);
  values.forEach((value, index) => extra.writeBigUInt64LE(BigInt(value), 4 + index * 8));
  return extra;
}

/**
 * Writes a stored (uncompressed) zip while streaming, so a batch download never holds the entries in memory.
 * Sizes and checksums are unknown up front, hence the data descriptors. Entries of 4 GiB or more (and archives
 * that grow past that, or past 65535 entries) switch to the Zip64 extensions, so a big video can be part of a
 * batch download just like a small one.
 */
async function streamZip(response, files) {
  const central = [];
  let offset = 0;

  for (const file of files) {
    const stat = await fsp.stat(file.abs);
    const name = Buffer.from(file.name, "utf8");
    const stamps = dosDateTime(stat.mtimeMs);
    // The local header only carries 32 bit sizes, so it needs Zip64 exactly when the file is that large.
    const zip64 = stat.size >= ZIP32_MAX;
    const extra = zip64 ? zip64Extra([stat.size, stat.size]) : Buffer.alloc(0);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(zip64 ? 45 : 20, 4);
    header.writeUInt16LE(0x0808, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(stamps.time, 10);
    header.writeUInt16LE(stamps.date, 12);
    header.writeUInt32LE(zip64 ? ZIP32_MAX : 0, 14);
    header.writeUInt32LE(zip64 ? ZIP32_MAX : 0, 18);
    header.writeUInt32LE(zip64 ? ZIP32_MAX : 0, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(extra.length, 28);
    await writeChunk(response, header);
    await writeChunk(response, name);
    if (extra.length > 0) await writeChunk(response, extra);

    const localOffset = offset;
    offset += header.length + name.length + extra.length;

    let crc = 0xffffffff;
    let size = 0;
    for await (const chunk of fs.createReadStream(file.abs)) {
      crc = crc32Update(crc, chunk);
      size += chunk.length;
      await writeChunk(response, chunk);
    }
    const checksum = (crc ^ 0xffffffff) >>> 0;

    // The descriptor matches the entry: 8 byte sizes once the entry is a Zip64 one.
    const descriptor = Buffer.alloc(zip64 ? 24 : 16);
    descriptor.writeUInt32LE(0x08074b50, 0);
    descriptor.writeUInt32LE(checksum, 4);
    if (zip64) {
      descriptor.writeBigUInt64LE(BigInt(size), 8);
      descriptor.writeBigUInt64LE(BigInt(size), 16);
    } else {
      descriptor.writeUInt32LE(size, 8);
      descriptor.writeUInt32LE(size, 12);
    }
    await writeChunk(response, descriptor);
    offset += size + descriptor.length;

    central.push({ name, checksum, size, localOffset, stamps });
  }

  let centralSize = 0;
  for (const entry of central) {
    const sizeOverflow = entry.size >= ZIP32_MAX;
    const offsetOverflow = entry.localOffset >= ZIP32_MAX;
    const values = [];
    if (sizeOverflow) values.push(entry.size, entry.size);
    if (offsetOverflow) values.push(entry.localOffset);
    const extra = values.length > 0 ? zip64Extra(values) : Buffer.alloc(0);
    const version = values.length > 0 ? 45 : 20;

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(version, 4);
    record.writeUInt16LE(version, 6);
    record.writeUInt16LE(0x0808, 8);
    record.writeUInt16LE(0, 10);
    record.writeUInt16LE(entry.stamps.time, 12);
    record.writeUInt16LE(entry.stamps.date, 14);
    record.writeUInt32LE(entry.checksum, 16);
    record.writeUInt32LE(sizeOverflow ? ZIP32_MAX : entry.size, 20);
    record.writeUInt32LE(sizeOverflow ? ZIP32_MAX : entry.size, 24);
    record.writeUInt16LE(entry.name.length, 28);
    record.writeUInt16LE(extra.length, 30);
    record.writeUInt32LE(offsetOverflow ? ZIP32_MAX : entry.localOffset, 42);
    await writeChunk(response, record);
    await writeChunk(response, entry.name);
    if (extra.length > 0) await writeChunk(response, extra);
    centralSize += record.length + entry.name.length + extra.length;
  }

  // Above 4 GiB of archive, or past 65535 entries, the classic end record cannot describe the archive any
  // more, and the Zip64 end record plus its locator take over.
  if (offset >= ZIP32_MAX || centralSize >= ZIP32_MAX || central.length > ZIP32_MAX_ENTRIES) {
    const end64 = Buffer.alloc(56);
    end64.writeUInt32LE(0x06064b50, 0);
    end64.writeBigUInt64LE(BigInt(44), 4);
    end64.writeUInt16LE(45, 12);
    end64.writeUInt16LE(45, 14);
    end64.writeBigUInt64LE(BigInt(central.length), 24);
    end64.writeBigUInt64LE(BigInt(central.length), 32);
    end64.writeBigUInt64LE(BigInt(centralSize), 40);
    end64.writeBigUInt64LE(BigInt(offset), 48);
    await writeChunk(response, end64);

    const locator = Buffer.alloc(20);
    locator.writeUInt32LE(0x07064b50, 0);
    locator.writeBigUInt64LE(BigInt(offset + centralSize), 8);
    locator.writeUInt32LE(1, 16);
    await writeChunk(response, locator);
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Math.min(central.length, ZIP32_MAX_ENTRIES), 8);
  end.writeUInt16LE(Math.min(central.length, ZIP32_MAX_ENTRIES), 10);
  end.writeUInt32LE(Math.min(centralSize, ZIP32_MAX), 12);
  end.writeUInt32LE(Math.min(offset, ZIP32_MAX), 16);
  await writeChunk(response, end);
  response.end();
}

/* -------------------------------------------------------------------------------------------- uploads */

function partsRoot(config) {
  return path.join(receiveDirectoryOf(config), ".file-share-parts");
}

function partDirectory(config, uploadId) {
  return path.join(partsRoot(config), uploadId);
}

function uploadIdFor(name, size, lastModified) {
  return crypto.createHash("sha1").update(`${name}|${size}|${lastModified}`).digest("hex").slice(0, 32);
}

async function receivedChunks(config, uploadId) {
  const indexes = [];
  let dirents = [];
  try {
    dirents = await fsp.readdir(partDirectory(config, uploadId));
  } catch {
    return indexes;
  }
  for (const name of dirents) {
    const index = Number(name);
    if (Number.isInteger(index) && index >= 0) indexes.push(index);
  }
  return indexes.sort((left, right) => left - right);
}

async function uploadInit(body, config) {
  const name = sanitizeFileName(typeof body.name === "string" ? body.name : "");
  const size = Number(body.size);
  const lastModified = Number(body.lastModified ?? 0);
  if (!Number.isFinite(size) || size < 0) throw new HttpError(400, "Upload needs a size");

  const requested = Number(body.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const chunkSize = Math.min(Math.max(Number.isFinite(requested) ? requested : DEFAULT_CHUNK_SIZE, 64 * 1024), MAX_CHUNK_SIZE);
  const uploadId = uploadIdFor(name, size, lastModified);

  await fsp.mkdir(partDirectory(config, uploadId), { recursive: true });
  return { uploadId, name, size, chunkSize, received: await receivedChunks(config, uploadId) };
}

async function uploadChunk(request, searchParams, config) {
  const uploadId = sanitizeUploadId(searchParams.get("uploadId"));
  const index = Number(searchParams.get("index"));
  if (!Number.isInteger(index) || index < 0 || index > 100000) throw new HttpError(400, "Chunk index is missing");

  const directory = partDirectory(config, uploadId);
  if (!fs.existsSync(directory)) throw new HttpError(409, "This upload is no longer known; start it again");
  // Written under a temporary name and renamed once the whole chunk arrived: a connection that dies halfway
  // must not leave a short file that a later resume would count as a complete chunk.
  const temporary = path.join(directory, `.${index}.part`);
  try {
    await pipeline(request, fs.createWriteStream(temporary));
    await fsp.rename(temporary, path.join(directory, String(index)));
  } catch (error) {
    await fsp.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  return { received: index };
}

/** Cancelling drops every chunk received so far, so nothing half-finished stays in the receive directory. */
async function uploadCancel(searchParams, config) {
  const uploadId = sanitizeUploadId(searchParams.get("uploadId"));
  await fsp.rm(partDirectory(config, uploadId), { recursive: true, force: true });
  return { ok: true };
}

async function uploadComplete(searchParams, config, source) {
  const uploadId = sanitizeUploadId(searchParams.get("uploadId"));
  const declared = Number(searchParams.get("size"));
  const lastModified = Number(searchParams.get("lastModified") ?? 0);
  const declaredName = sanitizeFileName(searchParams.get("name") ?? "");

  const directory = partDirectory(config, uploadId);
  const indexes = await receivedChunks(config, uploadId);
  if (indexes.length === 0) throw new HttpError(409, "No chunks were received");

  const receiveDirectory = receiveDirectoryOf(config);
  await fsp.mkdir(receiveDirectory, { recursive: true });
  const target = await reserveUniqueTarget(receiveDirectory, declaredName || "upload");
  const output = fs.createWriteStream(target);
  try {
    for (let index = 0; index < indexes.length; index += 1) {
      if (indexes[index] !== index) throw new HttpError(409, "A chunk is missing; upload the file again");
      // `end: false` keeps the same destination open while chunks are appended in order.
      await pipeline(fs.createReadStream(path.join(directory, String(index))), output, { end: false });
    }
    await new Promise((resolve, reject) => {
      output.on("error", reject);
      output.end(resolve);
    });
  } catch (error) {
    output.destroy();
    await fsp.rm(target, { force: true }).catch(() => {});
    throw error;
  }
  await fsp.rm(directory, { recursive: true, force: true });

  const stat = await fsp.stat(target);
  if (Number.isFinite(declared) && declared > 0 && stat.size !== declared) {
    console.error(`upload size mismatch: expected ${declared}, got ${stat.size}`);
  }
  const entry = await addEntry(
    {
      type: "file",
      name: path.basename(target),
      path: target,
      id: crypto.randomUUID(),
      lastModified,
    },
    source,
  );
  return { entry };
}

function sanitizeUploadId(value) {
  const uploadId = String(value ?? "");
  if (!/^[a-f0-9]{8,64}$/.test(uploadId)) throw new HttpError(400, "Unknown upload id");
  return uploadId;
}

function sanitizeFileName(input) {
  const base = path.basename(String(input).replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").replace(/^\.+/, "");
  if (base === "") return "file";
  if (Buffer.byteLength(base, "utf8") <= 200) return base;
  const extension = path.extname(base).slice(0, 32);
  const stem = base.slice(0, base.length - path.extname(base).length);
  return `${stem.slice(0, 160)}${extension}`;
}

/** Reserves the first free name with "wx", so an existing file is never overwritten even when uploads race. */
async function reserveUniqueTarget(directory, name) {
  const extension = path.extname(name);
  const stem = name.slice(0, name.length - extension.length) || "file";
  for (let index = 0; index < 1000; index += 1) {
    const candidate = path.join(directory, index === 0 ? name : `${stem}-${index}${extension}`);
    try {
      const handle = await fsp.open(candidate, "wx");
      await handle.close();
      return candidate;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
  throw new HttpError(500, "Could not find a free file name in the receive directory");
}

async function cleanStaleUploads(config) {
  let dirents = [];
  try {
    dirents = await fsp.readdir(partsRoot(config), { withFileTypes: true });
  } catch {
    return;
  }
  const deadline = Date.now() - STALE_UPLOAD_MS;
  for (const dirent of dirents) {
    const target = path.join(partsRoot(config), dirent.name);
    try {
      const stat = await fsp.stat(target);
      if (stat.mtimeMs < deadline) await fsp.rm(target, { recursive: true, force: true });
    } catch {
      // Ignore entries that disappeared meanwhile.
    }
  }
}

/* --------------------------------------------------------------------------------------------- events */

function broadcastListChange() {
  for (const subscriber of subscribers) {
    try {
      subscriber.write(`data: ${JSON.stringify({ type: "list-change" })}\n\n`);
    } catch {
      subscribers.delete(subscriber);
    }
  }
}

function subscribe(response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  });
  response.write(`data: ${JSON.stringify({ type: "hello" })}\n\n`);
  subscribers.add(response);
  const heartbeat = setInterval(() => {
    try {
      response.write(": ping\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);
  response.on("close", () => {
    clearInterval(heartbeat);
    subscribers.delete(response);
  });
}

/* --------------------------------------------------------------------------------------- control plane */

async function statusPayload() {
  const config = await currentConfig();
  const entries = await describeList();
  // Report the address we are actually bound to, not the latest config file values.
  // Config can change (receive directory, preferred host/port) without a restart; until the
  // service is restarted, visitors still reach the original host:port.
  const host = boundHost ?? config.host;
  const port = boundPort ?? config.port;
  return {
    extension: EXTENSION_ID,
    configVersion: config.version,
    pid: process.pid,
    startedAt,
    address: `http://${host}:${port}/`,
    host,
    port,
    receiveDirectory: receiveDirectoryOf(config),
    entryCount: entries.length,
    textCount: entries.filter((entry) => entry.type === "text").length,
    fileCount: entries.filter((entry) => entry.type === "file").length,
    directoryCount: entries.filter((entry) => entry.type === "directory").length,
  };
}

async function handleControlRequest(request, response) {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/status") {
      return sendJson(response, 200, await statusPayload());
    }
    if (request.method === "GET" && url.pathname === "/list") {
      return sendJson(response, 200, { entries: await describeList() });
    }
    if (request.method === "POST" && url.pathname === "/list") {
      const body = await readJsonBody(request);
      return sendJson(response, 200, { entry: await addEntry(body, "host") });
    }
    if (request.method === "DELETE" && url.pathname === "/list") {
      await removeEntry(url.searchParams.get("id") ?? "");
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === "POST" && url.pathname === "/stop") {
      sendJson(response, 200, { ok: true });
      setTimeout(shutdown, 50);
      return;
    }
    if (request.method === "POST" && url.pathname === "/reload") {
      await currentConfig();
      return sendJson(response, 200, await statusPayload());
    }
    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(response, error instanceof HttpError ? error.status : 500, { error: describeError(error) });
  }
}

/* ----------------------------------------------------------------------------------------------- boot */

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
}

function shutdown() {
  for (const server of [dataServer, controlServer]) {
    try {
      server?.close();
    } catch {
      // Already closed.
    }
  }
  for (const subscriber of subscribers) {
    try {
      subscriber.end();
    } catch {
      // Ignore.
    }
  }
  subscribers.clear();
  process.exit(0);
}

/**
 * The service outlives the Raycast command, but not Raycast itself: the host process id is re-read from the
 * config, so a stale id after a Raycast restart is picked up from the next panel run.
 */
function watchHostProcess() {
  setInterval(async () => {
    let pid;
    try {
      const config = await readConfigFile();
      pid = Number(config.hostPid);
    } catch {
      return;
    }
    if (!Number.isInteger(pid) || pid <= 0) return;
    if (!isProcessAlive(pid)) {
      console.error(`host process ${pid} is gone; stopping`);
      shutdown();
    }
  }, 5000).unref();
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function main() {
  const config = await currentConfig();
  if (!config.host || !Number.isInteger(config.port) || !Number.isInteger(config.controlPort)) {
    console.error("config.json is missing the interface address, the port or the control port");
    process.exit(2);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  controlServer = http.createServer((request, response) => void handleControlRequest(request, response));
  dataServer = http.createServer((request, response) => void handleDataRequest(request, response));

  try {
    await listen(controlServer, config.controlPort, "127.0.0.1");
  } catch (error) {
    console.error(`control plane on ${config.controlPort}: ${describeError(error)}`);
    process.exit(4);
  }

  try {
    await listen(dataServer, config.port, config.host);
  } catch (error) {
    console.error(`data plane on ${config.host}:${config.port}: ${describeError(error)}`);
    controlServer.close();
    process.exit(3);
  }

  boundHost = config.host;
  boundPort = config.port;

  cleanStaleUploads(config).catch((error) => console.error(`stale upload cleanup: ${describeError(error)}`));
  watchHostProcess();
}

main().catch((error) => {
  console.error(`startup failed: ${describeError(error)}`);
  process.exit(1);
});
