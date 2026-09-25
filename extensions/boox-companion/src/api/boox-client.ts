import { mkdirSync, openAsBlob } from "node:fs";
import { open, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  BooxDevice,
  BooxNote,
  DeviceResponse,
  LibraryBook,
  LibraryPage,
  LibraryShelf,
  MediaCategory,
  NotesPage,
  StorageEntry,
  StoragePage,
} from "../models/boox";
import { BooxError } from "../lib/errors";
import { clampPercent, parseDate } from "../lib/format";
import { normalizeRemotePath } from "../lib/paths";

interface WrappedResponse<T> {
  code?: number;
  successful?: boolean;
  data?: T;
}

interface StorageResponseData {
  count?: number;
  fileCount?: number;
  folderCount?: number;
  list?: StorageEntry[];
}

interface RawLibraryBook {
  title?: string;
  name?: string;
  coverPath?: string;
  upperCaseFormat?: string;
  progressPercent?: string | number;
  metadata?: Record<string, unknown>;
}

interface RawLibraryShelf {
  idString?: string;
  title?: string;
  name?: string;
  childCount?: number;
  coverPath?: string;
  library?: Record<string, unknown>;
}

interface RawLibraryResponse {
  bookCount?: number;
  libraryCount?: number;
  visibleBookList?: RawLibraryBook[];
  visibleLibraryList?: RawLibraryShelf[];
}

interface RawNoteItem {
  idString?: string;
  title?: string;
  name?: string;
  coverPath?: string;
  encrypted?: boolean;
  dir?: boolean;
  libraryModel?: boolean;
  library?: Record<string, unknown>;
  noteModel?: Record<string, unknown>;
}

interface NotesResponseData {
  count?: number;
  fileCount?: number;
  folderCount?: number;
  list?: RawNoteItem[];
}

const LONG_OPERATION_TIMEOUT_MS = 30 * 60_000;

export interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class BooxClient {
  readonly host: string;
  readonly screenHost: string;

  constructor(
    host: string,
    private readonly password?: string
  ) {
    const defaultProtocol = password ? "https" : "http";
    this.host = normalizeHost(host, 8085, defaultProtocol);
    this.screenHost = normalizeHost(host, 8086, defaultProtocol);
    if (password && new URL(this.host).protocol !== "https:") {
      throw new BooxError("BOOXDrop passwords require an HTTPS device address");
    }
  }

  private headers(extra?: RequestInit["headers"]): Headers {
    const headers = new Headers(extra);
    if (this.password) headers.set("Authorization", `Basic ${Buffer.from(`:${this.password}`).toString("base64")}`);
    return headers;
  }

  private async response(endpoint: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<Response> {
    const timeoutSignal = options.signal || AbortSignal.timeout(options.timeoutMs ?? 8_000);
    let response: Response;
    try {
      response = await fetch(new URL(endpoint, this.host), {
        ...init,
        headers: this.headers(init.headers),
        signal: timeoutSignal,
      });
    } catch (error) {
      throw new BooxError("BOOXDrop is unavailable on the local network", undefined, error);
    }

    if (!response.ok) {
      const message =
        response.status === 401
          ? "The BOOXDrop password is incorrect"
          : response.status === 409
            ? "A file with the same name already exists"
            : `BOOX returned HTTP ${response.status}`;
      throw new BooxError(message, response.status);
    }
    return response;
  }

  private async json<T>(endpoint: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
    const response = await this.response(endpoint, init, options);
    const value = (await response.json()) as T | WrappedResponse<T>;
    return unwrap(value);
  }

  private async post<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.json<T>(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      options
    );
  }

  async ping(timeoutMs = 600): Promise<boolean> {
    try {
      await this.requirePing(timeoutMs);
      return true;
    } catch {
      return false;
    }
  }

  async requirePing(timeoutMs = 600): Promise<void> {
    const response = await this.response("/api/ping", {}, { timeoutMs });
    if ((await response.text()).trim().toLowerCase() !== "ok") throw new BooxError("BOOXDrop did not answer ping");
  }

  async getDevice(): Promise<BooxDevice> {
    const data = await this.json<DeviceResponse>("/api/device", {}, { timeoutMs: 2_000 });
    return {
      id: data.id || this.host,
      host: this.host,
      screenHost: this.screenHost,
      model: data.model || "BOOX",
      nickname: data.nickname,
      storageTotal: parseStorageSize(data.storageTotal),
      storageUsed: parseStorageSize(data.storageUsed),
      lastSeenAt: Date.now(),
      screenAvailable: await this.isScreenAvailable(),
    };
  }

  async isScreenAvailable(timeoutMs = 700): Promise<boolean> {
    try {
      const response = await fetch(this.screenHost, {
        headers: this.headers(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listStorage(directory: string, offset = 0, limit = 200, refresh = false): Promise<StoragePage> {
    const args = {
      dir: normalizeRemotePath(directory),
      limit,
      offset,
      sortBy: "Name",
      sortOrder: "Asc",
      refresh,
    };
    const data = await this.json<StorageResponseData>(`/api/storage?args=${encodeURIComponent(JSON.stringify(args))}`);
    return {
      count: data.count ?? data.list?.length ?? 0,
      fileCount: data.fileCount ?? data.list?.filter((entry) => !entry.dir).length ?? 0,
      folderCount: data.folderCount ?? data.list?.filter((entry) => entry.dir).length ?? 0,
      list: (data.list ?? []).map(normalizeStorageEntry),
    };
  }

  async getLibrary(
    options: { parentId?: string; offset?: number; limit?: number; query?: string } = {}
  ): Promise<LibraryPage> {
    const args = {
      limit: options.limit ?? 200,
      offset: options.offset ?? 0,
      libraryUniqueId: options.parentId ?? null,
      sortBy: "LastOpenTime",
      order: "Desc",
      ...(options.query ? { query: options.query } : {}),
    };
    const data = await this.json<RawLibraryResponse>(`/api/library?args=${encodeURIComponent(JSON.stringify(args))}`);
    return {
      bookCount: data.bookCount ?? 0,
      shelfCount: data.libraryCount ?? 0,
      books: (data.visibleBookList ?? []).map(normalizeLibraryBook),
      shelves: (data.visibleLibraryList ?? []).map(normalizeLibraryShelf),
    };
  }

  async getNotes(
    options: { folderId?: string; offset?: number; limit?: number; query?: string } = {}
  ): Promise<NotesPage> {
    const args = {
      limit: options.limit ?? 200,
      offset: options.offset ?? 0,
      libraryUniqueId: options.folderId ?? null,
      sortBy: "UpdateTime",
      order: "Desc",
      ...(options.query ? { query: options.query } : {}),
    };
    const data = await this.json<NotesResponseData>(`/api/note?args=${encodeURIComponent(JSON.stringify(args))}`);
    return {
      count: data.count ?? data.list?.length ?? 0,
      fileCount: data.fileCount ?? 0,
      folderCount: data.folderCount ?? 0,
      notes: (data.list ?? []).map(normalizeNote),
    };
  }

  async getMediaCategories(): Promise<MediaCategory[]> {
    const data = await this.json<Array<Record<string, unknown>>>("/api/media");
    return data.map((item) => ({
      name: String(item.name ?? item.type ?? "Media"),
      type: String(item.type ?? ""),
      path: typeof item.path === "string" ? item.path : undefined,
      count: toNumber(item.count) ?? 0,
    }));
  }

  async getMediaList(type: string, offset = 0, limit = 500): Promise<StoragePage> {
    const args = { limit, offset, mediaType: type, sortBy: "Time", sortOrder: "Desc" };
    const data = await this.json<StorageResponseData>(
      `/api/media/list?args=${encodeURIComponent(JSON.stringify(args))}`
    );
    return {
      count: data.count ?? data.list?.length ?? 0,
      fileCount: data.fileCount ?? data.list?.length ?? 0,
      folderCount: data.folderCount ?? 0,
      list: (data.list ?? []).map(normalizeStorageEntry),
    };
  }

  async checkDuplicates(fileNames: string[], parent: string): Promise<string[]> {
    const payload = {
      selectedMap: {
        [parent]: {
          count: 0,
          selectedAllMode: false,
          selectedList: fileNames,
        },
      },
    };
    const data = await this.post<{ list?: string[] }>("/api/storage/check/duplicate", payload);
    return data.list ?? [];
  }

  async uploadStorage(localPath: string, directory: string): Promise<void> {
    await this.upload("/api/storage/upload", localPath, { dir: normalizeRemotePath(directory) });
  }

  async uploadLibrary(localPath: string, parentId?: string): Promise<void> {
    await this.upload("/api/library/upload", localPath, parentId ? { parent: parentId } : {});
  }

  private async upload(endpoint: string, localPath: string, fields: Record<string, string>): Promise<void> {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    form.append("sender", "web");
    const blob = await openAsBlob(localPath);
    form.append("file", blob, path.basename(localPath));
    await this.response(endpoint, { method: "POST", body: form }, { timeoutMs: LONG_OPERATION_TIMEOUT_MS });
  }

  async downloadFile(remotePath: string, destination: string): Promise<string> {
    const endpoint = `/api/storage/file?args=${encodeURIComponent(normalizeRemotePath(remotePath))}&sender=web`;
    return this.download(endpoint, destination, "BOOX returned an empty download");
  }

  async packageStorage(entries: StorageEntry[]): Promise<string> {
    const selectedList = entries.map((entry) => entry.path);
    return this.post<string>(
      "/api/storage/batPackaging",
      {
        selectedMap: {
          null: {
            count: 0,
            selectedAllMode: false,
            selectedList,
          },
        },
      },
      { timeoutMs: LONG_OPERATION_TIMEOUT_MS }
    );
  }

  async downloadNote(note: BooxNote, destination: string): Promise<string> {
    const endpoint = `/api/note/download?id=${encodeURIComponent(note.id)}&sender=web`;
    return this.download(endpoint, destination, "BOOX returned an empty note export");
  }

  async createNoteBackup(): Promise<string> {
    const result = await this.post<string | { message?: string }>(
      "/api/note/backup",
      { selectedMap: {} },
      { timeoutMs: LONG_OPERATION_TIMEOUT_MS }
    );
    const remotePath = typeof result === "string" ? result : result.message;
    if (!remotePath) throw new BooxError("BOOX did not return a note backup path");
    return remotePath;
  }

  async downloadNoteBackup(remotePath: string, destination: string): Promise<string> {
    const endpoint = `/api/note/backup/download?args=${encodeURIComponent(remotePath)}&sender=web`;
    return this.download(endpoint, destination, "BOOX returned an empty note backup");
  }

  async createDirectory(parent: string, name: string): Promise<void> {
    await this.post("/api/storage/directory", { parent: normalizeRemotePath(parent), name });
  }

  async renameStorage(entry: StorageEntry, name: string): Promise<void> {
    await this.post("/api/storage/rename", { file: entry.path, name });
  }

  async deleteStorage(entry: StorageEntry): Promise<void> {
    if (entry.dir) {
      const parent = path.posix.dirname(entry.path);
      await this.post(
        "/api/storage/directory/delete",
        {
          selectedMap: {
            [parent]: {
              count: 0,
              selectedAllMode: false,
              selectedList: [entry.path],
            },
          },
        },
        { timeoutMs: LONG_OPERATION_TIMEOUT_MS }
      );
      return;
    }
    await this.response(`/api/storage/delete?args=${encodeURIComponent(entry.path)}`, { method: "DELETE" });
  }

  async relocateStorage(entry: StorageEntry, destination: string, operation: "copy" | "move"): Promise<void> {
    const endpoint = entry.dir ? `/api/storage/directory/${operation}` : `/api/storage/file/${operation}`;
    const payload = {
      force: false,
      parent: normalizeRemotePath(destination),
      map: {
        selectedMap: {
          null: {
            count: 0,
            selectedAllMode: false,
            selectedList: [entry.path],
          },
        },
      },
    };
    await this.post(endpoint, payload, { timeoutMs: LONG_OPERATION_TIMEOUT_MS });
  }

  async deleteNote(note: BooxNote): Promise<void> {
    await this.response(`/api/note/delete?id=${encodeURIComponent(note.id)}`, { method: "DELETE" });
  }

  thumbnailUrl(remotePath?: string): string | undefined {
    if (!remotePath || this.password) return undefined;
    return `${this.host}/api/storage/thumbnail?args=${encodeURIComponent(remotePath)}`;
  }

  authorizationHeader(): string | undefined {
    return this.password ? `Basic ${Buffer.from(`:${this.password}`).toString("base64")}` : undefined;
  }

  private async download(endpoint: string, destination: string, emptyMessage: string): Promise<string> {
    const response = await this.response(endpoint, {}, { timeoutMs: LONG_OPERATION_TIMEOUT_MS });
    if (!response.body) throw new BooxError(emptyMessage);
    mkdirSync(path.dirname(destination), { recursive: true });
    const { target, handle } = await reserveLocalPath(destination);
    try {
      await pipeline(Readable.fromWeb(response.body), handle.createWriteStream());
      return target;
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(target, { force: true });
      throw error;
    }
  }
}

export function normalizeHost(input: string, port = 8085, defaultProtocol: "http" | "https" = "http"): string {
  const withScheme = /^https?:\/\//i.test(input.trim()) ? input.trim() : `${defaultProtocol}://${input.trim()}`;
  const url = new URL(withScheme);
  url.port = String(port);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function unwrap<T>(value: T | WrappedResponse<T>): T {
  if (value && typeof value === "object" && "successful" in value) {
    const wrapped = value as WrappedResponse<T>;
    if (wrapped.successful === false)
      throw new BooxError(`BOOX operation failed${wrapped.code ? ` (${wrapped.code})` : ""}`);
    return (wrapped.data === undefined ? value : wrapped.data) as T;
  }
  return value as T;
}

function normalizeStorageEntry(entry: StorageEntry): StorageEntry {
  return {
    dir: Boolean(entry.dir),
    name: String(entry.name || path.posix.basename(entry.path || "")),
    path: normalizeRemotePath(entry.path),
    size: toNumber(entry.size) ?? 0,
    updatedAt: toNumber(entry.updatedAt) ?? 0,
    thumbnail: typeof entry.thumbnail === "string" ? entry.thumbnail : undefined,
  };
}

function normalizeLibraryBook(item: RawLibraryBook): LibraryBook {
  const metadata = item.metadata ?? {};
  const rawAuthors = metadata.authorList;
  const authors = Array.isArray(rawAuthors) ? rawAuthors.map(String) : [];
  return {
    id: String(metadata.idString ?? metadata.uuid ?? metadata._id ?? item.title ?? item.name ?? "book"),
    title: String(metadata.title ?? item.title ?? metadata.name ?? item.name ?? "Untitled"),
    name: String(metadata.name ?? item.name ?? item.title ?? "Untitled"),
    path: String(metadata.nativeAbsolutePath ?? metadata.location ?? ""),
    format: String(
      item.upperCaseFormat ?? metadata.type ?? path.extname(String(metadata.name ?? "")).slice(1)
    ).toUpperCase(),
    coverPath: item.coverPath,
    authors,
    size: toNumber(metadata.size) ?? toNumber(metadata.fileOriginSize) ?? 0,
    progress: typeof metadata.progress === "string" ? metadata.progress : undefined,
    progressPercent: clampPercent(metadata.progressPercent ?? item.progressPercent),
    lastAccess: parseDate(metadata.lastAccess),
    updatedAt: parseDate(metadata.updatedAt ?? metadata.lastModified),
    favorite: Boolean(metadata.favorite),
    rating: toNumber(metadata.rating) ?? 0,
    tags: Array.isArray(metadata.tagList) ? metadata.tagList.map(String) : [],
  };
}

function normalizeLibraryShelf(item: RawLibraryShelf): LibraryShelf {
  const library = item.library ?? {};
  return {
    id: String(library.idString ?? item.idString ?? library.id ?? item.title ?? "shelf"),
    title: String(library.name ?? library.title ?? item.title ?? item.name ?? "Shelf"),
    childCount: toNumber(item.childCount ?? library.childCount) ?? 0,
    coverPath: item.coverPath,
  };
}

function normalizeNote(item: RawNoteItem): BooxNote {
  const note = item.noteModel ?? {};
  const library = item.library ?? {};
  return {
    id: String(note.uniqueId ?? note.id ?? library.idString ?? library.id ?? item.idString ?? item.title ?? "note"),
    title: String(note.title ?? library.name ?? library.title ?? item.title ?? item.name ?? "Untitled Note"),
    pageCount: toNumber(note.pageCount) ?? 0,
    coverPath: item.coverPath,
    createdAt: parseDate(note.createdAt),
    updatedAt: parseDate(note.updatedAt),
    favorite: Boolean(note.favorite),
    encrypted: Boolean(item.encrypted ?? note.encryptionType),
    folder: Boolean(item.dir || item.libraryModel || note.library || note.groupNote),
  };
}

function parseStorageSize(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?i?b)?$/i);
  if (!match) return undefined;
  const units: Record<string, number> = { b: 0, kb: 1, kib: 1, mb: 2, mib: 2, gb: 3, gib: 3, tb: 4, tib: 4 };
  const exponent = units[(match[2] || "b").toLowerCase()];
  return Number(match[1]) * 1024 ** exponent;
}

function toNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

async function reserveLocalPath(destination: string) {
  const extension = path.extname(destination);
  const stem = path.basename(destination, extension);
  const directory = path.dirname(destination);
  for (let index = 1; ; index += 1) {
    const target = index === 1 ? destination : path.join(directory, `${stem} (${index})${extension}`);
    try {
      return { target, handle: await open(target, "wx") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}
