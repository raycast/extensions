import { t } from "../i18n.ts";
import * as fs from "node:fs/promises";
import path from "node:path";
import {
  invalid,
  LibraryError,
  MAX_EVENT_BYTES,
  validateBookmark,
  validateCatalog,
} from "../model.ts";
import type { Bookmark, LibraryState } from "../model.ts";
import { readLibrary } from "../repository.ts";
import { ready } from "./common.ts";
import { groupsWithMembers } from "./memberships.ts";

export function exportJson(state: LibraryState): string {
  ready(state);
  const catalog = validateCatalog(state.catalog);
  const bookmarks = state.bookmarks.map(validateBookmark);
  const groups = groupsWithMembers(catalog, bookmarks);
  return JSON.stringify(
    { schemaVersion: 1, source: "raycast-mark", groups, bookmarks },
    null,
    2,
  );
}

/** Export the same uTools-compatible JSON, with local icon files embedded. */
export async function exportPortableJson(
  directory: string,
  state: LibraryState,
): Promise<string> {
  const payload = JSON.parse(exportJson(state)) as { bookmarks: Bookmark[] };
  const iconsRoot = await fs
    .realpath(path.join(directory, "icons"))
    .catch(() => path.join(directory, "icons"));
  const mime: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
  };
  for (const bookmark of payload.bookmarks) {
    const icon = bookmark.icon;
    const reference =
      icon?.type === "file"
        ? icon.path
        : icon?.type === "remote" && icon.cache && path.isAbsolute(icon.cache)
          ? icon.cache
          : undefined;
    if (!icon || !reference) continue;
    const file = await fs
      .realpath(reference)
      .catch(() => invalid(t("图标文件已丢失，无法完整导出")));
    const relative = path.relative(iconsRoot, file);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      invalid(t("图标不在本地库目录，无法安全导出"));
    const kind = mime[path.extname(file).slice(1).toLowerCase()];
    if (!kind || (await fs.stat(file)).size > 2 * 1024 * 1024)
      invalid(t("图标格式或大小无效"));
    if (icon.type === "remote") {
      bookmark.icon = {
        ...icon,
        cache: `data:${kind};base64,${(await fs.readFile(file)).toString("base64")}`,
      };
      continue;
    }
    bookmark.icon = {
      type: "custom",
      data: `data:${kind};base64,${(await fs.readFile(file)).toString("base64")}`,
      bgColor: icon.bgColor,
    };
  }
  const data = JSON.stringify(payload, null, 2);
  if (Buffer.byteLength(data) > MAX_EVENT_BYTES)
    invalid(t("备份超过 10 MiB，无法完整导出"));
  return data;
}

/** Explicit user destination only. Refuses existing files and all paths inside this library. */
export async function saveJsonExport(
  directory: string,
  destination: string,
): Promise<void> {
  if (!path.isAbsolute(destination)) invalid(t("导出路径必须是绝对路径"));
  const root = await fs.realpath(directory);
  const parent = await fs.realpath(path.dirname(destination));
  const target = path.join(parent, path.basename(destination));
  const relative = path.relative(root, target);
  if (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    invalid(t("不能导出到事件数据目录"));
  const data = await exportPortableJson(root, await readLibrary(root));
  let handle;
  try {
    handle = await fs.open(target, "wx", 0o600);
    await handle.writeFile(data, "utf8");
    await handle.sync();
  } catch {
    throw new LibraryError(
      "WRITE_FAILED",
      t("无法导出：目标已存在或写入失败；请检查目标文件，不覆盖重试"),
    );
  } finally {
    await handle?.close();
  }
}

/** Folder backups keep image bytes separate from the bounded JSON document. */
export async function saveFolderExport(directory: string, destination: string) {
  const { portableLibrary, prepareLibrary, sharedJsonPath, readSharedSource } =
    await import("../shared-json-storage.ts");
  const root = await fs.realpath(directory);
  const parent = await fs.realpath(path.dirname(destination));
  const target = path.join(parent, path.basename(destination));
  const relative = path.relative(root, target);
  if (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    invalid(t("不能导出到事件数据目录"));
  const prepared = await prepareLibrary(root, await readLibrary(root));
  const source = await sharedJsonPath();
  // Source paths can be unavailable during recovery; still reject nesting by their explicit path.
  if (source) {
    const sourceRelative = path.relative(source, target);
    if (
      !sourceRelative ||
      (!sourceRelative.startsWith(`..${path.sep}`) &&
        sourceRelative !== ".." &&
        !path.isAbsolute(sourceRelative))
    )
      invalid(t("不能导出到共享数据文件夹"));
  }
  const folder = source
    ? await readSharedSource(source).catch(() => undefined)
    : undefined;
  await portableLibrary.exportFolder(
    target,
    prepared,
    folder?.folder ? source : root,
  );
}
