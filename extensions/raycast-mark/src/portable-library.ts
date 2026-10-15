import type * as Fs from "node:fs/promises";
import type * as Path from "node:path";
import type * as Crypto from "node:crypto";
import type { Buffer as NodeBuffer } from "node:buffer";

export interface PortableNode {
  fs: typeof Fs;
  path: typeof Path;
  crypto: Pick<typeof Crypto, "createHash" | "randomUUID">;
  Buffer: typeof NodeBuffer;
}
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export interface PortableDocument {
  schemaVersion: 1;
  source: "goose-marks";
  groups: Record<string, Json>[];
  bookmarks: Record<string, Json>[];
}
export interface PortableRead {
  root: string;
  bookmarksText: string;
  bookmarksDigest: string;
  /** Expanded images exist only in memory; pass this document to an application importer. */
  document: PortableDocument;
  settings?: { text: string; digest: string; document: Json } | null;
}
export interface PreparedPortable {
  readonly bookmarksDigest: string;
  readonly resourceCount: number;
  readonly resourceBytes: number;
}
export interface PortableExpected {
  /** null requires bookmarks.json to be absent. */
  bookmarks: string | null;
  /** Required when explicitly writing settings; null requires settings.json to be absent. */
  settings?: string | null;
}
export interface PortableWriteOptions {
  expected: PortableExpected;
  /** Omit to preserve settings.json byte for byte. null explicitly writes JSON null. */
  settings?: Json;
}
export interface PortableReceipt {
  bookmarksDigest: string;
  settingsDigest?: string;
}
export interface PortableLock {
  readonly root: string;
}
export type PortableErrorCode =
  | "INVALID"
  | "LIMIT"
  | "UNSAFE_PATH"
  | "BUSY"
  | "STALE"
  | "CORRUPT"
  | "WRITE_FAILED";
export class PortableError extends Error {
  constructor(
    readonly code: PortableErrorCode,
    message: string,
    /** On write failure, reread before retrying: files cannot be committed together. */
    readonly published?: { bookmarks: boolean; settings: boolean },
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PortableError";
  }
}
export const PORTABLE_LIMITS = {
  jsonBytes: 10 * 1024 * 1024,
  iconBytes: 2 * 1024 * 1024,
  resourceBytes: 100 * 1024 * 1024,
  resources: 10000,
} as const;
const assetPattern =
  /^assets\/icons\/([a-f0-9]{64})\.(png|jpg|webp|gif|svg|ico)$/;
const mimes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};
function record(value: unknown): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PortableError("INVALID", "Expected a JSON object");
  return value as Record<string, Json>;
}
function missing(error: unknown): boolean {
  return (error as { code?: string })?.code === "ENOENT";
}

/** Runtime dependencies must be injected by the Node host, never imported by a Web bundle. */
export function createPortableLibrary(node: PortableNode) {
  const { fs, path, crypto, Buffer } = node;
  const digest = (bytes: string | Uint8Array) =>
    crypto.createHash("sha256").update(bytes).digest("hex");
  const fail = (code: PortableErrorCode, message: string): never => {
    throw new PortableError(code, message);
  };
  const plans = new WeakMap<
    PreparedPortable,
    { text: string; assets: Map<string, NodeBuffer> }
  >();
  const locks = new WeakMap<
    PortableLock,
    {
      dev: number;
      ino: number;
      rootDev: number;
      rootIno: number;
      published: { bookmarks: boolean; settings: boolean };
    }
  >();
  const utf8 = (bytes: Uint8Array) => {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return fail("CORRUPT", "File is not valid UTF-8");
    }
  };
  const parse = (text: string): Json => {
    try {
      return JSON.parse(text) as Json;
    } catch {
      return fail("CORRUPT", "File is not valid JSON");
    }
  };
  function stringify(value: unknown, enforceLimit = true): string {
    // Reject values JSON.stringify would silently discard or coerce.
    const active = new Set<object>();
    const visit = (v: unknown, depth: number): void => {
      if (depth > 100) fail("LIMIT", "JSON nesting exceeds 100 levels");
      if (v === null || typeof v === "string" || typeof v === "boolean") return;
      if (typeof v === "number" && Number.isFinite(v)) return;
      if (typeof v !== "object" || active.has(v as object))
        fail("INVALID", "Expected finite, acyclic JSON values");
      const o = v as object;
      if (
        !Array.isArray(o) &&
        Object.getPrototypeOf(o) !== Object.prototype &&
        Object.getPrototypeOf(o) !== null
      )
        fail("INVALID", "Expected plain JSON objects");
      active.add(o);
      for (const entry of Object.values(o)) visit(entry, depth + 1);
      active.delete(o);
    };
    visit(value, 0);
    const text = JSON.stringify(value, null, 2) + "\n";
    if (enforceLimit && Buffer.byteLength(text) > PORTABLE_LIMITS.jsonBytes)
      fail("LIMIT", "JSON exceeds 10 MiB");
    return text;
  }
  function document(value: unknown): PortableDocument {
    const o = record(value);
    if (o.schemaVersion !== 1 || o.source !== "goose-marks")
      fail("INVALID", "Expected schemaVersion:1 and source:goose-marks");
    if (
      Object.keys(o).some(
        (k) => !["schemaVersion", "source", "groups", "bookmarks"].includes(k),
      )
    )
      fail(
        "INVALID",
        "Portable root accepts only schemaVersion/source/groups/bookmarks; put Goose settings in settings.json",
      );
    for (const key of ["groups", "bookmarks"])
      if (!Array.isArray(o[key]) || (o[key] as Json[]).length > 10000)
        fail("LIMIT", `${key} must be an array with at most 10000 entries`);
    for (const entry of [...(o.groups as Json[]), ...(o.bookmarks as Json[])])
      record(entry);
    return o as unknown as PortableDocument;
  }
  function image(bytes: NodeBuffer): string {
    if (!bytes.length || bytes.length > PORTABLE_LIMITS.iconBytes)
      fail("LIMIT", "Image must contain 1 byte to 2 MiB");
    const hex = (start: number, end: number) =>
      bytes.subarray(start, end).toString("hex");
    if (
      hex(0, 8) === "89504e470d0a1a0a" &&
      bytes.length >= 24 &&
      bytes.subarray(12, 16).toString() === "IHDR"
    )
      return "png";
    if (hex(0, 3) === "ffd8ff" && bytes.length >= 4) return "jpg";
    if (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP"
    )
      return "webp";
    if (
      bytes.length >= 13 &&
      /^(GIF87a|GIF89a)$/.test(bytes.subarray(0, 6).toString())
    )
      return "gif";
    if (
      bytes.length >= 22 &&
      hex(0, 4) === "00000100" &&
      bytes.readUInt16LE(4) > 0
    )
      return "ico";
    const prefix = bytes
      .subarray(0, Math.min(bytes.length, 4096))
      .toString("utf8")
      .replace(/^\uFEFF/, "");
    if (
      /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/i.test(
        prefix,
      )
    ) {
      const svg = utf8(bytes);
      // Embedded raster pixels are self-contained; external URLs and nested SVG remain forbidden.
      const checkedSvg = svg.replace(
        /\b(?:xlink:)?href\s*=\s*(["'])data:image\/(?:png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon);base64,([A-Za-z0-9+/]+={0,2})\1/gi,
        (_attribute, _quote, encoded: string) => {
          const raster = Buffer.from(encoded, "base64");
          if (encoded.length % 4 || raster.toString("base64") !== encoded)
            fail("INVALID", "Invalid embedded raster image");
          if (image(raster) === "svg")
            fail("INVALID", "Nested SVG images are not supported");
          return 'href="#"';
        },
      );
      // SVGs are images, not a transport for external files or executable markup.
      if (
        /<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?!#)|url\s*\(\s*(?!["']?#)/i.test(
          checkedSvg,
        )
      )
        fail(
          "INVALID",
          "SVG contains executable markup or external references",
        );
      if (!/<\/svg\s*>\s*$/i.test(svg) && !/<svg\b[^>]*\/\s*>\s*$/i.test(svg))
        fail("CORRUPT", "SVG root is not closed");
      return "svg";
    }
    return fail(
      "CORRUPT",
      "Unsupported image bytes (PNG/JPEG/WebP/GIF/SVG/ICO required)",
    );
  }
  function dataBytes(value: string): NodeBuffer {
    const match =
      /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]*={0,2})$/i.exec(value);
    if (
      !match ||
      !match[1] ||
      match[1].length > Math.ceil(PORTABLE_LIMITS.iconBytes / 3) * 4 ||
      match[1].length % 4
    )
      return fail("INVALID", "Invalid or oversized image dataURL");
    const bytes = Buffer.from(match[1], "base64");
    if (bytes.toString("base64") !== match[1])
      fail("INVALID", "Noncanonical base64 image");
    image(bytes); // MIME is deliberately inferred from bytes, including legacy MIME mismatches.
    return bytes;
  }
  function iconEntries(doc: PortableDocument): Record<string, Json>[] {
    const result: Record<string, Json>[] = [];
    const walk = (value: Json, depth = 0): void => {
      if (depth > 100) fail("LIMIT", "Document nesting exceeds 100 levels");
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        for (const item of value) walk(item, depth + 1);
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (key === "icon" && child !== null) result.push(record(child));
        else walk(child, depth + 1);
      }
    };
    walk(doc.groups);
    walk(doc.bookmarks);
    return result;
  }
  function iconField(
    icon: Record<string, Json>,
  ): "path" | "data" | "cache" | null {
    const type = icon.type;
    const fields: Record<string, string[]> = {
      file: ["path", "hash"],
      custom: ["data"],
      remote: ["src", "cache"],
      text: ["value"],
      emoji: ["value"],
    };
    if (typeof type !== "string" || !fields[type])
      return fail("INVALID", "Unsupported icon type");
    if (
      Object.keys(icon).some(
        (k) => !["type", "bgColor", "fetchedAt", ...fields[type]].includes(k),
      )
    )
      fail("INVALID", "Unsupported icon field");
    if (type === "text" || type === "emoji") {
      if (typeof icon.value !== "string" || icon.value.startsWith("data:"))
        fail("INVALID", "Invalid text icon");
      return null;
    }
    if (type === "remote") {
      if (typeof icon.src !== "string")
        fail("INVALID", "Remote icon requires a URL");
      let url: URL;
      try {
        url = new URL(icon.src as string);
      } catch {
        return fail("INVALID", "Invalid remote icon URL");
      }
      if (!["http:", "https:"].includes(url.protocol))
        fail("INVALID", "Remote icon requires HTTP(S)");
      if (icon.cache === undefined || icon.cache === "") return null;
      return "cache";
    }
    return type === "file" ? "path" : "data";
  }
  async function safeDirectory(directory: string): Promise<string> {
    if (!path.isAbsolute(directory))
      fail("UNSAFE_PATH", "An explicit absolute directory is required");
    const root = path.resolve(directory);
    let cursor = path.parse(root).root;
    for (const component of root
      .slice(cursor.length)
      .split(path.sep)
      .filter(Boolean)) {
      cursor = path.join(cursor, component);
      const stat = await fs.lstat(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        fail(
          "UNSAFE_PATH",
          `Directory contains a symbolic link or non-directory: ${cursor}`,
        );
    }
    return root;
  }
  async function safeFile(root: string, relative: string): Promise<string> {
    if (
      !["bookmarks.json", "settings.json", "bookmarks.json.lock"].includes(
        relative,
      ) &&
      !assetPattern.test(relative)
    )
      fail(
        "UNSAFE_PATH",
        `Path is outside the portable whitelist: ${relative}`,
      );
    await safeDirectory(root);
    const parent = path.dirname(relative);
    if (parent !== ".") await safeDirectory(path.join(root, parent));
    return path.join(root, relative);
  }
  async function readFile(file: string, limit: number): Promise<NodeBuffer> {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink())
      fail("UNSAFE_PATH", `Not a regular file: ${file}`);
    if (stat.size > limit)
      fail("LIMIT", `File exceeds ${limit} bytes: ${file}`);
    const handle = await fs.open(
      file,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );
    try {
      const opened = await handle.stat();
      if (
        !opened.isFile() ||
        opened.dev !== stat.dev ||
        opened.ino !== stat.ino
      )
        fail("STALE", `File changed while opening: ${file}`);
      const bytes = Buffer.alloc(Math.min(stat.size + 1, limit + 1));
      let length = 0;
      while (length < bytes.length) {
        const read = await handle.read(
          bytes,
          length,
          bytes.length - length,
          null,
        );
        if (!read.bytesRead) break;
        length += read.bytesRead;
      }
      const after = await handle.stat();
      const current = await fs.lstat(file);
      if (
        length !== stat.size ||
        after.size !== stat.size ||
        after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs ||
        current.dev !== opened.dev ||
        current.ino !== opened.ino
      )
        fail("STALE", `File changed during reading: ${file}`);
      return bytes.subarray(0, length);
    } finally {
      await handle.close();
    }
  }
  async function optionalText(
    root: string,
    name: "bookmarks.json" | "settings.json",
  ): Promise<string | null> {
    try {
      return utf8(
        await readFile(await safeFile(root, name), PORTABLE_LIMITS.jsonBytes),
      );
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }
  async function readAsset(root: string, name: string): Promise<NodeBuffer> {
    const match = assetPattern.exec(name);
    if (!match) return fail("UNSAFE_PATH", `Invalid asset path: ${name}`);
    const bytes = await readFile(
      await safeFile(root, name),
      PORTABLE_LIMITS.iconBytes,
    );
    if (digest(bytes) !== match[1] || image(bytes) !== match[2])
      fail("CORRUPT", `Asset hash or format does not match its name: ${name}`);
    return bytes;
  }
  function expandedSize(current: number, imageBytes: number): number {
    const next = current + Math.ceil(imageBytes / 3) * 4 + 64;
    if (next > PORTABLE_LIMITS.resourceBytes)
      fail("LIMIT", "Expanded importer document exceeds 100 MiB");
    return next;
  }
  async function prepare(
    value: PortableDocument,
    options: {
      /** Resolves file icons and existing portable references; must not fetch network resources. */
      loadIcon?: (reference: string) => Promise<Uint8Array>;
    } = {},
  ): Promise<PreparedPortable> {
    // Validate JSON without imposing the on-disk limit on expanded in-memory images.
    const doc = document(parse(stringify(value, false)));
    const assets = new Map<string, NodeBuffer>();
    let total = 0;
    const icons = iconEntries(doc);
    for (const icon of icons) {
      const field = iconField(icon);
      if (!field) continue;
      const reference = icon[field];
      if (typeof reference !== "string" || !reference)
        fail("INVALID", `Icon ${field} is missing`);
      let bytes: NodeBuffer;
      if ((reference as string).startsWith("data:"))
        bytes = dataBytes(reference as string);
      else {
        if (field !== "path" && !assetPattern.test(reference as string))
          fail(
            "UNSAFE_PATH",
            "Custom/cache icon requires a dataURL or a portable asset path",
          );
        if (!options.loadIcon)
          fail("INVALID", `No icon loader supplied for ${reference}`);
        bytes = Buffer.from(await options.loadIcon!(reference as string));
      }
      const ext = image(bytes);
      const hash = digest(bytes);
      const name = `assets/icons/${hash}.${ext}`;
      if (assetPattern.test(reference as string) && reference !== name)
        fail(
          "CORRUPT",
          `Loaded asset does not match its reference: ${reference}`,
        );
      if (!assets.has(name)) {
        total += bytes.byteLength;
        if (
          total > PORTABLE_LIMITS.resourceBytes ||
          assets.size >= PORTABLE_LIMITS.resources
        )
          fail("LIMIT", "Resources exceed 100 MiB or 10000 unique images");
        assets.set(name, bytes);
      }
      icon[field] = name;
      if (icon.type === "file") icon.hash = hash;
    }
    const text = stringify(doc);
    // Match read's per-reference expansion budget, including duplicate image references.
    let expandedBytes = Buffer.byteLength(text);
    for (const icon of icons) {
      const field = iconField(icon);
      if (!field) continue;
      expandedBytes = expandedSize(
        expandedBytes,
        assets.get(String(icon[field]))!.byteLength,
      );
    }
    const prepared = Object.freeze({
      bookmarksDigest: digest(text),
      resourceCount: assets.size,
      resourceBytes: total,
    });
    plans.set(prepared, { text, assets });
    return prepared;
  }
  async function read(
    directory: string,
    options: { includeSettings?: boolean } = {},
  ): Promise<PortableRead> {
    const root = await safeDirectory(directory);
    const text = await optionalText(root, "bookmarks.json");
    if (text === null) return fail("CORRUPT", "bookmarks.json is missing");
    const doc = document(parse(text));
    const assets = new Map<string, NodeBuffer>();
    let total = 0;
    let expandedBytes = Buffer.byteLength(text);
    for (const icon of iconEntries(doc)) {
      const field = iconField(icon);
      if (!field) continue;
      const reference = icon[field];
      if (typeof reference !== "string" || !assetPattern.test(reference))
        fail(
          "UNSAFE_PATH",
          "Disk icons must use assets/icons/<sha256>.<extension>",
        );
      const name = reference as string;
      let bytes = assets.get(name);
      if (!bytes) {
        bytes = await readAsset(root, name);
        total += bytes.byteLength;
        if (
          total > PORTABLE_LIMITS.resourceBytes ||
          assets.size >= PORTABLE_LIMITS.resources
        )
          fail("LIMIT", "Resources exceed 100 MiB or 10000 unique images");
        assets.set(name, bytes);
      }
      expandedBytes = expandedSize(expandedBytes, bytes.byteLength);
      const data = `data:${mimes[image(bytes)]};base64,${bytes.toString("base64")}`;
      if (icon.type === "file") {
        if (icon.hash !== undefined && icon.hash !== digest(bytes))
          fail("CORRUPT", "File icon hash does not match resource");
        icon.type = "custom";
        delete icon.path;
        delete icon.hash;
        icon.data = data;
      } else icon[field] = data;
    }
    const result: PortableRead = {
      root,
      bookmarksText: text,
      bookmarksDigest: digest(text),
      document: doc,
    };
    if (options.includeSettings) {
      const settings = await optionalText(root, "settings.json");
      result.settings =
        settings === null
          ? null
          : {
              text: settings,
              digest: digest(settings),
              document: parse(settings),
            };
    }
    // Detect a cooperating writer publishing between the individual reads.
    if ((await optionalText(root, "bookmarks.json")) !== text)
      fail("STALE", "bookmarks.json changed while reading; reread");
    if (
      options.includeSettings &&
      (await optionalText(root, "settings.json")) !==
        (result.settings?.text ?? null)
    )
      fail("STALE", "settings.json changed while reading; reread");
    return result;
  }
  /** Raycast entry: never reads, parses, updates or removes settings.json. */
  async function readBookmarks(directory: string): Promise<PortableRead> {
    return read(directory);
  }
  async function assertLock(lock: PortableLock): Promise<void> {
    const owned = locks.get(lock);
    if (!owned)
      fail(
        "INVALID",
        "Lock token is inactive or belongs to another core instance",
      );
    await safeDirectory(lock.root);
    const rootStat = await fs.lstat(lock.root);
    const stat = await fs.lstat(
      await safeFile(lock.root, "bookmarks.json.lock"),
    );
    if (
      stat.isSymbolicLink() ||
      stat.dev !== owned!.dev ||
      stat.ino !== owned!.ino ||
      rootStat.dev !== owned!.rootDev ||
      rootStat.ino !== owned!.rootIno
    )
      fail("STALE", "Lock or root directory was replaced");
  }
  async function withLock<T>(
    directory: string,
    operation: (lock: PortableLock) => Promise<T>,
  ): Promise<T> {
    const root = await safeDirectory(directory);
    const rootStat = await fs.lstat(root);
    const lockFile = await safeFile(root, "bookmarks.json.lock");
    let handle;
    try {
      handle = await fs.open(lockFile, "wx", 0o600);
    } catch (error) {
      if ((error as { code?: string }).code === "EEXIST")
        return fail(
          "BUSY",
          "bookmarks.json.lock exists; another writer is active or recovery is required",
        );
      throw error;
    }
    let identity;
    try {
      identity = await handle.stat();
    } catch (error) {
      await handle.close().catch(() => undefined);
      throw error;
    }
    const lock = Object.freeze({ root });
    const owned = {
      dev: identity.dev,
      ino: identity.ino,
      rootDev: rootStat.dev,
      rootIno: rootStat.ino,
      published: { bookmarks: false, settings: false },
    };
    locks.set(lock, owned);
    let result: T | undefined;
    let operationError: unknown;
    let operationFailed = false;
    try {
      result = await operation(lock);
    } catch (error) {
      operationFailed = true;
      operationError = error;
    }
    locks.delete(lock);
    const cleanupErrors: unknown[] = [];
    try {
      await handle.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      const current = await fs.lstat(lockFile).catch((error) => {
        if (!missing(error)) throw error;
        return undefined;
      });
      if (
        current &&
        !current.isSymbolicLink() &&
        current.dev === identity.dev &&
        current.ino === identity.ino
      )
        await fs.unlink(lockFile);
    } catch (error) {
      cleanupErrors.push(error);
    }
    // Never replace the operation's first error or its partial-publication receipt.
    if (operationFailed) throw operationError;
    if (cleanupErrors.length)
      throw new PortableError(
        "WRITE_FAILED",
        "Operation completed, but releasing bookmarks.json.lock failed. Reread before recovery or retry.",
        { ...owned.published },
        cleanupErrors.length === 1
          ? cleanupErrors[0]
          : new AggregateError(cleanupErrors, "Lock cleanup failed"),
      );
    return result as T;
  }

  async function expect(
    root: string,
    name: "bookmarks.json" | "settings.json",
    expected: string | null,
  ): Promise<void> {
    if (expected !== null && !/^[a-f0-9]{64}$/.test(expected))
      fail("INVALID", `Expected digest is invalid: ${name}`);
    const text = await optionalText(root, name);
    if ((text === null ? null : digest(text)) !== expected)
      fail(
        "STALE",
        `${name} changed since the caller's baseline; reread before writing`,
      );
  }
  async function syncDirectory(directory: string): Promise<void> {
    const handle = await fs.open(directory, fs.constants.O_RDONLY);
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  async function publish(
    root: string,
    name: string,
    bytes: string | NodeBuffer,
    asset: boolean,
  ): Promise<void> {
    const file = await safeFile(root, name);
    const parent = path.dirname(file);
    const temp = path.join(parent, `.portable-${crypto.randomUUID()}.tmp`);
    let created = false;
    try {
      const handle = await fs.open(temp, "wx", 0o600);
      created = true;
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await safeFile(root, name);
      if (asset) {
        // link publishes without replacing a same-name file created by another process.
        try {
          await fs.link(temp, file);
        } catch (error) {
          if ((error as { code?: string }).code !== "EEXIST") throw error;
          if (!(await readAsset(root, name)).equals(bytes as NodeBuffer))
            fail("CORRUPT", `Existing asset differs: ${name}`);
        }
      } else {
        try {
          const stat = await fs.lstat(file);
          if (!stat.isFile() || stat.isSymbolicLink())
            fail("UNSAFE_PATH", `Unsafe JSON destination: ${name}`);
        } catch (error) {
          if (!missing(error)) throw error;
        }
        await fs.rename(temp, file);
        created = false;
      }
      await syncDirectory(parent);
    } finally {
      if (created) await fs.unlink(temp);
    }
  }
  /** Must run only inside withLock's callback; this helper never acquires a second lock. */
  async function writeLocked(
    lock: PortableLock,
    prepared: PreparedPortable,
    options: PortableWriteOptions,
  ): Promise<PortableReceipt> {
    await assertLock(lock);
    const plan = plans.get(prepared);
    if (!plan)
      return fail(
        "INVALID",
        "Prepared snapshot belongs to another core instance",
      );
    const hasSettings = Object.prototype.hasOwnProperty.call(
      options,
      "settings",
    );
    if (hasSettings && options.expected.settings === undefined)
      fail(
        "INVALID",
        "Explicit settings writes require an expected settings digest (or null)",
      );
    const settingsText = hasSettings ? stringify(options.settings) : undefined;
    await expect(lock.root, "bookmarks.json", options.expected.bookmarks);
    if (options.expected.settings !== undefined)
      await expect(lock.root, "settings.json", options.expected.settings);
    const published = { bookmarks: false, settings: false };
    try {
      if (plan.assets.size) {
        for (const name of ["assets", "assets/icons"]) {
          try {
            await fs.mkdir(path.join(lock.root, name), { mode: 0o700 });
          } catch (error) {
            if ((error as { code?: string }).code !== "EEXIST") throw error;
          }
          await safeDirectory(path.join(lock.root, name));
        }
        for (const [name, bytes] of plan.assets) {
          await assertLock(lock);
          try {
            if (!(await readAsset(lock.root, name)).equals(bytes))
              fail("CORRUPT", `Existing asset differs: ${name}`);
          } catch (error) {
            if (!missing(error)) throw error;
            await publish(lock.root, name, bytes, true);
          }
        }
      }
      await assertLock(lock);
      await expect(lock.root, "bookmarks.json", options.expected.bookmarks);
      if (options.expected.settings !== undefined)
        await expect(lock.root, "settings.json", options.expected.settings);
      if (settingsText !== undefined) {
        // Set before publication: fsync failure can happen after rename. A failure receipt is conservative.
        published.settings = true;
        locks.get(lock)!.published.settings = true;
        await publish(lock.root, "settings.json", settingsText, false);
      }
      await assertLock(lock);
      await expect(lock.root, "bookmarks.json", options.expected.bookmarks);
      published.bookmarks = true;
      locks.get(lock)!.published.bookmarks = true;
      await publish(lock.root, "bookmarks.json", plan.text, false);
      return {
        bookmarksDigest: digest(plan.text),
        ...(settingsText === undefined
          ? {}
          : { settingsDigest: digest(settingsText) }),
      };
    } catch (error) {
      throw new PortableError(
        "WRITE_FAILED",
        "Portable write failed; resources may remain and JSON may be partially published. Reread both files before recovery or retry.",
        published,
        error,
      );
    }
  }
  async function write(
    directory: string,
    prepared: PreparedPortable,
    options: PortableWriteOptions,
  ): Promise<PortableReceipt> {
    return withLock(directory, (lock) => writeLocked(lock, prepared, options));
  }
  async function createFolder(
    directory: string,
    prepared: PreparedPortable,
    options: { settings?: Json } = {},
  ): Promise<PortableReceipt> {
    if (!path.isAbsolute(directory))
      return fail(
        "UNSAFE_PATH",
        "Creation requires an explicit absolute directory",
      );
    const target = path.resolve(directory);
    if (target === path.parse(target).root)
      fail("UNSAFE_PATH", "Cannot create a library at a filesystem root");
    await safeDirectory(path.dirname(target));
    try {
      await fs.mkdir(target, { mode: 0o700 });
    } catch (error) {
      if ((error as { code?: string }).code !== "EEXIST") throw error;
    }
    await safeDirectory(target);
    return withLock(target, async (lock) => {
      if (
        (await fs.readdir(target)).some(
          (name) => name !== "bookmarks.json.lock",
        )
      )
        fail(
          "UNSAFE_PATH",
          "Creation requires an empty folder; existing bookmarks or mixed contents are never overwritten",
        );
      const hasSettings = Object.prototype.hasOwnProperty.call(
        options,
        "settings",
      );
      return writeLocked(lock, prepared, {
        expected: {
          bookmarks: null,
          ...(hasSettings ? { settings: null } : {}),
        },
        ...(hasSettings ? { settings: options.settings } : {}),
      });
    });
  }
  async function exportFolder(
    destination: string,
    prepared: PreparedPortable,
    connectedSource: string,
    options: { settings?: Json } = {},
  ): Promise<PortableReceipt> {
    const source = await safeDirectory(connectedSource);
    if (!path.isAbsolute(destination))
      fail("UNSAFE_PATH", "Export requires an explicit absolute directory");
    const target = path.resolve(destination);
    const relative = path.relative(source, target);
    if (
      relative === "" ||
      (relative !== ".." &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative))
    )
      fail(
        "UNSAFE_PATH",
        "Export cannot overwrite or nest inside the connected source",
      );
    return createFolder(target, prepared, options);
  }
  /** File icon loader for an explicit trusted application icon directory; rejects every symlink. */
  async function readIconFile(
    file: string,
    iconDirectory: string,
  ): Promise<Uint8Array> {
    const root = await safeDirectory(iconDirectory);
    if (!path.isAbsolute(file))
      fail("UNSAFE_PATH", "Application icon path must be absolute");
    const target = path.resolve(file);
    const relative = path.relative(root, target);
    if (
      !relative ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      fail(
        "UNSAFE_PATH",
        "Application icon is outside the explicit icon directory",
      );
    await safeDirectory(path.dirname(target));
    const bytes = await readFile(target, PORTABLE_LIMITS.iconBytes);
    image(bytes);
    return bytes;
  }
  return {
    prepare,
    read,
    readBookmarks,
    readAsset,
    readIconFile,
    withLock,
    writeLocked,
    write,
    createFolder,
    exportFolder,
    digest,
  };
}
