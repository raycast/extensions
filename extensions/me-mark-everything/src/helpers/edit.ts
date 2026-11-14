/** Existing entities are edited against the immutable heads actually shown. */
import { Failure, getBookmark, type Entity, type Submission, type Session } from "../helper";
import type { Value } from "../core-api";
import type { EditBaseline, FormValues } from "../types";

import { singleUrl } from "./url";
export { singleUrl } from "./url";

export function eligible(entity: Entity) {
  if (entity.kind !== "bookmark" || entity.purged || entity.values.life !== "active")
    throw new Failure("NOT_EDITABLE", "This is not an active bookmark. Open the ME manager.");
  if (Object.keys(entity.conflicts).length || entity.structural.length)
    throw new Failure("CONFLICT", "This bookmark needs review in the ME manager.");
  if (!entity.heads.life?.length)
    throw new Failure("BASE_REQUIRED", "The bookmark has no life version. Open the ME manager.");
}

export function editBaseline(entity: Entity): EditBaseline {
  eligible(entity);
  const text = (field: string) => {
    const value = entity.values[field];
    if (value === undefined) return "";
    if (typeof value !== "string" || [...value].length > 100000)
      throw new Failure("INVALID", `Invalid stored ${field}. Open the ME manager.`);
    return value;
  };
  const place = entity.values.position;
  if (
    !place ||
    typeof place !== "object" ||
    typeof place.order !== "number" ||
    !Number.isFinite(place.order) ||
    !(place.parent === null || typeof place.parent === "string")
  )
    throw new Failure("INVALID", "Missing or invalid collection order. Open the ME manager.");
  if (entity.values.favorite !== undefined && typeof entity.values.favorite !== "boolean")
    throw new Failure("INVALID", "Invalid stored favorite. Open the ME manager.");
  for (const [field, value] of Object.entries(entity.values))
    if (field.startsWith("tag:") && typeof value !== "boolean")
      throw new Failure("INVALID", "Invalid stored tag membership. Open the ME manager.");
  return {
    link: singleUrl(text("url")),
    title: text("title"),
    note: text("note"),
    description: text("description"),
    favorite: entity.values.favorite === true,
    collection: place.parent === null ? "-1" : (place.parent as string),
    order: place.order,
    tags: Object.keys(entity.values)
      .filter((field) => field.startsWith("tag:") && entity.values[field] === true)
      .map((field) => field.slice(4)),
  };
}

export type TagChoices = {
  items: { _id: string; name: string }[];
  members: Record<string, string[]>;
  selected: string[];
};
export function usable(entity: Entity) {
  return (
    !entity.purged &&
    entity.values.life === "active" &&
    !Object.keys(entity.conflicts).length &&
    !entity.structural.length
  );
}

/** Resolve display aliases only; membership fields retain their original IDs. */
export function tagChoices(tags: Entity[], members: string[]): TagChoices {
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const canonical = (id: string): string => {
    const seen = new Set<string>();
    while (true) {
      const tag = byId.get(id);
      if (seen.has(id) || !tag || tag.kind !== "tag" || !usable(tag))
        throw new Failure("INVALID", "A selected tag is unavailable or has an invalid redirect. Open the ME manager.");
      seen.add(id);
      const redirect = tag.values.redirect;
      if (redirect === null || redirect === undefined) return id;
      if (typeof redirect !== "string" || !redirect)
        throw new Failure("INVALID", "Invalid tag redirect. Open the ME manager.");
      id = redirect;
    }
  };
  const mapping: Record<string, string[]> = {};
  for (const id of members) (mapping[canonical(id)] ??= []).push(id);
  const items = tags
    .filter((t) => t.kind === "tag" && usable(t) && t.values.redirect == null)
    .map((t) => ({
      _id: t.id,
      name: typeof t.values.name === "string" && t.values.name ? t.values.name : t.id,
    }));
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
  for (const item of items) if (counts.get(item.name)! > 1) item.name += ` (${item._id})`;
  return {
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    members: mapping,
    selected: Object.keys(mapping),
  };
}

export function prepareEdit(
  entity: Entity,
  baseline: EditBaseline,
  values: FormValues,
  commandId: string,
  session: Session,
  choices: { tags?: TagChoices; collections?: string[] },
): Submission | null {
  eligible(entity);
  const changes: Record<string, Value> = {};
  const base = structuredClone(entity.heads);
  const change = (field: string, value: Value) => {
    changes[field] = value;
    base[field] ??= [];
  };
  for (const field of ["title", "note", "description"] as const) {
    const value = values[field] ?? "";
    if (typeof value !== "string" || [...value].length > 100000)
      throw new Failure("INVALID", `${field} must contain at most 100000 characters.`);
    if (value !== baseline[field]) change(field, value);
  }
  if (values.link !== baseline.link) change("url", singleUrl(values.link));
  const favorite = values.favorite ?? false;
  if (typeof favorite !== "boolean") throw new Failure("INVALID", "Favorite must be a boolean.");
  if (favorite !== baseline.favorite) change("favorite", favorite);
  const collection = values.collection ?? baseline.collection;
  if (choices.collections && collection !== baseline.collection) {
    if (collection !== "-1" && !choices.collections.includes(collection))
      throw new Failure("INVALID", "Collection is unavailable.");
    change("position", { parent: collection === "-1" ? null : collection, order: baseline.order });
  }
  if (choices.tags) {
    const { items, members, selected } = choices.tags;
    const after = new Set(values.tags);
    for (const id of after) {
      if (!items.some((item) => item._id === id)) throw new Failure("INVALID", "Tag is unavailable.");
      if (!selected.includes(id)) change("tag:" + id, true);
    }
    for (const id of selected) if (!after.has(id)) for (const member of members[id]) change("tag:" + member, false);
  }
  if (!Object.keys(changes).length) return null;
  change("life", "active");
  return {
    session,
    command: {
      id: commandId,
      libraryId: session.libraryId,
      edits: [{ entity: entity.id, kind: "bookmark", base, values: changes }],
    },
  };
}

/** Trash is an edit of life only; form drafts never enter this command. */
export function prepareTrash(entity: Entity, commandId: string, session: Session): Submission {
  eligible(entity);
  return {
    session,
    command: {
      id: commandId,
      libraryId: session.libraryId,
      edits: [
        {
          entity: entity.id,
          kind: "bookmark",
          base: structuredClone(entity.heads),
          values: { life: "trashed" },
        },
      ],
    },
  };
}

/** Preflight warns about changed fields; it never substitutes newer heads. */
export async function preflightEdit(p: Submission) {
  const edit = p.command.edits[0];
  const current = await getBookmark(p.session, edit.entity);
  eligible(current);
  const changed = Object.keys(edit.values).filter(
    (field) =>
      field !== "life" &&
      JSON.stringify([...(current.heads[field] ?? [])].sort()) !==
        JSON.stringify([...(edit.base?.[field] ?? [])].sort()),
  );
  if (changed.length)
    throw new Failure(
      "STALE_EDIT",
      `Changed since opening: ${changed.join(", ")}. Input kept; reload or open the ME manager.`,
    );
}
