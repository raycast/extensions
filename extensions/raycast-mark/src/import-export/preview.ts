import { t } from "../i18n.ts";
import { randomUUID } from "node:crypto";
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
} from "../model.ts";
import type { Bookmark, LibraryState, Location, Mutation } from "../model.ts";
import { ready } from "./common.ts";
import type { ImportDifference, ImportPlan } from "./types.ts";

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
      invalid(t("导入含设置或秘密字段，请先移除（未显示字段值）"));
    rejectSecrets(child);
  }
}

export function previewJsonImport(
  text: string,
  state: LibraryState,
  options: { shared?: boolean; folder?: boolean } = {},
): ImportPlan {
  ready(state);
  if (
    Buffer.byteLength(text) >
    (options.folder ? 100 * 1024 * 1024 : MAX_EVENT_BYTES)
  )
    throw new LibraryError("LIMIT", t("导入文档超过容量上限"));
  let raw: Record<string, unknown>;
  try {
    raw = object(JSON.parse(text));
  } catch {
    invalid(t("JSON 无效或不是对象"));
  }
  // Goose exports include their own settings. They stay in the shared source,
  // never enter Raycast preferences, events, or backups.
  // Legacy settings are discarded without inspecting their contents.
  const { settings, ...library } = raw;
  const gooseTrashSemantics =
    options.shared ||
    settings !== undefined ||
    raw.source === undefined ||
    /^goose-marks?$/.test(String(raw.source));
  rejectSecrets(library);
  keys(raw, ["schemaVersion", "source", "groups", "bookmarks", "settings"]);
  const knownSources = new Set([
    "raycast-mark",
    "raycast-marks",
    "goose-mark",
    "goose-marks",
  ]);
  if (raw.schemaVersion !== undefined) {
    if (raw.schemaVersion !== 1)
      throw new LibraryError("UNKNOWN_SCHEMA", t("不支持的导入版本或来源"));
    if (raw.source !== undefined && !knownSources.has(String(raw.source)))
      throw new LibraryError("UNKNOWN_SCHEMA", t("不支持的导入版本或来源"));
  } else if (
    raw.source !== undefined &&
    !knownSources.has(String(raw.source))
  ) {
    invalid(t("旧格式不得声明未知来源"));
  }
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
  if (settings !== undefined)
    warnings.push(t("源应用设置保留在共享文件中，不导入 Raycast"));
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
      "orderIndex",
      "createdAt",
      "updatedAt",
      "serverUpdatedAt",
      "lastSyncedAt",
      "isDeleted",
    ]);
    // uTools export includes a presentation index; catalog order carries it internally.
    if (group.orderIndex !== undefined) timestamp(group.orderIndex);
    const groupId = makeId(group.id);
    const createdAt = time(group.createdAt, now);
    return {
      id: groupId,
      name: group.name,
      orderIndex: group.orderIndex,
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
          "orderIndex",
          "createdAt",
          "updatedAt",
          "serverUpdatedAt",
          "lastSyncedAt",
          "isDeleted",
        ]);
        const subGroupId = makeId(sub.id);
        if (sub.orderIndex !== undefined) timestamp(sub.orderIndex);
        const createdAt = time(sub.createdAt, now);
        const members = array(sub.bookmarkIds).map(id);
        if (new Set(members).size !== members.length)
          invalid(t("旧分类成员索引重复"));
        for (const member of members)
          index.set(member, [
            ...(index.get(member) ?? []),
            { groupId, subGroupId },
          ]);
        return {
          id: subGroupId,
          name: sub.name,
          bookmarkIds: members,
          orderIndex: sub.orderIndex,
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
        orderIndex: base.orderIndex,
        serverUpdatedAt: base.serverUpdatedAt,
        lastSyncedAt: base.lastSyncedAt,
        isDeleted: base.isDeleted,
        children: base.children.map((s) => ({
          ...s,
          bookmarkIds: s.bookmarkIds ?? [],
          orderIndex: s.orderIndex,
          serverUpdatedAt: s.serverUpdatedAt,
          lastSyncedAt: s.lastSyncedAt,
          isDeleted: s.isDeleted,
        })),
      });
      warnings.push(t`按固定 ID 补齐特殊分类 ${base.id}`);
    } else if (!existing.children.some((s) => s.id === base.children[0].id)) {
      existing.children.push({
        ...base.children[0],
        bookmarkIds: base.children[0].bookmarkIds ?? [],
        orderIndex: base.children[0].orderIndex,
        serverUpdatedAt: undefined,
        lastSyncedAt: undefined,
        isDeleted: undefined,
      });
      warnings.push(t`按固定 ID 补齐特殊位置 ${base.children[0].id}`);
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
    if (seen.has(bookmarkId))
      invalid(t("导入中书签 ID 重复，请先合并重复记录"));
    seen.add(bookmarkId);
    const indexed = index.get(bookmarkId) ?? [];
    let locs: Location[];
    if (b.locations !== undefined) {
      locs = locations(b.locations);
      if (!sameLocations(locs, indexed))
        invalid(t("旧成员索引与 locations 矛盾，请在源文件明确修复后重试"));
    } else locs = indexed;
    if (!locs.length) {
      locs = [b.isDeleted === true ? TRASH_LOCATION : DEFAULT_LOCATION];
      warnings.push(t`无位置书签已分配默认位置（ID: ${bookmarkId}）`);
    }
    const inTrash = locs.some((l) => l.groupId === TRASH_LOCATION.groupId);
    if (
      b.isDeleted !== undefined &&
      b.isDeleted !== inTrash &&
      !(gooseTrashSemantics && inTrash && b.isDeleted === false)
    )
      invalid(t("删除状态与旧回收站位置矛盾"));
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
      invalid(t("书签引用无效分类"));
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
      warnings.push(t("历史恢复位置已有删除，恢复时会回退到默认位置"));
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
    if (!seen.has(member)) invalid(t("旧分类索引引用不存在书签"));
  counts.bookmarks = bookmarks.length;
  counts.groups = catalog.groups.length;
  if (counts.generatedIds)
    warnings.push(t`${counts.generatedIds} 个缺失 ID 已在本预览固定生成`);
  if (counts.missingTimes)
    warnings.push(
      t`${counts.missingTimes} 个缺失时间：createdAt 使用预览时间，updatedAt 使用 createdAt；已有时间按原毫秒值保留`,
    );
  if (counts.attachments)
    warnings.push(
      t`${counts.attachments} 个图标附件将在导入时落盘；旧 file 路径不读取，改为本地占位图标，导入不等待网络`,
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
      warnings.push(
        t`已有 ID ${incoming.id}：保留本地访问统计，导入统计不覆盖`,
      );
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
    warnings.push(t`${counts.sameUrl} 个不同 ID 同 URL，保留为独立书签`);
  return {
    data: { catalog, bookmarks },
    warnings: [...new Set(warnings)],
    counts,
    differences,
    mutations,
    expectedHeads: structuredClone(state.heads),
  };
}
