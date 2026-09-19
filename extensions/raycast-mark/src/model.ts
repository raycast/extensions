import { normalizeBookmarkUrl } from "./bookmark-utils.ts";

export type ErrorCode =
  | "UNAVAILABLE"
  | "CORRUPT"
  | "UNKNOWN_SCHEMA"
  | "LIMIT"
  | "STALE_HEADS"
  | "CONFLICT"
  | "INVALID_INPUT"
  | "WRITE_FAILED";
export class LibraryError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "LibraryError";
    this.code = code;
  }
}
export const MAX_EVENT_BYTES = 10 * 1024 * 1024;
// ponytail: 10k events/100 MiB, no automatic pruning; snapshots require a separately reviewed migration.
export const MAX_EVENTS = 10_000;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const DEFAULT_LOCATION = {
  groupId: "g-default",
  subGroupId: "sg-default",
};
export const TRASH_LOCATION = { groupId: "g-trash", subGroupId: "sg-trash" };
export interface Location {
  groupId: string;
  subGroupId: string;
}
export interface Times {
  createdAt: number;
  updatedAt: number;
  serverUpdatedAt?: number;
}
export interface Icon {
  type: "file" | "remote" | "text" | "custom";
  path?: string;
  hash?: string;
  src?: string;
  cache?: string;
  value?: string;
  data?: string;
  fetchedAt?: number;
  bgColor?: string;
}
export interface Bookmark extends Times {
  id: string;
  title: string;
  url: string;
  desc?: string;
  tags: string[];
  pinned?: boolean;
  allowUniversal?: boolean;
  locations: Location[];
  prevLocations?: Location[];
  lastUsed?: number;
  visits?: number;
  isDeleted?: boolean;
  icon?: Icon;
  iconMatchedAt?: number;
  iconMatchFailedAt?: number;
  iconMatchFailedReason?: string;
}
export interface SubGroup extends Times {
  id: string;
  name: string;
  lastSyncedAt?: number;
  isDeleted?: boolean;
}
export interface Group extends SubGroup {
  children: SubGroup[];
}
export interface Catalog {
  id: "catalog";
  groups: Group[];
}
export type Entity = "catalog" | "bookmark";
export type EntityValue = Catalog | Bookmark;
export type Heads = Record<string, string[]>;
export interface Mutation {
  entity: Entity;
  entityId: string;
  baseHeads: string[];
  value: EntityValue;
}
export interface Visit {
  bookmarkId: string;
  usedAt: number;
}
export interface LibraryEvent {
  schemaVersion: 1;
  eventId: string;
  occurredAt: number;
  mutations: Mutation[];
  visits: Visit[];
}
export interface Candidate {
  eventId: string;
  value: EntityValue;
}
export interface Conflict {
  entityKey: string;
  reason: "multiple-heads" | "invalid-locations";
  candidates: Candidate[];
  message: string;
}
export interface Issue {
  code: ErrorCode;
  message: string;
  file?: string;
}
export interface LibraryState {
  status: "ready" | "conflicted" | "blocked";
  bookmarks: Bookmark[];
  catalog: Catalog;
  heads: Heads;
  conflicts: Conflict[];
  issues: Issue[];
  /** Raw snapshots carry import usage bases, not accumulated visits. Use bookmarkMutation for edits. */
  baseBookmarks: Record<string, Bookmark>;
  visitCounts: Record<string, number>;
}
export function invalid(message = "数据格式无效"): never {
  throw new LibraryError("INVALID_INPUT", message);
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 4096): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    value.includes(String.fromCharCode(0))
  )
    invalid();
  return value;
}
export function id(value: unknown): string {
  const result = text(value, 256);
  if (!result.trim()) invalid();
  return result;
}
export function timestamp(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 8640000000000000
  )
    invalid("时间或计数无效");
  return value;
}
export function array(value: unknown, max = 10000): unknown[] {
  if (!Array.isArray(value) || value.length > max) invalid();
  return value;
}
export function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((k) => !allowed.includes(k)))
    invalid("含未知字段，请移除设置或秘密字段");
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
function times(raw: Record<string, unknown>): Times {
  return {
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt),
    ...(raw.serverUpdatedAt === undefined
      ? {}
      : { serverUpdatedAt: timestamp(raw.serverUpdatedAt) }),
  };
}
export function locations(raw: unknown): Location[] {
  const result = array(raw, 1000).map((v) => {
    const o = object(v);
    keys(o, ["groupId", "subGroupId"]);
    return { groupId: id(o.groupId), subGroupId: id(o.subGroupId) };
  });
  if (new Set(result.map(canonical)).size !== result.length)
    invalid("位置重复");
  return result;
}
export function validateBookmark(value: unknown): Bookmark {
  const raw = object(value);
  keys(raw, [
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
  let url: string;
  try {
    url = normalizeBookmarkUrl(text(raw.url, 8192));
  } catch {
    invalid("不支持的网址或模板");
  }
  const b: Bookmark = {
    id: id(raw.id),
    title: id(raw.title),
    url,
    tags: array(raw.tags, 100).map((v) => text(v, 256)),
    locations: locations(raw.locations),
    ...times(raw),
  };
  for (const k of ["pinned", "allowUniversal", "isDeleted"] as const)
    if (raw[k] !== undefined) {
      if (typeof raw[k] !== "boolean") invalid();
      b[k] = raw[k];
    }
  for (const k of [
    "lastUsed",
    "visits",
    "iconMatchedAt",
    "iconMatchFailedAt",
  ] as const)
    if (raw[k] !== undefined) b[k] = timestamp(raw[k]);
  for (const k of ["desc", "iconMatchFailedReason"] as const)
    if (raw[k] !== undefined) b[k] = text(raw[k], 16384);
  if (raw.prevLocations !== undefined)
    b.prevLocations = locations(raw.prevLocations);
  if (raw.icon !== undefined) {
    const i = object(raw.icon);
    const type = i.type;
    if (
      type !== "file" &&
      type !== "remote" &&
      type !== "text" &&
      type !== "custom"
    )
      invalid("图标类型无效");
    const fields = {
      file: ["path", "hash"],
      remote: ["src", "cache"],
      text: ["value"],
      custom: ["data"],
    }[type];
    keys(i, ["type", "bgColor", "fetchedAt", ...fields]);
    const icon: Icon = { type };
    for (const k of [...fields, "bgColor"])
      if (i[k] !== undefined)
        Object.assign(icon, { [k]: text(i[k], 1024 * 1024) });
    if (i.fetchedAt !== undefined) icon.fetchedAt = timestamp(i.fetchedAt);
    if (typeof i[fields[0]] !== "string" || !i[fields[0]])
      invalid("图标字段无效");
    b.icon = icon;
  }
  return b;
}
export function validateCatalog(value: unknown): Catalog {
  const raw = object(value);
  keys(raw, ["id", "groups"]);
  if (raw.id !== "catalog") invalid();
  const seen = new Set<string>();
  const parse = (v: unknown, group: boolean): SubGroup | Group => {
    const o = object(v);
    keys(o, [
      "id",
      "name",
      "createdAt",
      "updatedAt",
      "serverUpdatedAt",
      "lastSyncedAt",
      "isDeleted",
      ...(group ? ["children"] : []),
    ]);
    const item: SubGroup = { id: id(o.id), name: id(o.name), ...times(o) };
    if (seen.has(item.id)) invalid("分类 ID 重复");
    seen.add(item.id);
    if (o.lastSyncedAt !== undefined)
      item.lastSyncedAt = timestamp(o.lastSyncedAt);
    if (o.isDeleted !== undefined) {
      if (typeof o.isDeleted !== "boolean") invalid();
      item.isDeleted = o.isDeleted;
    }
    return group
      ? {
          ...item,
          children: array(o.children, 1000).map(
            (s) => parse(s, false) as SubGroup,
          ),
        }
      : item;
  };
  const catalog: Catalog = {
    id: "catalog",
    groups: array(raw.groups, 1000).map((g) => parse(g, true) as Group),
  };
  for (const loc of [DEFAULT_LOCATION, TRASH_LOCATION])
    if (!hasLocation(catalog, loc)) invalid("默认分类与回收站必须保留");
  return catalog;
}
export function hasLocation(c: Catalog, l: Location): boolean {
  return c.groups.some(
    (g) =>
      g.id === l.groupId &&
      !g.isDeleted &&
      g.children.some((s) => s.id === l.subGroupId && !s.isDeleted),
  );
}
export function emptyCatalog(): Catalog {
  return {
    id: "catalog",
    groups: [DEFAULT_LOCATION, TRASH_LOCATION].map((l, i) => ({
      id: l.groupId,
      name: i ? "回收站" : "默认",
      createdAt: 0,
      updatedAt: 0,
      children: [
        {
          id: l.subGroupId,
          name: i ? "已删除" : "未分类",
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    })),
  };
}
export function entityKey(entity: Entity, entityId: string): string {
  return `${entity}:${entityId}`;
}
export function bookmarkMutation(
  state: LibraryState,
  edited: Bookmark,
): Mutation {
  const base = state.baseBookmarks[edited.id];
  const value = validateBookmark(edited);
  // Edits operate on displayed totals; persisted snapshots must retain the original usage base.
  if (base) {
    value.visits = base.visits;
    value.lastUsed = base.lastUsed;
  }
  return {
    entity: "bookmark",
    entityId: value.id,
    baseHeads: state.heads[entityKey("bookmark", value.id)] ?? [],
    value,
  };
}
export function catalogMutation(
  state: LibraryState,
  catalog: Catalog,
): Mutation {
  return {
    entity: "catalog",
    entityId: "catalog",
    baseHeads: state.heads["catalog:catalog"] ?? [],
    value: validateCatalog(catalog),
  };
}
export function deleteBookmark(
  state: LibraryState,
  bookmark: Bookmark,
): Mutation {
  return bookmarkMutation(state, {
    ...bookmark,
    isDeleted: true,
    prevLocations: bookmark.locations,
    locations: [TRASH_LOCATION],
    updatedAt: Date.now(),
  });
}
export function restoreBookmark(
  state: LibraryState,
  bookmark: Bookmark,
): Mutation {
  if (!bookmark.isDeleted) invalid("书签不是删除状态");
  const restored = bookmark.prevLocations?.filter(
    (l) =>
      l.groupId !== TRASH_LOCATION.groupId && hasLocation(state.catalog, l),
  );
  return bookmarkMutation(state, {
    ...bookmark,
    isDeleted: false,
    locations: restored?.length ? restored : [DEFAULT_LOCATION],
    updatedAt: Date.now(),
  });
}
/** Caller must show affected count before submitting all returned mutations together. */
export function removeCategory(
  state: LibraryState,
  groupId: string,
  subGroupId?: string,
  target: "default" | "trash" = "default",
): { affectedCount: number; mutations: Mutation[] } {
  if ([DEFAULT_LOCATION.groupId, TRASH_LOCATION.groupId].includes(groupId))
    invalid("默认分类与回收站禁止删除");
  const catalog = structuredClone(state.catalog);
  const group = catalog.groups.find((g) => g.id === groupId);
  if (
    !group ||
    (subGroupId && !group.children.some((s) => s.id === subGroupId))
  )
    invalid("分类不存在");
  if (subGroupId)
    group.children = group.children.filter((s) => s.id !== subGroupId);
  else catalog.groups = catalog.groups.filter((g) => g.id !== groupId);
  const affected = state.bookmarks.filter((b) =>
    b.locations.some(
      (l) =>
        l.groupId === groupId && (!subGroupId || l.subGroupId === subGroupId),
    ),
  );
  const mutations = affected.map((b) => {
    if (target === "trash") return deleteBookmark(state, b);
    const remaining = b.locations.filter(
      (l) =>
        l.groupId !== groupId || (subGroupId && l.subGroupId !== subGroupId),
    );
    return bookmarkMutation(state, {
      ...b,
      locations: remaining.length ? remaining : [DEFAULT_LOCATION],
      updatedAt: Date.now(),
    });
  });
  return {
    affectedCount: affected.length,
    mutations: [catalogMutation(state, catalog), ...mutations],
  };
}
