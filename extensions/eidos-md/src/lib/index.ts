// What Search Project finds in one project (Raycast Extension REQ3): the blueprints, the top-level docs, the drafts,
// and the tasks, each read once through the CLI and then filtered on every keystroke the way `--search` filters, so
// typing runs no command; and the body-text hits `eidos search` finds, which do run one.
import { eidosJson, type Runner } from "./eidos";

export type Kind = "blueprint" | "doc" | "draft" | "task";

export interface Entry {
  kind: Kind;
  key: string;
  id: string | null;
  title: string;
  summary: string | null;
  // where it sits: a blueprint's collection and folder, a draft's collection, a task's status
  place: string | null;
  // the file, relative to the project
  file: string;
  // the page of the app it opens at
  route: string;
  properties: Record<string, unknown>;
  // a task's own fields, shown in its detail
  task?: {
    status: string;
    open: boolean;
    assignee: string[];
    description: string;
    checklists: Array<{ done: boolean; text: string }>;
  };
  // the words the row is found by, lowercased
  words: string;
}

export interface BodyHit {
  path: string;
  id: string | null;
  title: string;
  collection: string;
  folder: string | null;
  snippet: string;
  field: "title" | "summary" | "properties" | "body";
}

interface ListRow {
  id: string | null;
  title: string;
  summary: string | null;
  collection: string;
  folder?: string | null;
  group?: string | null;
  path: string;
  properties: Record<string, unknown>;
}

interface DraftRow {
  name: string;
  title: string;
  summary: string | null;
  id: string | null;
  collection: string;
  path: string;
}

interface TaskRow {
  name: string;
  id: string;
  file: string;
  href: string;
  title: string;
  status: string;
  open?: boolean;
  assignee: string[] | string | null;
  description?: string;
  properties: Record<string, unknown>;
  checklists?: Record<string, Array<{ done: boolean; text: string }>>;
}

interface FrameworkJson {
  top_level?: Array<{ title?: string; path: string; description?: string }>;
}

function encodeSegments(file: string): string {
  return file.split("/").map(encodeURIComponent).join("/");
}

function valuesOf(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(valuesOf);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(valuesOf);
  return [String(value)];
}

function wordsOf(...parts: unknown[]): string {
  return parts.flatMap(valuesOf).join("\n").toLowerCase();
}

function asList(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function blueprintEntry(row: ListRow): Entry {
  const folder = row.folder ?? row.group ?? null;
  return {
    kind: "blueprint",
    key: `blueprint:${row.path}`,
    id: row.id,
    title: row.title,
    summary: row.summary,
    place: folder ? `${row.collection}/${folder}` : row.collection,
    file: row.path,
    route: `/b/${encodeSegments(row.path)}`,
    properties: row.properties ?? {},
    words: wordsOf(row.id, row.title, row.summary, row.properties),
  };
}

// A top-level doc is named from .eidos/, one folder up: `../orientation.md` is the project's orientation.md.
export function docEntries(framework: FrameworkJson): Entry[] {
  const out: Entry[] = [];
  for (const doc of framework.top_level ?? []) {
    const file = /^\.\.\/([^/].*\.md)$/.exec(doc.path)?.[1];
    if (!file) continue;
    const title = doc.title || file;
    out.push({
      kind: "doc",
      key: `doc:${file}`,
      id: null,
      title,
      summary: doc.description ?? null,
      place: "Top-level docs",
      file,
      route: `/doc/${encodeSegments(file)}`,
      properties: {},
      words: wordsOf(title, doc.description),
    });
  }
  return out;
}

export function draftEntry(row: DraftRow): Entry {
  return {
    kind: "draft",
    key: `draft:${row.name}`,
    id: row.id,
    title: row.title,
    summary: row.summary,
    place: `Draft for ${row.collection}`,
    file: row.path,
    route: `/drafts/${encodeURIComponent(row.name)}`,
    properties: {},
    words: wordsOf(row.id, row.title, row.summary),
  };
}

export function taskEntry(row: TaskRow): Entry {
  const assignee = asList(row.assignee);
  return {
    kind: "task",
    key: `task:${row.name}`,
    id: row.id,
    title: row.title,
    summary: null,
    place: row.status,
    file: row.file,
    route: row.href,
    properties: row.properties ?? {},
    task: {
      status: row.status,
      open: row.open !== false,
      assignee,
      description: row.description ?? "",
      checklists: Object.values(row.checklists ?? {}).flat(),
    },
    words: wordsOf(row.id, row.title, row.status, assignee, row.properties),
  };
}

export interface ProjectIndex {
  blueprints: Entry[];
  docs: Entry[];
  drafts: Entry[];
  tasks: Entry[];
  // the parts that could not be read, shown beside what could
  unread: Array<{ part: string; message: string }>;
}

interface PluginRow {
  name: string;
  enabled: boolean;
}

export async function loadIndex(runner: Runner, root: string): Promise<ProjectIndex> {
  const unread: ProjectIndex["unread"] = [];
  async function part<T>(name: string, read: Promise<T>, empty: T): Promise<T> {
    try {
      return await read;
    } catch (cause) {
      unread.push({ part: name, message: cause instanceof Error ? cause.message : String(cause) });
      return empty;
    }
  }
  // the Backlog is a plugin a project may leave off, which is no failure; an eidos too old to list its plugins is
  // asked for the tasks anyway
  const backlogOn = eidosJson<PluginRow[]>(runner, root, ["plugin"]).then(
    (plugins) => plugins.some((plugin) => plugin.name === "backlog" && plugin.enabled),
    () => true,
  );
  const [list, framework, drafts, backlog] = await Promise.all([
    eidosJson<ListRow[]>(runner, root, ["list"]),
    part("The top-level docs", eidosJson<FrameworkJson>(runner, root, ["framework"]), {}),
    part("The drafts", eidosJson<{ drafts: DraftRow[] }>(runner, root, ["drafts"]), { drafts: [] }),
    backlogOn.then((on) =>
      on ? part("The tasks", eidosJson<{ tasks: TaskRow[] }>(runner, root, ["backlog"]), { tasks: [] }) : { tasks: [] },
    ),
  ]);
  return {
    blueprints: list.map(blueprintEntry),
    docs: docEntries(framework),
    drafts: drafts.drafts.map(draftEntry),
    tasks: backlog.tasks.map(taskEntry),
    unread,
  };
}

// `--search`'s rule: every word, in any case and any order, somewhere in what the row is found by.
export function matches(entry: Entry, query: string): boolean {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "");
  return words.every((word) => entry.words.includes(word));
}

export async function searchBodies(runner: Runner, root: string, query: string): Promise<BodyHit[]> {
  const words = query.split(/\s+/).filter((word) => word !== "");
  if (words.length === 0) return [];
  const answer = await eidosJson<{ hits: BodyHit[] }>(runner, root, ["search", ...words, "--limit", "30"]);
  return answer.hits;
}

// A snippet's match, marked in [ ] by the CLI, drawn bold in markdown. The CLI cuts the snippet from the raw body, so
// the heading marks and the emphasis marks at a word's edge are dropped first: half of an italic pair would otherwise
// show as a stray _ or *. A mark inside a word, as in snake_case, stays.
export function markedSnippet(snippet: string): string {
  const plain = snippet
    .replace(/(^|\s|…)#{1,6}\s+/g, "$1")
    .replace(/(^|[\s(…])[_*`~]+(?=\S)/g, "$1")
    .replace(/(\S)[_*`~]+(?=[\s).,;:!?\]…]|$)/g, "$1");
  return plain.replace(/\[([^\]]+)\]/g, "**$1**");
}
