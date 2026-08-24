import { fetchJson, FetchOptions, Connectable } from "./client";
import { parseApiDate, sortableTime } from "./dates";
import { asEntityId, assignedToWhere, idWhere, searchWhere, SearchOptions } from "./queries";
import { Entity, EntityState } from "./types";
import { ROW_INCLUDE } from "./url";
import { EntityTypeInfo } from "./entityTypes";
import { GENERAL_INCLUDE, PAGE_SIZE, planSearch, SearchPlan } from "../filters/catalogue";

interface RawState {
  Id?: number;
  Name?: string;
  IsFinal?: boolean;
  NumericPriority?: number;
}

interface RawEntity {
  Id?: number;
  Name?: string;
  EntityType?: { Name?: string };
  EntityState?: RawState;
  Project?: { Name?: string };
  ModifyDate?: string;
}

interface Collection {
  Items?: RawEntity[];
}

function mapState(raw: RawState | undefined): EntityState | null {
  if (!raw || typeof raw.Id !== "number" || typeof raw.Name !== "string") return null;
  return {
    id: raw.Id,
    name: raw.Name,
    isFinal: raw.IsFinal === true,
    numericPriority: typeof raw.NumericPriority === "number" ? raw.NumericPriority : 0,
  };
}

/** Null for rows that cannot be opened or displayed, which are dropped rather than rendered blank. */
export function mapEntity(raw: RawEntity): Entity | null {
  if (typeof raw.Id !== "number" || typeof raw.Name !== "string") return null;
  return {
    id: raw.Id,
    name: raw.Name,
    type: raw.EntityType?.Name ?? "Unknown",
    state: mapState(raw.EntityState),
    projectName: raw.Project?.Name ?? null,
    modifyDate: raw.ModifyDate ? (parseApiDate(raw.ModifyDate)?.toISOString() ?? null) : null,
  };
}

export function mapCollection(data: Collection): Entity[] {
  return (data.Items ?? []).map(mapEntity).filter((item): item is Entity => item !== null);
}

export function byRecency(items: Entity[]): Entity[] {
  return [...items].sort((left, right) => sortableTime(right.modifyDate) - sortableTime(left.modifyDate));
}

export function applyPlan(items: Entity[], plan: SearchPlan): Entity[] {
  let result = items;
  if (plan.filterTypes) {
    const wanted = new Set(plan.filterTypes);
    result = result.filter((item) => wanted.has(item.type));
  }
  if (plan.filterFinalClientSide) {
    // Stateless entities survive: "hide closed items" has nothing to say about a Release.
    result = result.filter((item) => item.state === null || !item.state.isFinal);
  }
  return result.slice(0, PAGE_SIZE);
}

export interface SearchResult {
  exact: Entity | null;
  matches: Entity[];
}

/** Numeric queries run both paths: digits are a plausible ID and a plausible substring of a title. */
export async function search(
  instance: Connectable,
  query: string,
  options: { types: string[]; catalogue: EntityTypeInfo[]; includeFinal?: boolean } & FetchOptions,
): Promise<SearchResult> {
  const term = query.trim();
  if (term.length === 0) return { exact: null, matches: [] };

  const id = asEntityId(term);
  const [exact, matches] = await Promise.all([
    id === null ? Promise.resolve(null) : getAnyById(instance, id, options),
    byName(instance, term, options),
  ]);

  return { exact, matches: exact ? matches.filter((item) => item.id !== exact.id) : matches };
}

export async function byName(
  instance: Connectable,
  term: string,
  options: { types: string[]; catalogue: EntityTypeInfo[]; includeFinal?: boolean } & FetchOptions,
): Promise<Entity[]> {
  const plan = planSearch(options.types, options.includeFinal === true, options.catalogue);
  if (plan.filterTypes?.length === 0) return [];

  const { data } = await fetchJson<Collection>(
    instance,
    `api/v1/${plan.collection}`,
    {
      take: plan.take,
      include: plan.collection === "Generals" ? GENERAL_INCLUDE : ROW_INCLUDE,
      where: searchWhere(term, { includeFinal: !plan.excludeFinalInQuery }),
    },
    options,
  );

  return applyPlan(byRecency(mapCollection(data)), plan);
}

/**
 * General rather than Assignables, so a Release or Project ID resolves too. A miss is an empty
 * result rather than an error: every prefix of a real ID is a miss while the user is still typing.
 */
export async function getAnyById(
  instance: Connectable,
  id: number,
  options: FetchOptions = {},
): Promise<Entity | null> {
  try {
    const { data } = await fetchJson<Collection>(
      instance,
      "api/v1/Generals",
      { take: 1, include: GENERAL_INCLUDE, where: idWhere(id) },
      options,
    );
    const [first] = mapCollection(data);
    return first ?? null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (isNotFound(error)) return null;
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "kind" in error && error.kind === "not-found";
}

export async function assignedTo(
  instance: Connectable,
  userId: number,
  options: SearchOptions & FetchOptions = {},
): Promise<Entity[]> {
  const { data } = await fetchJson<Collection>(
    instance,
    "api/v1/Assignables",
    { take: PAGE_SIZE, include: ROW_INCLUDE, where: assignedToWhere(userId, options) },
    options,
  );
  return byRecency(mapCollection(data));
}

export interface StateGroup {
  key: string;
  title: string;
  items: Entity[];
}

/** Ordered by NumericPriority, not name: alphabetical would put "Done" before "In Progress". */
export function groupByState(items: Entity[]): StateGroup[] {
  const groups = new Map<string, { order: number; title: string; items: Entity[] }>();

  for (const item of items) {
    const key = item.state ? String(item.state.id) : "none";
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      order: item.state ? item.state.numericPriority : Number.POSITIVE_INFINITY,
      title: item.state ? item.state.name : "No State",
      items: [item],
    });
  }

  return [...groups.entries()]
    .sort(([, left], [, right]) => left.order - right.order || left.title.localeCompare(right.title))
    .map(([key, group]) => ({ key, title: group.title, items: group.items }));
}
