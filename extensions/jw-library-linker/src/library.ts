import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, parse } from "node:path";
import { promisify } from "node:util";
import type { Bookmark } from "./bookmarks";
import type { Chapter, Publication } from "./publications";

const execute = promisify(execFile);
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 12;
const cache = new Map<string, { fingerprint: string; rows: unknown[]; bytes: number }>();
let cacheBytes = 0;
let cacheGeneration = 0;

export class LibraryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LibraryError";
  }
}

export function isCancellation(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === "AbortError" || (error as NodeJS.ErrnoException).code === "ABORT_ERR")
  );
}

export function clearLibraryCache(): void {
  cache.clear();
  cacheBytes = 0;
  cacheGeneration++;
}

export function cacheStats() {
  return { entries: cache.size, bytes: cacheBytes };
}

function filesystemError(error: unknown, context: string): LibraryError {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EACCES" || code === "EPERM") {
    return new LibraryError(
      "permission",
      `${context}: macOS denied access. Check Raycast permissions and the selected container.`,
    );
  }
  if (code === "ENOENT")
    return new LibraryError(
      "missing",
      `${context}: the file or folder is missing. Refresh after downloading it in JW Library.`,
    );
  return new LibraryError("filesystem", `${context}: the local data could not be read. Refresh and try again.`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw filesystemError(error, "JW Library data");
  }
}

async function fingerprint(path: string): Promise<string> {
  try {
    const files = await Promise.all(
      [path, `${path}-wal`, `${path}-journal`].map(async (file, index) => {
        try {
          const info = await stat(file);
          return `${info.dev}:${info.ino}:${info.size}:${info.mtimeMs}:${info.ctimeMs}`;
        } catch (error) {
          if (index > 0 && (error as NodeJS.ErrnoException).code === "ENOENT") return "absent";
          throw error;
        }
      }),
    );
    return files.join("|");
  } catch (error) {
    throw filesystemError(error, "JW Library database");
  }
}

export type QueryOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  busyTimeoutMs?: number;
  maxBufferBytes?: number;
};

export async function queryDatabase<T>(path: string, sql: string, options: QueryOptions = {}): Promise<T[]> {
  // Intentionally retain the process adapter: @raycast/utils 2.3.3 executeSQL
  // has no public AbortSignal, timeout, or output-limit options. Its busy-DB
  // fallback also persists a copy of the database. Publication and bookmark
  // reads must remain cancellable, bounded, and leave no personal DB copies.
  options.signal?.throwIfAborted();
  const version = await fingerprint(path);
  options.signal?.throwIfAborted();
  const key = `${path}\0${sql}`;
  const cached = cache.get(key);
  if (cached?.fingerprint === version) {
    cache.delete(key);
    cache.set(key, cached);
    return cached.rows as T[];
  }
  if (cached) {
    cacheBytes -= cached.bytes;
    cache.delete(key);
  }
  const generation = cacheGeneration;
  let raw: string;
  try {
    const result = await execute(
      "/usr/bin/sqlite3",
      ["-readonly", "-json", "-cmd", `.timeout ${options.busyTimeoutMs ?? 750}`, path, sql],
      {
        encoding: "utf8",
        signal: options.signal,
        timeout: options.timeoutMs ?? 4000,
        maxBuffer: options.maxBufferBytes ?? 16 * 1024 * 1024,
      },
    );
    raw = result.stdout;
  } catch (error) {
    if (isCancellation(error)) throw error;
    const failure = error as Error & { stderr?: string; code?: string; killed?: boolean };
    const message = failure.stderr ?? "";
    if (failure.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER")
      throw new LibraryError(
        "too-large",
        "This database returned too much data. Try a smaller publication or refresh after updating JW Library.",
      );
    if (failure.killed)
      throw new LibraryError(
        "timeout",
        "Reading JW Library timed out. Close any backup or restore operation, then retry.",
      );
    if (failure.code === "ENOENT")
      throw new LibraryError("sqlite", "The macOS SQLite tool is unavailable at /usr/bin/sqlite3.");
    if (/locked|busy/i.test(message))
      throw new LibraryError(
        "busy",
        "JW Library's database is busy. Wait for its current operation to finish, then retry.",
      );
    if (/no such (table|column)/i.test(message))
      throw new LibraryError(
        "schema",
        "This JW Library database format is not supported. Include the app version when reporting the problem.",
      );
    if (/malformed|not a database/i.test(message))
      throw new LibraryError(
        "invalid-data",
        "JW Library's database could not be read. Check that the publication opens in JW Library, then refresh.",
      );
    throw new LibraryError(
      "unavailable",
      "The database could not be opened. Open JW Library to finish preparing it, then refresh. If the problem persists, check macOS permissions and the selected container.",
    );
  }
  options.signal?.throwIfAborted();
  let rows: T[];
  try {
    const value: unknown = JSON.parse(raw.trim() || "[]");
    if (!Array.isArray(value)) throw new Error("Expected rows");
    rows = value as T[];
  } catch {
    throw new LibraryError("invalid-data", "SQLite returned an unexpected response. Refresh and try again.");
  }
  const bytes = Buffer.byteLength(raw);
  if (generation === cacheGeneration && bytes <= MAX_CACHE_BYTES) {
    while (cache.size >= MAX_CACHE_ENTRIES || cacheBytes + bytes > MAX_CACHE_BYTES) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cacheBytes -= cache.get(oldest)!.bytes;
      cache.delete(oldest);
    }
    // Another request may have completed while this query was in flight.
    const previous = cache.get(key);
    if (previous) cacheBytes -= previous.bytes;
    cache.set(key, { fingerprint: version, rows, bytes });
    cacheBytes += bytes;
  }
  return rows;
}

async function mapLimited<T, R>(values: T[], task: (value: T) => Promise<R>): Promise<R[]> {
  const output: R[] = new Array(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(8, values.length) }, async () => {
      while (next < values.length) {
        const index = next++;
        output[index] = await task(values[index]);
      }
    }),
  );
  return output;
}

export async function discoverContainer(
  containerUuid?: string,
  root = join(homedir(), "Library", "Containers"),
  signal?: AbortSignal,
): Promise<string | null> {
  signal?.throwIfAborted();
  if (containerUuid?.trim()) {
    const name = containerUuid.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(name))
      throw new LibraryError(
        "configuration",
        "Enter only the container UUID or bundle identifier, without slashes or a full path.",
      );
    const path = join(root, name);
    if (!(await exists(path)))
      throw new LibraryError(
        "configuration",
        "The configured JW Library container does not exist. Check the UUID in preferences.",
      );
    return path;
  }
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw filesystemError(error, "App containers");
  }
  let unidentified = 0;
  const candidates = await mapLimited(
    entries.filter((entry) => entry.isDirectory()),
    async (entry) => {
      signal?.throwIfAborted();
      const path = join(root, entry.name);
      // A bundle identifier is authoritative; UUID containers need their OS metadata.
      if (entry.name === "org.jw.jwlibrary" || entry.name === "org.jw.jwlibrary.mobile") return path;
      try {
        if (
          !(await exists(join(path, "Data", "Library", "Publications"))) &&
          !(await exists(join(path, "Data", "Documents", "UserData")))
        )
          return null;
      } catch (error) {
        // Unrelated app containers can be protected by macOS. Do not fail discovery for them.
        if (error instanceof LibraryError && error.code === "permission") return null;
        throw error;
      }
      try {
        // macOS can protect container metadata even while the application's data is readable.
        // The bundle-specific preferences filename identifies the same app without reading settings.
        for (const identifier of ["org.jw.jwlibrary", "org.jw.jwlibrary.mobile"]) {
          if (await exists(join(path, "Data", "Library", "Preferences", `${identifier}.plist`))) return path;
        }
        const metadata = join(path, ".com.apple.containermanagerd.metadata.plist");
        if (!(await exists(metadata))) return null;
        const { stdout } = await execute(
          "/usr/bin/plutil",
          ["-extract", "MCMMetadataIdentifier", "raw", "-o", "-", metadata],
          { encoding: "utf8", timeout: 1500, signal },
        );
        return /^org\.jw\.jwlibrary(?:\.mobile)?$/.test(stdout.trim()) ? path : null;
      } catch (error) {
        if (isCancellation(error)) throw error;
        unidentified++;
        return null;
      }
    },
  );
  const matches = [...new Set(candidates.filter((path): path is string => path !== null))].sort();
  if (matches.length > 1)
    throw new LibraryError(
      "ambiguous-container",
      "Multiple JW Library containers were found. Choose one with the Container UUID preference.",
    );
  if (!matches.length && unidentified)
    throw new LibraryError(
      "discovery",
      "A candidate app container could not be identified. Set JW Library Container UUID in preferences.",
    );
  return matches[0] ?? null;
}

function plainTitle(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export async function readPublications(
  path: string,
  signal?: AbortSignal,
): Promise<{ publications: Publication[]; skipped: number }> {
  let folders;
  try {
    folders = await readdir(path, { withFileTypes: true });
  } catch (error) {
    throw filesystemError(error, "Publications");
  }
  let skipped = 0;
  const publications = await mapLimited(
    folders.filter((folder) => folder.isDirectory()),
    async (folder) => {
      signal?.throwIfAborted();
      try {
        const manifest = join(path, folder.name, "manifest.json");
        const info = await stat(manifest);
        if (info.size > 1024 * 1024) throw new Error("Oversized manifest");
        const value: unknown = JSON.parse(await readFile(manifest, "utf8"));
        const pub = (value as { publication?: Record<string, unknown> })?.publication;
        if (!pub || typeof pub !== "object" || Array.isArray(pub)) throw new Error("Invalid publication");
        const issue = pub.issueProperties as Record<string, unknown> | undefined;
        let name = plainTitle(pub.title || folder.name);
        if (
          (pub.publicationType === "Watchtower" || pub.publicationType === "Awake!") &&
          (issue?.title || issue?.titleRich)
        ) {
          const title = plainTitle(issue.title || issue.titleRich);
          const cover = plainTitle(issue.coverTitle || issue.coverTitleRich);
          name = cover ? `${title}: ${cover}` : title;
        }
        const files = await readdir(join(path, folder.name));
        const icon = files.find((name) => name.includes("sqr") && /\.(png|jpe?g)$/i.test(name));
        return {
          folderName: folder.name,
          name,
          symbol: String(pub.symbol ?? "").toLowerCase(),
          fileName: typeof pub.fileName === "string" ? basename(pub.fileName) : "",
          language: typeof pub.language === "number" ? pub.language : undefined,
          issueId: typeof pub.issueId === "number" ? pub.issueId : undefined,
          undatedSymbol: String(pub.undatedSymbol || issue?.undatedSymbol || ""),
          icon: icon ? join(path, folder.name, icon) : undefined,
        } satisfies Publication;
      } catch (error) {
        if (isCancellation(error)) throw error;
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EPERM" || code === "EACCES") throw filesystemError(error, "Publication metadata");
        skipped++;
        return null;
      }
    },
  );
  return {
    publications: publications
      .filter((pub): pub is NonNullable<typeof pub> => pub !== null)
      .sort((a, b) => a.name.localeCompare(b.name)),
    skipped,
  };
}

export type Library = {
  containerPath: string | null;
  publicationsPath: string | null;
  bookmarksDbPath: string | null;
  publications: Publication[];
  languages: Record<number, string>;
  warnings: string[];
};

export async function loadLibrary(containerUuid?: string, signal?: AbortSignal, root?: string): Promise<Library> {
  const containerPath = await discoverContainer(containerUuid, root, signal);
  const result: Library = {
    containerPath,
    publicationsPath: null,
    bookmarksDbPath: null,
    publications: [],
    languages: { 0: "E", 2: "X" },
    warnings: [],
  };
  if (!containerPath) return result;
  const publicationsPath = join(containerPath, "Data", "Library", "Publications");
  if (await exists(publicationsPath)) {
    const data = await readPublications(publicationsPath, signal);
    result.publicationsPath = publicationsPath;
    result.publications = data.publications;
    if (data.skipped)
      result.warnings.push(
        `${data.skipped} publication ${data.skipped === 1 ? "folder is incomplete or has an unreadable manifest" : "folders are incomplete or have unreadable manifests"}. Refresh after downloads finish.`,
      );
  }
  for (const name of ["userdata.db", "userData.db"]) {
    const path = join(containerPath, "Data", "Documents", "UserData", name);
    if (await exists(path)) {
      result.bookmarksDbPath = path;
      break;
    }
  }
  for (const pub of result.publications)
    if (pub.language !== undefined) result.languages[pub.language] = pub.folderName.split("_")[1] || "X";
  const apps = [join("/Applications", "JW Library.app"), join(homedir(), "Applications", "JW Library.app")];
  for (const app of apps) {
    for (const bundle of ["Wrapper/JWLibrary.app", "WrappedBundle"]) {
      const db = join(app, bundle, "JWLResources", "mepsunit.db");
      if (!(await exists(db))) continue;
      try {
        const languages = await queryDatabase<{ language: number; locale: string }>(
          db,
          "SELECT LanguageId AS language, Symbol AS locale FROM Language;",
          { signal },
        );
        for (const row of languages) result.languages[row.language] = row.locale;
      } catch (error) {
        if (isCancellation(error)) throw error; /* Publication metadata remains a valid language fallback. */
      }
    }
  }
  return result;
}

export async function queryChapters(
  publicationsPath: string,
  publication: Publication,
  signal?: AbortSignal,
): Promise<Chapter[]> {
  const file = publication.fileName ? `${parse(publication.fileName).name}.db` : `${publication.folderName}.db`;
  const path = join(publicationsPath, publication.folderName, file);
  return queryDatabase<Chapter>(
    path,
    "SELECT DocumentId AS documentId, MepsDocumentId AS mepsDocumentId, ChapterNumber AS chapterNumber, Title AS title, Class AS class FROM Document ORDER BY DocumentId;",
    { signal },
  );
}

export async function queryBookmarks(path: string, signal?: AbortSignal): Promise<Bookmark[]> {
  return queryDatabase<Bookmark>(
    path,
    `SELECT b.BookmarkId AS bookmarkId, b.Slot AS slot,
    b.Title AS title, b.Snippet AS snippet, b.BlockType AS blockType, b.BlockIdentifier AS blockIdentifier,
    l.BookNumber AS bookNumber, l.ChapterNumber AS chapterNumber, l.DocumentId AS documentId,
    l.KeySymbol AS keySymbol, l.MepsLanguage AS mepsLanguage, l.Type AS type
    FROM Bookmark b JOIN Location l ON b.LocationId = l.LocationId
    ORDER BY l.BookNumber, l.ChapterNumber, b.PublicationLocationId, b.Slot;`,
    { signal },
  );
}
