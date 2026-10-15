import { t } from "./i18n.ts";
import {
  array,
  canonical,
  emptyCatalog,
  entityKey,
  hasLocation,
  id,
  invalid,
  keys,
  LibraryError,
  object,
  timestamp,
  TRASH_LOCATION,
  validateBookmark,
  validateCatalog,
} from "./model.ts";
import type {
  Bookmark,
  Candidate,
  Catalog,
  Heads,
  LibraryEvent,
  LibraryState,
  Mutation,
  Visit,
} from "./model.ts";

export const EVENT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function uuid(value: unknown): string {
  const result = id(value);
  if (!EVENT_UUID.test(result)) invalid(t("事件 ID 无效"));
  return result;
}
export function validateEvent(value: unknown): LibraryEvent {
  const raw = object(value);
  if (raw.schemaVersion !== 1)
    throw new LibraryError("UNKNOWN_SCHEMA", t("不支持的事件版本"));
  keys(raw, ["schemaVersion", "eventId", "occurredAt", "mutations", "visits"]);
  const eventId = uuid(raw.eventId);
  const entities = new Set<string>();
  const mutations: Mutation[] = array(raw.mutations).map((v) => {
    const m = object(v);
    keys(m, [
      "entity",
      "entityId",
      "baseHeads",
      "value",
      "coveredVisits",
      "removed",
    ]);
    if (m.entity !== "bookmark" && m.entity !== "catalog") invalid();
    const entityId = id(m.entityId);
    const key = entityKey(m.entity, entityId);
    if (entities.has(key)) invalid(t("单事务不能重复修改同一实体"));
    entities.add(key);
    const baseHeads = array(m.baseHeads).map(uuid);
    if (
      new Set(baseHeads).size !== baseHeads.length ||
      baseHeads.includes(eventId)
    )
      invalid(t("父版本重复或自引用"));
    const result =
      m.entity === "catalog"
        ? validateCatalog(m.value)
        : validateBookmark(m.value);
    if (result.id !== entityId) invalid(t("实体 ID 不一致"));
    const mutation: Mutation = {
      entity: m.entity,
      entityId,
      baseHeads,
      value: result,
    };
    if (m.coveredVisits !== undefined) {
      if (m.entity !== "bookmark") invalid(t("访问覆盖仅适用于书签"));
      const covered = array(m.coveredVisits).map(uuid);
      if (new Set(covered).size !== covered.length || covered.includes(eventId))
        invalid(t("访问覆盖事件重复或自引用"));
      mutation.coveredVisits = covered.sort();
    }
    if (m.removed !== undefined) {
      if (m.entity !== "bookmark" || m.removed !== true)
        invalid(t("永久移除标记仅适用于书签"));
      mutation.removed = true;
    }
    return mutation;
  });
  const visits: Visit[] = array(raw.visits).map((v) => {
    const o = object(v);
    keys(o, ["bookmarkId", "usedAt"]);
    return { bookmarkId: id(o.bookmarkId), usedAt: timestamp(o.usedAt) };
  });
  if (!mutations.length && !visits.length) invalid(t("空事务被拒绝"));
  return {
    schemaVersion: 1,
    eventId,
    occurredAt: timestamp(raw.occurredAt),
    mutations,
    visits,
  };
}

/** Pure deterministic replay, including duplicate delivery. No time-based winner selection. */
export function replayEvents(input: LibraryEvent[]): LibraryState {
  const events = new Map<string, LibraryEvent>();
  for (const raw of input) {
    const event = validateEvent(raw);
    const prior = events.get(event.eventId);
    if (prior && canonical(prior) !== canonical(event))
      throw new LibraryError("CORRUPT", t("同一事件 ID 内容不同"));
    events.set(event.eventId, event);
  }
  for (const event of events.values())
    for (const mutation of event.mutations)
      for (const covered of mutation.coveredVisits ?? [])
        if (
          !events
            .get(covered)
            ?.visits.some((visit) => visit.bookmarkId === mutation.entityId)
        )
          throw new LibraryError("CORRUPT", t("访问覆盖引用缺失或错误书签"));
  const versions = new Map<string, Map<string, Mutation>>();
  for (const e of events.values())
    for (const m of e.mutations) {
      const key = entityKey(m.entity, m.entityId);
      if (!versions.has(key)) versions.set(key, new Map());
      versions.get(key)!.set(e.eventId, m);
    }
  const pendingEvents = new Map(events);
  const completedEvents = new Set<string>();
  while (pendingEvents.size) {
    let advanced = false;
    for (const [eventId, event] of pendingEvents)
      if (
        event.mutations.every((m) =>
          m.baseHeads.every((parent) => completedEvents.has(parent)),
        )
      ) {
        completedEvents.add(eventId);
        pendingEvents.delete(eventId);
        advanced = true;
      }
    if (!advanced)
      throw new LibraryError("CORRUPT", t("事件事务依赖缺失或存在环"));
  }
  const heads: Heads = Object.create(null);
  const candidates = new Map<string, Candidate[]>();
  for (const [key, versionsForEntity] of versions) {
    const consumed = new Set<string>();
    const remaining = new Map(versionsForEntity);
    const done = new Set<string>();
    for (const m of remaining.values())
      for (const parent of m.baseHeads) {
        if (!versionsForEntity.has(parent))
          throw new LibraryError(
            "CORRUPT",
            t("父事件尚未到达本机或引用了错误实体"),
          );
        consumed.add(parent);
      }
    while (remaining.size) {
      let advanced = false;
      for (const [eventId, mutation] of remaining)
        if (mutation.baseHeads.every((p) => done.has(p))) {
          done.add(eventId);
          remaining.delete(eventId);
          advanced = true;
        }
      if (!advanced) throw new LibraryError("CORRUPT", t("事件依赖存在环"));
    }
    heads[key] = [...versionsForEntity.keys()]
      .filter((eventId) => !consumed.has(eventId))
      .sort();
    candidates.set(
      key,
      heads[key].map((eventId) => {
        const mutation = versionsForEntity.get(eventId)!;
        return {
          eventId,
          value: mutation.value,
          ...(mutation.coveredVisits === undefined
            ? {}
            : { coveredVisits: [...mutation.coveredVisits] }),
          ...(mutation.removed ? { removed: true as const } : {}),
        };
      }),
    );
  }
  const coveredVisits: Record<string, string[]> = Object.create(null);
  const visitEventIds: Record<string, string[]> = Object.create(null);
  const state: LibraryState = {
    status: "ready",
    catalog: emptyCatalog(),
    bookmarks: [],
    heads,
    conflicts: [],
    issues: [],
    baseBookmarks: Object.create(null),
    visitCounts: Object.create(null),
    coveredVisits,
    visitEventIds,
  };
  for (const [key, options] of candidates) {
    if (options.length > 1) {
      state.conflicts.push({
        entityKey: key,
        reason: "multiple-heads",
        candidates: options,
        message: t("多个并发版本，必须明确选择后才能继续写入"),
      });
      continue;
    }
    if (key === "catalog:catalog") state.catalog = options[0].value as Catalog;
    else {
      const bookmark = options[0].value as Bookmark;
      state.baseBookmarks[bookmark.id] = bookmark;
      coveredVisits[bookmark.id] = options[0].coveredVisits ?? [];
      if (!options[0].removed) state.bookmarks.push(structuredClone(bookmark));
    }
  }
  const latest: Record<string, number> = Object.create(null);
  for (const e of events.values())
    for (const v of e.visits) {
      if (!versions.has(entityKey("bookmark", v.bookmarkId)))
        throw new LibraryError("CORRUPT", t("访问事件引用不存在的书签"));
      const history = (visitEventIds[v.bookmarkId] ??= []);
      if (!history.includes(e.eventId)) history.push(e.eventId);
      if (coveredVisits[v.bookmarkId]?.includes(e.eventId)) continue;
      state.visitCounts[v.bookmarkId] =
        (state.visitCounts[v.bookmarkId] ?? 0) + 1;
      latest[v.bookmarkId] = Math.max(latest[v.bookmarkId] ?? 0, v.usedAt);
    }
  for (const history of Object.values(visitEventIds)) history.sort();
  for (const bookmark of state.bookmarks) {
    bookmark.visits =
      (bookmark.visits ?? 0) + (state.visitCounts[bookmark.id] ?? 0);
    if (latest[bookmark.id] !== undefined)
      bookmark.lastUsed = Math.max(bookmark.lastUsed ?? 0, latest[bookmark.id]);
    const key = entityKey("bookmark", bookmark.id);
    const inTrash = bookmark.locations.some(
      (l) => l.groupId === TRASH_LOCATION.groupId,
    );
    if (
      !bookmark.locations.length ||
      bookmark.locations.some((l) => !hasLocation(state.catalog, l)) ||
      (bookmark.isDeleted === true ? !inTrash : inTrash)
    ) {
      state.conflicts.push({
        entityKey: key,
        reason: "invalid-locations",
        candidates: candidates.get(key)!,
        message: t("分类引用不存在或删除状态与回收站位置矛盾；请修复位置"),
      });
    }
  }
  state.bookmarks.sort((a, b) => a.id.localeCompare(b.id));
  if (state.conflicts.length) state.status = "conflicted";
  return state;
}
