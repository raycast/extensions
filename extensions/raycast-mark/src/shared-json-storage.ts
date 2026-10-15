import { t } from "./i18n.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import type { LocalStorage as RaycastStorage } from "@raycast/api";
import { TRASH_LOCATION } from "./model.ts";
import type { LibraryState, Location } from "./model.ts";
import { normalizeBookmarkUrl } from "./bookmark-utils.ts";
import { groupsWithMembers } from "./import-export/memberships.ts";

import * as crypto from "node:crypto";
import { createPortableLibrary } from "./portable-library.ts";
import { PortableError } from "./portable-library.ts";
import type { PortableDocument, PortableRead } from "./portable-library.ts";
import { canonical } from "./model.ts";

export const portableLibrary = createPortableLibrary({
  fs,
  path,
  crypto,
  Buffer,
});
const PATH_KEY = "sharedJson.path";
const CHOICE_KEY = "sharedJson.explicitChoice";
const BASE_KEY = "sharedJson.baseline";
const LOCAL_KEY = "sharedJson.localBaseline";
const PAUSED_KEY = "sharedJson.paused";
export const MAX_SHARED_JSON_BYTES = 10 * 1024 * 1024;
const applyingExternal = new AsyncLocalStorage<{ active: boolean }>();
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
  if (!storage) throw new Error(t("共享 JSON 存储尚未就绪"));
  return storage;
}
export const sharedJsonDigest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export async function hasSharedSourceChoice() {
  return (
    !!(await requireStorage().getItem<boolean>(CHOICE_KEY)) ||
    !!(await sharedJsonPath())
  );
}
export async function sharedJsonPath() {
  const source = storage ? ((await storage.getItem<string>(PATH_KEY)) ?? "") : "";
  if (source) {
    const stat = await fs.lstat(source).catch(() => undefined);
    if (stat?.isFile()) {
      await disconnectSharedSource();
      return "";
    }
  }
  return source;
}
export async function disconnectSharedSource() {
  await requireStorage().setItem(CHOICE_KEY, true);
  await requireStorage().setItem(PATH_KEY, "");
  await requireStorage().removeItem(BASE_KEY);
  await requireStorage().removeItem(LOCAL_KEY);
  await requireStorage().removeItem(PAUSED_KEY);
}
export async function sharedJsonPaused() {
  return (await requireStorage().getItem<string>(PAUSED_KEY)) ?? "";
}
export async function pauseSharedJson(message: string) {
  await requireStorage().setItem(PAUSED_KEY, message);
}
export async function clearSharedJsonPause() {
  await requireStorage().removeItem(PAUSED_KEY);
}
export async function readSharedSource(
  source: string,
): Promise<{ raw: string; text: string; folder: PortableRead }> {
  const stat = await fs.lstat(source);
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    const folder = await portableLibrary.readBookmarks(source);
    return {
      raw: folder.bookmarksText,
      text: JSON.stringify(folder.document),
      folder,
    };
  }
  throw new Error(t("请选择共享数据文件夹"));
}
export async function readSharedJson(source: string) {
  return (await readSharedSource(source)).raw;
}
export async function setSharedJsonSource(
  source: string,
  raw: string,
  local: string,
) {
  await requireStorage().setItem(CHOICE_KEY, true);
  await requireStorage().setItem(PATH_KEY, source);
  await updateSharedJsonBaseline(raw, local);
  await clearSharedJsonPause();
}
export async function sharedJsonBaseline() {
  return {
    remote: (await requireStorage().getItem<string>(BASE_KEY)) ?? "",
    local: (await requireStorage().getItem<string>(LOCAL_KEY)) ?? "",
  };
}
export async function updateSharedJsonBaseline(raw: string, local: string) {
  await requireStorage().setItem(BASE_KEY, sharedJsonDigest(raw));
  await requireStorage().setItem(LOCAL_KEY, sharedJsonDigest(local));
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
export function validateSharedIconData(value: string, title: string) {
  const match =
    /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon));base64,([A-Za-z0-9+/]*={0,2})$/.exec(
      value,
    );
  if (!match || !match[2] || match[2].length % 4 !== 0)
    throw new Error(t`图标数据格式无效，拒绝写入共享 JSON：${title}`);
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.toString("base64") !== match[2] || bytes.length > 2 * 1024 * 1024)
    throw new Error(t`图标超过 2 MiB 或编码无效，拒绝写入共享 JSON：${title}`);
  return value;
}
export function sharedJsonText(
  state: LibraryState,
  iconBytes: Map<string, string> = new Map(),
  sourceText?: string,
  preserveFiles = false,
) {
  const catalog = state.catalog;
  const source = sourceText ? JSON.parse(sourceText) : undefined;
  type PreviousBookmark = {
    id: string;
    url: string;
    locations: Location[];
    isDeleted?: boolean;
  };
  const previous = new Map<string, PreviousBookmark>(
    (source?.bookmarks ?? []).map((bookmark: PreviousBookmark) => [
      bookmark.id,
      bookmark,
    ]),
  );
  const current = new Map(
    state.bookmarks.map((bookmark) => [bookmark.id, bookmark]),
  );
  const ordered = [
    ...[...previous.keys()].filter((id) => current.has(id)),
    ...[...current.keys()].filter((id) => !previous.has(id)),
  ];
  const bookmarks = ordered.map((id) => {
    let bookmark = current.get(id)!;
    const original = previous.get(id);
    // Preserve Goose's original URL spelling when its validated target is unchanged.
    if (original && normalizeBookmarkUrl(original.url) === bookmark.url)
      bookmark = { ...bookmark, url: original.url };
    if (
      (source && source.source === undefined) ||
      source?.settings !== undefined ||
      /^goose-marks?$/.test(String(source?.source))
    ) {
      const inTrash = (locations: Location[]) =>
        locations.some(
          (location) => location.groupId === TRASH_LOCATION.groupId,
        );
      // Goose uses locations for Trash; isDeleted is a separate sync tombstone.
      const unchangedTrash =
        original && inTrash(original.locations) === inTrash(bookmark.locations);
      bookmark = {
        ...bookmark,
        isDeleted: unchangedTrash ? original.isDeleted : false,
      };
    }
    const icon = bookmark.icon;
    if (!icon) return bookmark;
    if (icon.type === "custom") {
      if (!icon.data)
        throw new Error(t`图标数据缺失，拒绝写入共享 JSON：${bookmark.title}`);
      return {
        ...bookmark,
        icon: {
          ...icon,
          data: validateSharedIconData(icon.data, bookmark.title),
        },
      };
    }
    if (icon.type === "remote" && icon.cache?.startsWith("data:image/"))
      return {
        ...bookmark,
        icon: {
          ...icon,
          cache: validateSharedIconData(icon.cache, bookmark.title),
        },
      };
    if (icon.type !== "file" || preserveFiles) return bookmark;
    if (!icon.path)
      throw new Error(t`图标路径缺失，拒绝写入共享 JSON：${bookmark.title}`);
    const data = iconBytes.get(icon.path);
    if (!data)
      throw new Error(t`图标文件缺失，拒绝写入共享 JSON：${bookmark.title}`);
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
      throw new Error(t`图标格式不支持，拒绝写入共享 JSON：${bookmark.title}`);
    return {
      ...bookmark,
      icon: {
        type: "custom" as const,
        data: `data:${mime[ext]};base64,${data}`,
        bgColor: icon.bgColor,
      },
    };
  });
  const groups = groupsWithMembers(catalog, bookmarks);
  return JSON.stringify(
    {
      ...(source ?? { schemaVersion: 1, source: "raycast-mark" }),
      groups,
      bookmarks,
    },
    null,
    2,
  );
}

/** Strip source settings without reading settings.json; local files are resolved only beneath icons/. */
export function portableDocument(
  state: LibraryState,
  sourceText?: string,
): PortableDocument {
  const { groups, bookmarks } = JSON.parse(
    sharedJsonText(state, new Map(), sourceText, true),
  );
  return { schemaVersion: 1, source: "goose-marks", groups, bookmarks };
}
export async function prepareLibrary(
  directory: string,
  state: LibraryState,
  sourceText?: string,
) {
  if (state.status !== "ready")
    throw new Error(t("仅可对已验证且无冲突的库导入或完整导出"));
  const document = portableDocument(state, sourceText);
  for (const bookmark of document.bookmarks) {
    const icon = bookmark.icon as
      Record<string, import("./portable-library.ts").Json> | undefined;
    const localFile =
      icon?.type === "file"
        ? icon.path
        : icon?.type === "remote" &&
            typeof icon.cache === "string" &&
            path.isAbsolute(icon.cache)
          ? icon.cache
          : undefined;
    if (!localFile || !icon) continue;
    const bytes = await portableLibrary.readIconFile(
      String(localFile),
      path.join(directory, "icons"),
    );
    const extension = path.extname(String(localFile)).slice(1).toLowerCase();
    const mime: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      ico: "image/x-icon",
    };
    const data = `data:${mime[extension] ?? "image/png"};base64,${Buffer.from(bytes).toString("base64")}`;
    bookmark.icon =
      icon.type === "remote"
        ? { ...icon, cache: data }
        : {
            type: "custom",
            data,
            ...(icon.bgColor === undefined ? {} : { bgColor: icon.bgColor }),
            ...(icon.fetchedAt === undefined
              ? {}
              : { fetchedAt: icon.fetchedAt }),
          };
  }
  return portableLibrary.prepare(document);
}
/** Semantic baseline uses content-addressed icons, independent of their local paths and source formatting. */
export async function localLibrarySnapshot(
  directory: string,
  state: LibraryState,
) {
  const prepared = await prepareLibrary(directory, state);
  return canonical({ digest: prepared.bookmarksDigest });
}
export async function withSharedJsonWrite<
  T extends { state: LibraryState; warning?: string },
>(
  directory: string,
  operation: () => Promise<T>,
  options: { resolving?: boolean } = {},
): Promise<T> {
  if (applyingExternal.getStore()?.active) return operation();
  return serialize(async () => {
    const source = await sharedJsonPath();
    if (!source) return operation();
    const paused = await sharedJsonPaused();
    if (paused) throw new Error(t`共享同步已暂停，请重新连接或断开：${paused}`);
    await readSharedSource(source);
    let committedResult: T | undefined;
    try {
      return await portableLibrary.withLock(source, async (lock) => {
        const currentSource = await readSharedSource(source);
        const baseline = await sharedJsonBaseline();
        if (!baseline.remote || !baseline.local)
          throw new Error(t("共享 JSON 基线缺失；为避免覆盖，请重新连接文件"));
        if (sharedJsonDigest(currentSource.raw) !== baseline.remote)
          throw new Error(t("共享 JSON 已被外部修改；当前写入已阻断"));
        const { readLibrary } = await import("./repository.ts");
        const current = await readLibrary(directory);
        if (
          !(options.resolving && current.status === "conflicted") &&
          sharedJsonDigest(await localLibrarySnapshot(directory, current)) !==
            baseline.local
        )
          throw new Error(
            t("本地库有尚未写入共享 JSON 的变更；请先导出备份，再重新连接文件"),
          );
        const result = await operation();
        committedResult = result;
        try {
          const prepared = await prepareLibrary(
            directory,
            result.state,
            currentSource.raw,
          );
          await portableLibrary.writeLocked(lock, prepared, {
            expected: { bookmarks: baseline.remote },
          });
          const published = await portableLibrary.readBookmarks(source);
          if (published.bookmarksDigest !== prepared.bookmarksDigest)
            throw new Error(t("数据已变化，请重新打开表单或预览"));
          await updateSharedJsonBaseline(
            published.bookmarksText,
            await localLibrarySnapshot(directory, result.state),
          );
          return result;
        } catch (error) {
          const published =
            error instanceof PortableError &&
            !!error.published &&
            (error.published.bookmarks || error.published.settings);
          const message = t`本地已保存；${published ? "共享源可能已更新" : "共享源未确认更新"}，同步已暂停：${error instanceof Error ? error.message : t("未知错误")}`;
          await pauseSharedJson(message).catch(() => undefined);
          return { ...result, warning: message, sharedSyncPaused: true } as T;
        }
      });
    } catch (error) {
      if (!committedResult) throw error;
      const published =
        error instanceof PortableError &&
        !!error.published &&
        (error.published.bookmarks || error.published.settings);
      const warning = t`本地已保存；${published ? "共享源可能已更新" : "共享源未确认更新"}，同步已暂停：${error instanceof Error ? error.message : t("未知错误")}`;
      try {
        await pauseSharedJson(warning);
      } catch (pauseError) {
        throw new Error(
          t`本地已保存，但暂停状态未能持久化：${pauseError instanceof Error ? pauseError.message : t("未知错误")}`,
          { cause: error },
        );
      }
      return { ...committedResult, warning, sharedSyncPaused: true } as T;
    }
  });
}

/** Legacy serialization remains available for explicit compatibility export only, never shared publication. */
export async function exportSharedJson(
  directory: string,
  state: LibraryState,
  sourceText?: string,
) {
  const { exportPortableJson } = await import("./import-export/export.ts");
  const payload = JSON.parse(await exportPortableJson(directory, state));
  const bytes = new Map<string, string>();
  for (let index = 0; index < state.bookmarks.length; index++) {
    const icon = state.bookmarks[index].icon;
    if (icon?.type === "file" && icon.path)
      bytes.set(icon.path, payload.bookmarks[index].icon.data.split(",")[1]);
  }
  return sharedJsonText(state, bytes, sourceText);
}
