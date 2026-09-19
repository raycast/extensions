import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import {
  array,
  bookmarkMutation,
  canonical,
  catalogMutation,
  DEFAULT_LOCATION,
  emptyCatalog,
  entityKey,
  id,
  invalid,
  keys,
  LibraryError,
  locations,
  MAX_EVENT_BYTES,
  object,
  timestamp,
  TRASH_LOCATION,
  validateBookmark,
  validateCatalog,
} from "./model.ts";
import type {
  Bookmark,
  Catalog,
  Heads,
  LibraryState,
  Location,
  Mutation,
} from "./model.ts";
import { commit, readLibrary } from "./repository.ts";

export interface ImportDifference {
  entityKey: string;
  local: Bookmark | Catalog;
  incoming: Bookmark | Catalog;
}
export interface ImportPlan {
  data: { catalog: Catalog; bookmarks: Bookmark[] };
  warnings: string[];
  counts: {
    bookmarks: number;
    groups: number;
    attachments: number;
    generatedIds: number;
    missingTimes: number;
    identical: number;
    sameUrl: number;
  };
  differences: ImportDifference[];
  mutations: Mutation[];
  expectedHeads: Heads;
}
export type ImportDecisions = Record<string, "local" | "incoming">;
function ready(state: LibraryState) {
  if (state.status !== "ready")
    throw new LibraryError(
      state.status === "blocked" ? "CORRUPT" : "CONFLICT",
      "仅可对已验证且无冲突的库导入或完整导出",
    );
}
function sameLocations(a: Location[], b: Location[]): boolean {
  return (
    canonical(a.map(canonical).sort()) === canonical(b.map(canonical).sort())
  );
}
function rejectSecrets(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      /settings|api.?key|secret|password|token|provider|authorization/i.test(
        key,
      )
    )
      invalid("导入含设置或秘密字段，请先移除（未显示字段值）");
    rejectSecrets(child);
  }
}
export function previewJsonImport(
  text: string,
  state: LibraryState,
): ImportPlan {
  ready(state);
  if (Buffer.byteLength(text) > MAX_EVENT_BYTES)
    throw new LibraryError("LIMIT", "导入超过 10 MiB");
  let raw: Record<string, unknown>;
  try {
    raw = object(JSON.parse(text));
  } catch {
    invalid("JSON 无效或不是对象");
  }
  rejectSecrets(raw);
  keys(raw, ["schemaVersion", "source", "groups", "bookmarks"]);
  if (
    raw.schemaVersion !== undefined &&
    (raw.schemaVersion !== 1 || raw.source !== "raycast-marks")
  )
    throw new LibraryError("UNKNOWN_SCHEMA", "不支持的导入版本或来源");
  if (raw.schemaVersion === undefined && raw.source !== undefined)
    invalid("旧格式不得声明未知来源");
  const counts = {
    bookmarks: 0,
    groups: 0,
    attachments: 0,
    generatedIds: 0,
    missingTimes: 0,
    identical: 0,
    sameUrl: 0,
  };
  const warnings: string[] = [];
  const now = Date.now();
  const makeId = (value: unknown) => {
    if (value === undefined) {
      counts.generatedIds++;
      return randomUUID();
    }
    return id(value);
  };
  const time = (value: unknown, fallback: number) => {
    if (value === undefined) {
      counts.missingTimes++;
      return fallback;
    }
    return timestamp(value);
  };
  const index = new Map<string, Location[]>();
  const groups = array(raw.groups, 1000).map((value) => {
    const group = object(value);
    keys(group, [
      "id",
      "name",
      "children",
      "createdAt",
      "updatedAt",
      "serverUpdatedAt",
      "lastSyncedAt",
      "isDeleted",
    ]);
    const groupId = makeId(group.id);
    const createdAt = time(group.createdAt, now);
    return {
      id: groupId,
      name: group.name,
      createdAt,
      updatedAt: time(group.updatedAt, createdAt),
      serverUpdatedAt: group.serverUpdatedAt,
      lastSyncedAt: group.lastSyncedAt,
      isDeleted: group.isDeleted,
      children: array(group.children, 1000).map((value) => {
        const sub = object(value);
        keys(sub, [
          "id",
          "name",
          "bookmarkIds",
          "createdAt",
          "updatedAt",
          "serverUpdatedAt",
          "lastSyncedAt",
          "isDeleted",
        ]);
        const subGroupId = makeId(sub.id);
        const createdAt = time(sub.createdAt, now);
        const members = array(sub.bookmarkIds).map(id);
        if (new Set(members).size !== members.length)
          invalid("旧分类成员索引重复");
        for (const member of members)
          index.set(member, [
            ...(index.get(member) ?? []),
            { groupId, subGroupId },
          ]);
        return {
          id: subGroupId,
          name: sub.name,
          createdAt,
          updatedAt: time(sub.updatedAt, createdAt),
          serverUpdatedAt: sub.serverUpdatedAt,
          lastSyncedAt: sub.lastSyncedAt,
          isDeleted: sub.isDeleted,
        };
      }),
    };
  });
  for (const base of emptyCatalog().groups) {
    const existing = groups.find((g) => g.id === base.id);
    if (!existing) {
      groups.push({
        ...base,
        serverUpdatedAt: base.serverUpdatedAt,
        lastSyncedAt: base.lastSyncedAt,
        isDeleted: base.isDeleted,
        children: base.children.map((s) => ({
          ...s,
          serverUpdatedAt: s.serverUpdatedAt,
          lastSyncedAt: s.lastSyncedAt,
          isDeleted: s.isDeleted,
        })),
      });
      warnings.push(`按固定 ID 补齐特殊分类 ${base.id}`);
    } else if (!existing.children.some((s) => s.id === base.children[0].id)) {
      existing.children.push({
        ...base.children[0],
        serverUpdatedAt: undefined,
        lastSyncedAt: undefined,
        isDeleted: undefined,
      });
      warnings.push(`按固定 ID 补齐特殊位置 ${base.children[0].id}`);
    }
  }
  const catalog = validateCatalog({ id: "catalog", groups });
  const seen = new Set<string>();
  const bookmarks = array(raw.bookmarks).map((value) => {
    const b = object(value);
    keys(b, [
      "id",
      "title",
      "url",
      "desc",
      "tags",
      "pinned",
      "allowUniversal",
      "locations",
      "prevLocations",
      "createdAt",
      "updatedAt",
      "serverUpdatedAt",
      "lastUsed",
      "visits",
      "isDeleted",
      "icon",
      "iconMatchedAt",
      "iconMatchFailedAt",
      "iconMatchFailedReason",
    ]);
    const bookmarkId = makeId(b.id);
    if (seen.has(bookmarkId)) invalid("导入中书签 ID 重复，请先合并重复记录");
    seen.add(bookmarkId);
    const indexed = index.get(bookmarkId) ?? [];
    let locs: Location[];
    if (b.locations !== undefined) {
      locs = locations(b.locations);
      if (!sameLocations(locs, indexed))
        invalid("旧成员索引与 locations 矛盾，请在源文件明确修复后重试");
    } else locs = indexed;
    if (!locs.length) {
      locs = [b.isDeleted === true ? TRASH_LOCATION : DEFAULT_LOCATION];
      warnings.push(`无位置书签已分配默认位置（ID: ${bookmarkId}）`);
    }
    const inTrash = locs.some((l) => l.groupId === TRASH_LOCATION.groupId);
    if (b.isDeleted !== undefined && b.isDeleted !== inTrash)
      invalid("删除状态与旧回收站位置矛盾");
    const createdAt = time(b.createdAt, now);
    // Validation rejects unknown fields before a whitelist snapshot is constructed.
    const result = validateBookmark({
      title: b.title,
      url: b.url,
      desc: b.desc,
      pinned: b.pinned,
      allowUniversal: b.allowUniversal,
      prevLocations: b.prevLocations,
      serverUpdatedAt: b.serverUpdatedAt,
      lastUsed: b.lastUsed,
      visits: b.visits,
      icon: b.icon,
      iconMatchedAt: b.iconMatchedAt,
      iconMatchFailedAt: b.iconMatchFailedAt,
      iconMatchFailedReason: b.iconMatchFailedReason,
      id: bookmarkId,
      createdAt,
      updatedAt: time(b.updatedAt, createdAt),
      tags: b.tags === undefined ? [] : b.tags,
      locations: locs,
      isDeleted: inTrash,
    });
    if (
      result.locations.some(
        (l) =>
          !catalog.groups.some(
            (g) =>
              g.id === l.groupId &&
              !g.isDeleted &&
              g.children.some((s) => s.id === l.subGroupId && !s.isDeleted),
          ),
      )
    )
      invalid("书签引用无效分类");
    if (
      result.prevLocations?.some(
        (l) =>
          !catalog.groups.some(
            (g) =>
              g.id === l.groupId &&
              g.children.some((s) => s.id === l.subGroupId),
          ),
      )
    )
      warnings.push("历史恢复位置已有删除，恢复时会回退到默认位置");
    if (
      result.icon &&
      (result.icon.type === "file" ||
        result.icon.type === "custom" ||
        result.icon.cache)
    )
      counts.attachments++;
    return result;
  });
  for (const member of index.keys())
    if (!seen.has(member)) invalid("旧分类索引引用不存在书签");
  counts.bookmarks = bookmarks.length;
  counts.groups = catalog.groups.length;
  if (counts.generatedIds)
    warnings.push(`${counts.generatedIds} 个缺失 ID 已在本预览固定生成`);
  if (counts.missingTimes)
    warnings.push(
      `${counts.missingTimes} 个缺失时间：createdAt 使用预览时间，updatedAt 使用 createdAt；已有时间按原毫秒值保留`,
    );
  if (counts.attachments)
    warnings.push(
      `${counts.attachments} 个图标附件仅被动保留字段，不读取、复制或保证附件可用`,
    );
  const merged = structuredClone(state.catalog);
  for (const g of catalog.groups) {
    const at = merged.groups.findIndex((local) => local.id === g.id);
    if (at < 0) merged.groups.push(g);
    else {
      const local = merged.groups[at];
      merged.groups[at] = {
        ...g,
        children: [
          ...g.children,
          ...local.children.filter(
            (s) => !g.children.some((incoming) => incoming.id === s.id),
          ),
        ],
      };
    }
  }
  validateCatalog(merged);
  const mutations: Mutation[] = [];
  const differences: ImportDifference[] = [];
  if (canonical(merged) !== canonical(state.catalog)) {
    mutations.push(catalogMutation(state, merged));
    if (state.heads["catalog:catalog"]?.length || state.bookmarks.length)
      differences.push({
        entityKey: "catalog:catalog",
        local: state.catalog,
        incoming: merged,
      });
  }
  for (const incoming of bookmarks) {
    const local = state.bookmarks.find((b) => b.id === incoming.id);
    if (
      state.bookmarks.some(
        (b) => b.id !== incoming.id && b.url === incoming.url,
      )
    )
      counts.sameUrl++;
    if (local) {
      warnings.push(`已有 ID ${incoming.id}：保留本地访问统计，导入统计不覆盖`);
      const mutation = bookmarkMutation(state, incoming);
      if (
        canonical(mutation.value) ===
        canonical(state.baseBookmarks[incoming.id])
      ) {
        counts.identical++;
        continue;
      }
      differences.push({
        entityKey: entityKey("bookmark", incoming.id),
        local,
        incoming: mutation.value as Bookmark,
      });
      mutations.push(mutation);
    } else mutations.push(bookmarkMutation(state, incoming));
  }
  if (counts.sameUrl)
    warnings.push(`${counts.sameUrl} 个不同 ID 同 URL，保留为独立书签`);
  return {
    data: { catalog, bookmarks },
    warnings: [...new Set(warnings)],
    counts,
    differences,
    mutations,
    expectedHeads: structuredClone(state.heads),
  };
}
export async function applyJsonImport(
  directory: string,
  plan: ImportPlan,
  decisions: ImportDecisions,
) {
  for (const difference of plan.differences)
    if (!["local", "incoming"].includes(decisions[difference.entityKey]))
      invalid("请明确选择所有同 ID 差异");
  const mutations = plan.mutations.filter(
    (m) => decisions[entityKey(m.entity, m.entityId)] !== "local",
  );
  // Keeping a local catalog may invalidate incoming locations; repository rejects the entire transaction.
  return commit(directory, { mutations, expectedHeads: plan.expectedHeads });
}
export function exportJson(state: LibraryState): string {
  ready(state);
  const catalog = validateCatalog(state.catalog);
  const bookmarks = state.bookmarks.map(validateBookmark);
  const groups = catalog.groups.map((g) => ({
    ...g,
    children: g.children.map((s) => ({
      ...s,
      bookmarkIds: bookmarks
        .filter((b) =>
          b.locations.some((l) => l.groupId === g.id && l.subGroupId === s.id),
        )
        .map((b) => b.id),
    })),
  }));
  return JSON.stringify(
    { schemaVersion: 1, source: "raycast-marks", groups, bookmarks },
    null,
    2,
  );
}
/** Explicit user destination only. Refuses existing files and all paths inside this library. */
export async function saveJsonExport(
  directory: string,
  destination: string,
): Promise<void> {
  if (!path.isAbsolute(destination)) invalid("导出路径必须是绝对路径");
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
    invalid("不能导出到事件数据目录");
  const data = exportJson(await readLibrary(root));
  let handle;
  try {
    handle = await fs.open(target, "wx", 0o600);
    await handle.writeFile(data, "utf8");
    await handle.sync();
  } catch {
    throw new LibraryError(
      "WRITE_FAILED",
      "无法导出：目标已存在或写入失败；请检查目标文件，不覆盖重试",
    );
  } finally {
    await handle?.close();
  }
}
