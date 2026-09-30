import { LinearClient } from "@linear/sdk";

import { getLinearClient } from "../api/linearClient";

export type CursorPageInput = {
  limit?: number;
  cursor?: string;
};

export type PageInput = {
  limit?: number;
  cursor?: string;
  orderBy?: "createdAt" | "updatedAt";
};

export type ContentPatch =
  | { op: "replace"; old_string: string; new_string: string; replace_all?: boolean }
  | { op: "insert_before"; anchor: string; text: string }
  | { op: "insert_after"; anchor: string; text: string }
  | { op: "prepend"; text: string }
  | { op: "append"; text: string }
  | { op: "replace_range"; from: string; to: string; new_string: string };

type Entity = object;
type Connection<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } };

export function client(): LinearClient {
  return getLinearClient().linearClient;
}

export async function collect<T>(
  fetchPage: (variables: { first: number; after?: string }) => Promise<Connection<T>>,
  input: PageInput = {},
): Promise<{ nodes: T[]; nextCursor?: string }> {
  return collectFiltered(fetchPage, () => true, input);
}

/** Collects full API pages until enough matching entities are found, preserving a cursor after every scanned entity. */
export async function collectFiltered<T>(
  fetchPage: (variables: { first: number; after?: string }) => Promise<Connection<T>>,
  predicate: (entity: T) => boolean | Promise<boolean>,
  input: PageInput = {},
): Promise<{ nodes: T[]; nextCursor?: string }> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 250);
  const result: T[] = [];
  let cursor = input.cursor;
  let hasNextPage = false;

  while (result.length < limit) {
    const page = await fetchPage({ first: Math.min(100, limit - result.length), after: cursor });
    for (const entity of page.nodes) {
      if (await predicate(entity)) result.push(entity);
    }
    cursor = page.pageInfo.endCursor ?? undefined;
    hasNextPage = page.pageInfo.hasNextPage;
    if (!hasNextPage || page.nodes.length === 0) break;
  }

  return { nodes: result, nextCursor: hasNextPage ? cursor : undefined };
}

function comparableValues(entity: Entity): string[] {
  const record = entity as Record<string, unknown>;
  return ["id", "identifier", "slugId", "name", "title", "key", "email", "displayName"]
    .map((key) => record[key])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());
}

export function findExact<T extends Entity>(entities: T[], query: string, kind: string): T {
  const normalized = query.toLowerCase();
  const matches = entities.filter((entity) => comparableValues(entity).includes(normalized));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Multiple ${kind} records match "${query}". Use an ID.`);
  throw new Error(`No ${kind} found for "${query}".`);
}

export async function tryGet<T>(get: () => Promise<T>): Promise<T | undefined> {
  try {
    return await get();
  } catch {
    return undefined;
  }
}

export async function resolveFrom<T extends Entity>(
  query: string,
  kind: string,
  byId: (id: string) => Promise<T>,
  list: () => Promise<T[]>,
): Promise<T> {
  try {
    const entity = await byId(query);
    if ("id" in entity) return entity;
  } catch {
    // Human-readable identifiers and names are resolved below.
  }
  return findExact(await list(), query, kind);
}

export async function resolveIssue(query: string) {
  return resolveFrom(
    query,
    "issue",
    (id) => client().issue(id),
    async () => (await client().issues({ first: 250 })).nodes,
  );
}

export async function resolveProject(query: string) {
  return resolveFrom(
    query,
    "project",
    (id) => client().project(id),
    async () => (await client().projects({ first: 250 })).nodes,
  );
}

export async function resolveInitiative(query: string) {
  return resolveFrom(
    query,
    "initiative",
    (id) => client().initiative(id),
    async () => (await client().initiatives({ first: 250 })).nodes,
  );
}

export async function resolveTeam(query: string) {
  return resolveFrom(
    query,
    "team",
    (id) => client().team(id),
    async () => (await client().teams({ first: 250 })).nodes,
  );
}

export async function resolveUser(query: string) {
  if (query.toLowerCase() === "me") return client().viewer;
  return resolveFrom(
    query,
    "user",
    (id) => client().user(id),
    async () => (await client().users({ first: 250 })).nodes,
  );
}

export async function resolveDocument(query: string) {
  return resolveFrom(
    query,
    "document",
    (id) => client().document(id),
    async () => (await client().documents({ first: 250 })).nodes,
  );
}

export async function resolveReleasePipeline(query: string) {
  return resolveFrom(
    query,
    "release pipeline",
    (id) => client().releasePipeline(id),
    async () => (await client().releasePipelines({ first: 250 })).nodes,
  );
}

export async function resolveRelease(query: string) {
  return resolveFrom(
    query,
    "release",
    (id) => client().release(id),
    async () => (await client().releases({ first: 250 })).nodes,
  );
}

export async function resolveCycle(query: string, teamQuery?: string) {
  const team = teamQuery ? await resolveTeam(teamQuery) : undefined;
  const cycles = team ? (await team.cycles({ first: 250 })).nodes : (await client().cycles({ first: 250 })).nodes;
  const numericQuery = Number(query);
  const matches = cycles.filter(
    (cycle) =>
      comparableValues(cycle).includes(query.toLowerCase()) ||
      (Number.isFinite(numericQuery) && cycle.number === numericQuery),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Multiple cycles match "${query}". Pass a team to disambiguate.`);
  throw new Error(`No cycle found for "${query}".`);
}

export async function resolveMilestone(projectQuery: string, milestoneQuery: string) {
  const project = await resolveProject(projectQuery);
  const milestones = (await project.projectMilestones({ first: 250 })).nodes;
  return findExact(milestones, milestoneQuery, "project milestone");
}

export async function resolveIssueLabel(query: string) {
  return resolveFrom(
    query,
    "issue label",
    (id) => client().issueLabel(id),
    async () => (await client().issueLabels({ first: 250 })).nodes,
  );
}

export async function resolveProjectLabel(query: string) {
  return resolveFrom(
    query,
    "project label",
    (id) => client().projectLabel(id),
    async () => (await client().projectLabels({ first: 250 })).nodes,
  );
}

export async function resolveInitiativeLabel(query: string) {
  return resolveFrom(
    query,
    "initiative label",
    (id) => client().initiativeLabel(id),
    async () => (await client().initiativeLabels({ first: 250 })).nodes,
  );
}

export async function resolveProjectStatus(query: string) {
  return resolveFrom(
    query,
    "project status",
    (id) => client().projectStatus(id),
    async () => (await client().projectStatuses({ first: 250 })).nodes,
  );
}

export function afterDate(value?: string): Date | undefined {
  if (!value) return undefined;
  if (/^-P\d+D$/.test(value)) {
    const days = Number(value.slice(2, -1));
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date or duration: "${value}".`);
  return date;
}

export async function resolveReleaseNote(query: string) {
  return resolveFrom(
    query,
    "release note",
    (id) => client().releaseNote(id),
    async () => (await client().releaseNotes({ first: 250 })).nodes,
  );
}

export function applyPatch(content: string, patches: ContentPatch[]): string {
  return patches.reduce((current, patch) => {
    if (patch.op === "prepend") return patch.text + current;
    if (patch.op === "append") return current + patch.text;
    if (patch.op === "replace") {
      const occurrences = current.split(patch.old_string).length - 1;
      if (occurrences === 0) throw new Error(`Patch text was not found: "${patch.old_string}".`);
      if (!patch.replace_all && occurrences !== 1)
        throw new Error(`Patch text must match exactly once: "${patch.old_string}".`);
      return patch.replace_all
        ? current.replaceAll(patch.old_string, patch.new_string)
        : current.replace(patch.old_string, patch.new_string);
    }
    if (patch.op === "insert_before" || patch.op === "insert_after") {
      const occurrences = current.split(patch.anchor).length - 1;
      if (occurrences !== 1) throw new Error(`Patch anchor must match exactly once: "${patch.anchor}".`);
      return patch.op === "insert_before"
        ? current.replace(patch.anchor, patch.text + patch.anchor)
        : current.replace(patch.anchor, patch.anchor + patch.text);
    }
    const fromIndex = current.indexOf(patch.from);
    if (fromIndex < 0 || current.indexOf(patch.from, fromIndex + 1) >= 0) {
      throw new Error(`Patch start must match exactly once: "${patch.from}".`);
    }
    const toIndex = current.indexOf(patch.to, fromIndex + patch.from.length);
    if (toIndex < 0 || current.indexOf(patch.to, toIndex + 1) >= 0) {
      throw new Error(`Patch end must match exactly once after the start: "${patch.to}".`);
    }
    return current.slice(0, fromIndex) + patch.new_string + current.slice(toIndex);
  }, content);
}

export function pick<T extends object, K extends keyof T>(entity: T, fields: readonly K[]): Pick<T, K> {
  return Object.fromEntries(fields.map((field) => [field, entity[field]])) as Pick<T, K>;
}

export async function mutationResult<T extends { success: boolean }>(payload: T, entityKey: keyof T) {
  const value = payload[entityKey];
  return { success: payload.success, entity: value instanceof Promise ? await value : value };
}
