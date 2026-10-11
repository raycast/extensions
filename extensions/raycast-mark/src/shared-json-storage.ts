import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import type { LocalStorage as RaycastStorage } from "@raycast/api";
import type { LibraryState } from "./model.ts";

const PATH_KEY = "sharedJson.path";
const BASE_KEY = "sharedJson.baseline";
const LOCAL_KEY = "sharedJson.localBaseline";
export const MAX_SHARED_JSON_BYTES = 10 * 1024 * 1024;
const MAX_ICON_BYTES = 2 * 1024 * 1024;
const applyingExternal = new AsyncLocalStorage<{ active: boolean }>();
// ponytail: One process-local queue is enough here; cross-process imports need a shared file lock.
let pending: Promise<unknown> = Promise.resolve();
let storage: typeof RaycastStorage | undefined;

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation);
  pending = next.catch(() => undefined);
  return next;
}

export function setSharedJsonStorage(value?: typeof RaycastStorage) {
  storage = value;
}
function requireStorage() {
  if (!storage) throw new Error("Shared JSON storage not ready");
  return storage;
}

const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export const sharedJsonDigest = digest;

function validateIconData(value: string, title: string) {
  const match =
    /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml|x-icon));base64,([A-Za-z0-9+/]*={0,2})$/.exec(
      value,
    );
  if (!match || !match[2] || match[2].length % 4 !== 0)
    throw new Error(`Invalid icon data; shared JSON write rejected: ${title}`);
  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.toString("base64") !== match[2] ||
    bytes.byteLength > MAX_ICON_BYTES
  )
    throw new Error(
      `Icon exceeds 2 MiB or encoding is invalid; shared JSON write rejected: ${title}`,
    );
  return `data:${match[1]};base64,${match[2]}`;
}

export async function sharedJsonPath() {
  return storage ? ((await storage.getItem<string>(PATH_KEY)) ?? "") : "";
}

export async function readSharedJson(file: string) {
  const stat = await fs.lstat(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > MAX_SHARED_JSON_BYTES
  )
    throw new Error(
      "Shared JSON is missing, not a regular file, or over 10 MiB; writes blocked",
    );
  const handle = await fs.open(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino)
      throw new Error("Shared JSON changed while being read; writes blocked");
    const bytes = await handle.readFile();
    if (bytes.byteLength > MAX_SHARED_JSON_BYTES)
      throw new Error("Shared JSON exceeds 10 MiB; writes blocked");
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } finally {
    await handle.close();
  }
}

export async function setSharedJsonSource(
  file: string,
  raw: string,
  local: string,
) {
  await requireStorage().setItem(PATH_KEY, file);
  await requireStorage().setItem(BASE_KEY, digest(raw));
  await requireStorage().setItem(LOCAL_KEY, digest(local));
}

export async function sharedJsonBaseline() {
  return {
    remote: (await requireStorage().getItem<string>(BASE_KEY)) ?? "",
    local: (await requireStorage().getItem<string>(LOCAL_KEY)) ?? "",
  };
}

export async function updateSharedJsonBaseline(raw: string, local: string) {
  await requireStorage().setItem(BASE_KEY, digest(raw));
  await requireStorage().setItem(LOCAL_KEY, digest(local));
}

export function withExternalSharedJson<T>(callback: () => Promise<T>) {
  return serialize(async () => {
    const context = { active: true };
    try {
      return await applyingExternal.run(context, callback);
    } finally {
      context.active = false;
    }
  });
}

export function sharedJsonText(
  state: LibraryState,
  iconBytes: Map<string, string> = new Map(),
) {
  const catalog = state.catalog;
  const bookmarks = state.bookmarks.map((bookmark) => {
    const icon = bookmark.icon;
    if (!icon) return bookmark;
    if (icon.type === "custom") {
      if (!icon.data)
        throw new Error(
          `Icon data missing; shared JSON write rejected: ${bookmark.title}`,
        );
      return {
        ...bookmark,
        icon: { ...icon, data: validateIconData(icon.data, bookmark.title) },
      };
    }
    if (icon.type === "remote" && icon.cache?.startsWith("data:image/"))
      return {
        ...bookmark,
        icon: { ...icon, cache: validateIconData(icon.cache, bookmark.title) },
      };
    if (icon.type !== "file") return bookmark;
    if (!icon.path)
      throw new Error(
        `Icon path missing; shared JSON write rejected: ${bookmark.title}`,
      );
    const data = iconBytes.get(icon.path);
    if (!data)
      throw new Error(
        `Icon file missing; shared JSON write rejected: ${bookmark.title}`,
      );
    const ext = path.extname(icon.path).slice(1).toLowerCase();
    const mime: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      ico: "image/x-icon",
    };
    if (!mime[ext])
      throw new Error(
        `Unsupported icon format; shared JSON write rejected: ${bookmark.title}`,
      );
    return {
      ...bookmark,
      icon: {
        type: "custom" as const,
        data: `data:${mime[ext]};base64,${data}`,
        bgColor: icon.bgColor,
      },
    };
  });
  const groups = catalog.groups.map((group) => ({
    ...group,
    children: group.children.map((sub) => ({
      ...sub,
      bookmarkIds: bookmarks
        .filter((bookmark) =>
          bookmark.locations.some(
            (location) =>
              location.groupId === group.id && location.subGroupId === sub.id,
          ),
        )
        .map((bookmark) => bookmark.id),
    })),
  }));
  return JSON.stringify(
    { schemaVersion: 1, source: "raycast-mark", groups, bookmarks },
    null,
    2,
  );
}

export async function exportSharedJson(directory: string, state: LibraryState) {
  const iconBytes = new Map<string, string>();
  const iconsRoot = await fs.realpath(path.join(directory, "icons"));
  for (const bookmark of state.bookmarks) {
    const icon = bookmark.icon;
    if (icon?.type !== "file") continue;
    const file = icon.path;
    if (!file || !path.isAbsolute(file))
      throw new Error(`Invalid icon path; write rejected: ${bookmark.title}`);
    const before = await fs.lstat(file);
    if (!before.isFile() || before.isSymbolicLink())
      throw new Error(
        `Icon file unavailable; write rejected: ${bookmark.title}`,
      );
    const real = await fs.realpath(file);
    const relative = path.relative(iconsRoot, real);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error(
        `Icon is outside the local library's icons directory; write rejected: ${bookmark.title}`,
      );
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_ICON_BYTES)
      throw new Error(
        `Icon file unavailable; write rejected: ${bookmark.title}`,
      );
    iconBytes.set(file, (await fs.readFile(file)).toString("base64"));
  }
  const text = sharedJsonText(state, iconBytes);
  if (Buffer.byteLength(text) > MAX_SHARED_JSON_BYTES)
    throw new Error("Shared JSON exceeds 10 MiB; writes blocked");
  return text;
}

async function publishLocked(
  file: string,
  directory: string,
  state: LibraryState,
  expected: string,
) {
  if (digest(await readSharedJson(file)) !== expected)
    throw new Error(
      "Shared JSON changed again before writing; overwrite rejected",
    );
  const text = await exportSharedJson(directory, state);
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  );
  try {
    const handle = await fs.open(temp, "wx", 0o600);
    try {
      await handle.writeFile(text, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    if (digest(await readSharedJson(file)) !== expected)
      throw new Error(
        "Shared JSON changed again before writing; overwrite rejected",
      );
    await fs.rename(temp, file);
    await updateSharedJsonBaseline(text, text);
  } finally {
    await fs.unlink(temp).catch(() => undefined);
  }
}

export async function withSharedJsonWrite<
  T extends { state: LibraryState; warning?: string },
>(directory: string, operation: () => Promise<T>): Promise<T> {
  if (applyingExternal.getStore()?.active) return operation();
  return serialize(() => writeSharedJson(directory, operation));
}

async function writeSharedJson<
  T extends { state: LibraryState; warning?: string },
>(directory: string, operation: () => Promise<T>): Promise<T> {
  const file = await sharedJsonPath();
  if (!file) return operation();
  const baseline = await sharedJsonBaseline();
  if (!baseline.remote)
    throw new Error("Shared JSON is not initialized; reconnect before writing");
  const lock = `${file}.lock`;
  let lockHandle;
  let ownsLock: { dev: number; ino: number } | undefined;
  try {
    lockHandle = await fs.open(lock, "wx", 0o600);
    ownsLock = await lockHandle.stat();
    if (digest(await readSharedJson(file)) !== baseline.remote)
      throw new Error(
        "Shared JSON was modified externally; current write blocked",
      );
    const result = await operation();
    try {
      await publishLocked(file, directory, result.state, baseline.remote);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        ...result,
        warning: `${result.warning ? `${result.warning}; ` : ""}Local transaction succeeded, but shared JSON was not updated: ${message}`,
      } as T;
    }
  } finally {
    await lockHandle?.close().catch(() => undefined);
    if (ownsLock) {
      const current = await fs.lstat(lock).catch(() => undefined);
      if (current?.dev === ownsLock.dev && current.ino === ownsLock.ino)
        await fs.unlink(lock).catch(() => undefined);
    }
  }
}
