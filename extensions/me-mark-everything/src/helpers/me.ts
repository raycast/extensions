/**
 * Maps ME protocol entities to the view shapes the reused Raindrop UI expects.
 * All reads go through the installed ME helper; no library file is touched here.
 */
import type { Entity, Query, QueryResult } from "../helper";
import type { Bookmark, Collection, CollectionsResponse } from "../types";
import collectionIconFiles from "../../assets/collection-icons.json";

const collectionIcons = new Set(collectionIconFiles.map((name) => `assets/collection-icons/${name}`));

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** `query` adds display-only fields to the entity: tag names and a candidate flag. */
type BookmarkEntity = QueryResult["items"][number];

function positionParent(entity: Entity): string | null {
  const position = entity.values.position;
  if (!position || typeof position !== "object" || Array.isArray(position)) return null;
  const parent = (position as { parent?: unknown }).parent;
  return typeof parent === "string" ? parent : null;
}

/**
 * The dropdown keeps the upstream Raindrop sentinels so its component stays
 * unchanged: 0 = all, -1 = unsorted, -99 = trash, otherwise a collection id.
 */
export function collectionQuery(value: string): Query {
  if (value === "-99") return { trash: true };
  if (value === "-1") return { collection: null };
  if (!value || value === "0") return {};
  return { collection: value, descendants: true };
}

export function toCollection(entity: Entity): Collection {
  const icon = entity.values.icon;
  const cover =
    typeof icon === "string" && collectionIcons.has(icon) ? icon.slice("assets/".length) : undefined;
  return {
    _id: entity.id,
    title: text(entity.values.name),
    ...(typeof cover === "string" && cover ? { cover: [cover] } : {}),
    parent: { $id: positionParent(entity) },
  };
}

export function toCollections(entities: Entity[]): CollectionsResponse {
  return { result: true, items: entities.map(toCollection) };
}

export function toBookmark(entity: BookmarkEntity, collectionNames: Map<string, string>): Bookmark {
  const link = text(entity.values.url);
  const parent = positionParent(entity);
  return {
    _id: entity.id,
    life: text(entity.values.life),
    title: text(entity.values.title) || link,
    link,
    tags: entity.tags,
    note: text(entity.values.note),
    excerpt: text(entity.values.description),
    type: text(entity.values.type) || "link",
    important: entity.values.favorite === true,
    collection: { $id: parent, title: (parent && collectionNames.get(parent)) || "Unsorted" },
    conflicts: Object.keys(entity.conflicts),
    structural: entity.structural.length,
    candidateMatch: entity.candidateMatch,
  };
}
