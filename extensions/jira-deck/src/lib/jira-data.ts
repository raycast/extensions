import { getPreferenceValues } from "@raycast/api";
import { markdownToAdf } from "./adf";
import {
  Board,
  BoardColumn,
  Choice,
  Created,
  FieldErrors,
  Issue,
  IssueGroup,
  IssueLink,
  IssuePage,
  IssueTypeChoice,
  IssueScope,
  MoreIssues,
  NewIssue,
  ParentChoice,
  Space,
  SpaceActivity,
  SprintChoice,
  StatusCategory,
  TypeFields,
  User,
} from "./issue";
import { agilePages, jira, JiraError, jqlString, myIssuesJql, SetupError, siteOrigin } from "./jira";

// The extension's data from Jira Cloud. Views get it through source.ts.

/** Upper bound on issues per view, so a huge board can't fill memory. Counts say "loaded" past it. */
const MAX_ISSUES = 500;
const MAX_BOARDS = 1000;

const BASE_FIELDS = [
  "summary",
  "issuetype",
  "status",
  "priority",
  "assignee",
  "reporter",
  "parent",
  "issuelinks",
  "created",
  "updated",
];

interface JiraUser {
  accountId: string;
  displayName: string;
  active?: boolean;
}

interface JiraLinkedIssue {
  key: string;
  fields?: { summary?: string; status?: { name?: string } };
}

/** One side is set: the other issue, with the relation read from this issue's side. */
interface JiraLink {
  type?: { inward?: string; outward?: string };
  inwardIssue?: JiraLinkedIssue;
  outwardIssue?: JiraLinkedIssue;
}

function toLinks(links: JiraLink[] | undefined, origin: string): IssueLink[] | undefined {
  const result = (links ?? []).flatMap((link) => {
    const other = link.outwardIssue ?? link.inwardIssue;
    if (!other) return [];
    const relation = (link.outwardIssue ? link.type?.outward : link.type?.inward) ?? "Linked to";
    return [
      {
        relation: relation.charAt(0).toUpperCase() + relation.slice(1),
        key: other.key,
        summary: other.fields?.summary ?? "",
        status: other.fields?.status?.name ?? "",
        url: `${origin}/browse/${other.key}`,
      },
    ];
  });
  return result.length ? result : undefined;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    issuetype?: { name: string };
    status?: { id?: string; name: string; statusCategory?: { key: string } };
    priority?: { name: string } | null;
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
    parent?: { key: string; fields?: { summary?: string; issuetype?: { name?: string; hierarchyLevel?: number } } };
    /** Company-managed spaces on the Agile API. */
    epic?: { key: string; name?: string; summary?: string } | null;
    issuelinks?: JiraLink[];
    created: string;
    updated: string;
    [field: string]: unknown;
  };
}

interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: { projectKey?: string; projectName?: string };
}

interface JiraSprint {
  id: number;
  name: string;
  state?: string;
  startDate?: string;
  endDate?: string;
}

const CATEGORIES: Record<string, StatusCategory> = { new: "todo", indeterminate: "inProgress", done: "done" };

// Looked up once per launch. Story points live in a custom field whose ID differs per site.
let storyPointsField: Promise<string | undefined> | undefined;

function getStoryPointsField(): Promise<string | undefined> {
  storyPointsField ??= jira<{ id: string; name: string; schema?: { type?: string } }[]>("/rest/api/3/field")
    .then(
      (fields) =>
        fields.find((field) => /^story point(s| estimate)$/i.test(field.name) && field.schema?.type === "number")?.id,
    )
    .catch(() => undefined);
  return storyPointsField;
}

async function issueFields(agile: boolean): Promise<string> {
  const points = await getStoryPointsField();
  return [...BASE_FIELDS, ...(agile ? ["epic"] : []), ...(points ? [points] : [])].join(",");
}

function toUser(user?: JiraUser | null): User | undefined {
  return user ? { accountId: user.accountId, displayName: user.displayName } : undefined;
}

function toIssue(raw: JiraIssue, origin: string, pointsField?: string): Issue {
  const { fields } = raw;
  const parentType = fields.parent?.fields?.issuetype;
  const parentIsEpic = parentType?.hierarchyLevel === 1 || parentType?.name === "Epic";
  const epic =
    fields.parent && parentIsEpic
      ? { key: fields.parent.key, summary: fields.parent.fields?.summary ?? "" }
      : fields.epic
        ? { key: fields.epic.key, summary: fields.epic.summary ?? fields.epic.name ?? "" }
        : undefined;
  const points = pointsField ? fields[pointsField] : undefined;

  return {
    id: raw.id,
    key: raw.key,
    summary: fields.summary ?? "",
    issueType: fields.issuetype?.name ?? "Issue",
    status: {
      id: fields.status?.id,
      name: fields.status?.name ?? "Unknown",
      category: CATEGORIES[fields.status?.statusCategory?.key ?? ""] ?? "todo",
    },
    priority: fields.priority?.name,
    assignee: toUser(fields.assignee),
    reporter: toUser(fields.reporter),
    epic,
    parent:
      fields.parent && !parentIsEpic
        ? {
            key: fields.parent.key,
            summary: fields.parent.fields?.summary ?? "",
            issueType: parentType?.name ?? "Issue",
            url: `${origin}/browse/${fields.parent.key}`,
          }
        : undefined,
    links: toLinks(fields.issuelinks, origin),
    storyPoints: typeof points === "number" ? points : undefined,
    created: fields.created,
    updated: fields.updated,
    url: `${origin}/browse/${raw.key}`,
  };
}

function origin(): string {
  // jira() already refused to run without a site, so this is set by the time it's used.
  return siteOrigin() ?? "";
}

// The signed-in user, asked once per launch and account: lists, suggestions and searches all need it.
const myself = new Map<string, Promise<User>>();

export function getMyself(): Promise<User> {
  const key = `${origin()}|${getPreferenceValues<Preferences>().email?.trim() ?? ""}`;
  let me = myself.get(key);
  if (!me) {
    me = jira<JiraUser>("/rest/api/3/myself").then((user) => ({
      accountId: user.accountId,
      displayName: user.displayName,
    }));
    // A failure is asked again next time, after the user fixed their preferences.
    me.catch(() => myself.delete(key));
    myself.set(key, me);
  }
  return me;
}

function toBoard(board: JiraBoard): Board {
  return {
    id: String(board.id),
    name: board.name,
    type: board.type === "kanban" ? "kanban" : board.type === "simple" ? "simple" : "scrum",
    spaceKey: board.location?.projectKey,
    spaceName: board.location?.projectName,
  };
}

/** Only the boards this account can see. Jira filters them by permission. */
export async function getBoards(): Promise<Board[]> {
  const { items } = await agilePages<JiraBoard>("/rest/agile/1.0/board", "values", MAX_BOARDS);
  return items.map(toBoard).sort((a, b) => a.name.localeCompare(b.name));
}

export function getBoardUrl(board: Board): string | undefined {
  const site = siteOrigin();
  return site ? `${site}/secure/RapidBoard.jspa?rapidView=${encodeURIComponent(board.id)}` : undefined;
}

/**
 * Spaces the user worked in over the last 30 days, busiest first, then the ones Jira says they viewed lately.
 * Only for suggesting boards, so one page of issues is enough.
 */
export async function getSpaceActivity(): Promise<SpaceActivity[]> {
  const me = jqlString((await getMyself()).accountId);
  const [search, recent] = await Promise.all([
    jira<{ issues: { fields: { project?: { key: string } } }[] }>("/rest/api/3/search/jql", {
      method: "POST",
      body: {
        jql: `(assignee = ${me} OR reporter = ${me} OR watcher = ${me}) AND updated >= -30d`,
        fields: ["project"],
        maxResults: 100,
      },
    }),
    jira<{ key: string }[]>("/rest/api/3/project/recent", { query: { maxResults: 20 } }).catch(() => []),
  ]);
  const counts = new Map<string, number>();
  for (const { fields } of search.issues) {
    if (fields.project) counts.set(fields.project.key, (counts.get(fields.project.key) ?? 0) + 1);
  }
  for (const { key } of recent) if (!counts.has(key)) counts.set(key, 0);
  return [...counts].map(([spaceKey, issues]) => ({ spaceKey, issues })).sort((a, b) => b.issues - a.issues);
}

async function findBoard(boardId: string): Promise<Board | undefined> {
  try {
    return toBoard(await jira<JiraBoard>(`/rest/agile/1.0/board/${encodeURIComponent(boardId)}`));
  } catch (error) {
    if (error instanceof JiraError && (error.status === 403 || error.status === 404)) return undefined;
    throw error;
  }
}

const MISSING_BOARD = "This board was deleted, or your Jira account can't see it anymore.";

function boardNotice(title: string, notice: string, board?: Board): IssueScope {
  return { title, issues: [], complete: true, board, notice };
}

/** Issues per page of a list that loads more as it's scrolled. */
const PAGE_SIZE = 100;

/** Where a paged list continues. Kept as a string, so Raycast can cache it with the list. */
type Cursor =
  | { kind: "agile"; path: string; query: Record<string, string>; startAt: number }
  | { kind: "search"; jql: string; token: string };

async function boardIssues(
  path: string,
  query: Record<string, string> = {},
  { startAt = 0, limit = MAX_ISSUES } = {},
): Promise<{ issues: Issue[]; complete: boolean; cursor?: string }> {
  const [fields, pointsField] = await Promise.all([issueFields(true), getStoryPointsField()]);
  const { items, complete, next } = await agilePages<JiraIssue>(path, "issues", limit, { ...query, fields }, startAt);
  const site = origin();
  const cursor: Cursor | undefined = next === undefined ? undefined : { kind: "agile", path, query, startAt: next };
  return {
    issues: items.map((issue) => toIssue(issue, site, pointsField)),
    complete,
    cursor: cursor && JSON.stringify(cursor),
  };
}

/** The first page of one Agile API list, for views that load the rest as they're scrolled. */
function firstPage(path: string, query: Record<string, string> = {}) {
  return boardIssues(path, query, { limit: PAGE_SIZE });
}

/** Search issues, one page at a time. */
async function searchIssues(jql: string, nextPageToken?: string): Promise<MoreIssues> {
  const [fields, pointsField] = await Promise.all([issueFields(false), getStoryPointsField()]);
  const page = await jira<{ issues: JiraIssue[]; nextPageToken?: string }>("/rest/api/3/search/jql", {
    method: "POST",
    body: { jql, fields: fields.split(","), maxResults: PAGE_SIZE, nextPageToken },
  });
  const site = origin();
  const cursor: Cursor | undefined = page.nextPageToken
    ? { kind: "search", jql, token: page.nextPageToken }
    : undefined;
  return {
    issues: page.issues.map((issue) => toIssue(issue, site, pointsField)),
    cursor: cursor && JSON.stringify(cursor),
  };
}

/** Issues by key, in the order given. Keys the account can't see are left out. */
export async function getIssuesByKey(keys: string[]): Promise<Issue[]> {
  if (!keys.length) return [];
  const { issues } = await searchIssues(`key in (${keys.map(jqlString).join(", ")})`);
  const byKey = new Map(issues.map((issue) => [issue.key, issue]));
  return keys.flatMap((key) => byKey.get(key) ?? []);
}

/** The next page of a view, from the cursor its previous page gave. */
export async function getMoreIssues(cursor: string): Promise<MoreIssues> {
  const at = JSON.parse(cursor) as Cursor;
  if (at.kind === "search") return searchIssues(at.jql, at.token);
  const { issues, cursor: next } = await boardIssues(at.path, at.query, { startAt: at.startAt, limit: PAGE_SIZE });
  return { issues, cursor: next };
}

/** A board's sprints in one state. Undefined when the board doesn't use sprints: team-managed ones answer 400. */
async function sprints(board: Board, state: "active" | "future"): Promise<JiraSprint[] | undefined> {
  if (board.type === "kanban") return undefined;
  try {
    const { items } = await agilePages<JiraSprint>(`/rest/agile/1.0/board/${board.id}/sprint`, "values", 10, { state });
    return items;
  } catch (error) {
    if (error instanceof JiraError && error.status === 400) return undefined;
    throw error;
  }
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * What a board is working on, whatever kind it is:
 * the running sprints, the next sprint and backlog between sprints, or the open issues of a board without sprints.
 */
/**
 * The board's columns, left to right, without a Kanban board's Backlog column, which Jira shows apart from the board.
 * Undefined when Jira won't say, like for a token without the board configuration scope: then every status counts.
 */
async function boardColumns(board: Board): Promise<BoardColumn[] | undefined> {
  try {
    const config = await jira<{ columnConfig?: { columns?: { name: string; statuses?: { id: string }[] }[] } }>(
      `/rest/agile/1.0/board/${encodeURIComponent(board.id)}/configuration`,
    );
    const columns = (config.columnConfig?.columns ?? [])
      .map((column) => ({ name: column.name, statusIds: (column.statuses ?? []).map((status) => status.id) }))
      .filter((column) => column.statusIds.length > 0);
    if (board.type === "kanban" && columns[0]?.name.trim().toLowerCase() === "backlog") columns.shift();
    return columns.length ? columns : undefined;
  } catch (error) {
    if (error instanceof SetupError || (error instanceof JiraError && (error.status ?? 0) < 500)) return undefined;
    throw error;
  }
}

export async function getBoardIssues(boardId: string): Promise<IssuePage> {
  const board = await findBoard(boardId);
  if (!board) return { scope: boardNotice("Board", MISSING_BOARD) };

  const [active, columns] = await Promise.all([sprints(board, "active"), boardColumns(board)]);
  if (!active) {
    // What the board shows: its columns' statuses, with done issues dropping off after two weeks like in Jira.
    const statusIds = columns?.flatMap((column) => column.statusIds) ?? [];
    const jql = statusIds.length
      ? `status in (${statusIds.map(jqlString).join(", ")}) AND (statusCategory != Done OR statusCategoryChangedDate >= -14d)`
      : // Without the columns, resolved issues count as finished too: statuses like "Dropped" or "Won't Do" set a
        // resolution even when Jira files them under another category.
        "((statusCategory != Done AND resolution is EMPTY) OR statusCategoryChangedDate >= -14d OR resolved >= -14d)";
    const { issues, cursor } = await firstPage(`/rest/agile/1.0/board/${board.id}/issue`, { jql });
    return { scope: { title: board.name, issues, complete: true, board, columns }, cursor };
  }

  if (active.length === 1) {
    const sprint = { id: String(active[0].id), name: active[0].name };
    const { issues, cursor } = await firstPage(`/rest/agile/1.0/board/${board.id}/sprint/${sprint.id}/issue`);
    const scope = { title: `${board.name} · ${sprint.name}`, issues, complete: true, board, sprint, columns };
    return { scope, cursor };
  }

  // Several lists in one view, so they load whole rather than page by page.
  if (active.length) {
    const loaded = await Promise.all(
      active.map((sprint) => boardIssues(`/rest/agile/1.0/board/${board.id}/sprint/${sprint.id}/issue`)),
    );
    const issues = loaded.flatMap((part) => part.issues);
    const complete = loaded.every((part) => part.complete);
    const sprint = { id: String(active[0].id), name: active[0].name };
    // Parallel sprints: each gets its own sections.
    const groups: IssueGroup[] = active.map((entry, index) => ({
      title: entry.name,
      issues: loaded[index].issues,
      byStatus: true,
    }));
    const title = `${board.name} · ${active.length} sprints`;
    return { scope: { title, issues, complete, board, sprint, groups } };
  }

  // Between sprints: what's planned next, then the backlog.
  const [future, backlog] = await Promise.all([
    sprints(board, "future"),
    boardIssues(`/rest/agile/1.0/board/${board.id}/backlog`),
  ]);
  const next = future?.[0];
  const groups: IssueGroup[] = [];
  let complete = backlog.complete;
  if (next) {
    const planned = await boardIssues(`/rest/agile/1.0/board/${board.id}/sprint/${next.id}/issue`);
    complete &&= planned.complete;
    groups.push({
      title: `Next: ${next.name}`,
      subtitle: next.startDate ? `starts ${shortDate(next.startDate)}` : undefined,
      issues: planned.issues,
      byStatus: false,
    });
  }
  groups.push({ title: "Backlog", issues: backlog.issues, byStatus: false });
  const issues = groups.flatMap((group) => group.issues);
  return { scope: { title: `${board.name} · No sprint running`, issues, complete, board, groups } };
}

export async function getBacklogIssues(boardId: string): Promise<IssuePage> {
  const board = await findBoard(boardId);
  if (!board) return { scope: boardNotice("Backlog", MISSING_BOARD) };

  try {
    const { issues, cursor } = await firstPage(`/rest/agile/1.0/board/${board.id}/backlog`);
    return { scope: { title: `${board.name} · Backlog`, issues, complete: true, board }, cursor };
  } catch (error) {
    // Kanban boards without a backlog answer 400.
    if (error instanceof JiraError && error.status === 400) {
      return { scope: boardNotice(board.name, `${board.name} doesn't have a backlog.`, board) };
    }
    throw error;
  }
}

export async function getMyIssues(): Promise<IssuePage> {
  const me = await getMyself();
  const { issues, cursor } = await searchIssues(myIssuesJql(me.accountId));
  return { scope: { title: "My Issues", issues, complete: true }, cursor };
}

async function assignable(query: Record<string, string>): Promise<User[]> {
  const users = await jira<JiraUser[]>("/rest/api/3/user/assignable/search", {
    query: { ...query, maxResults: 100 },
  });
  return users.filter((user) => user.active !== false).map((user) => toUser(user) as User);
}

export function getAssignableUsers(issue: Issue): Promise<User[]> {
  return assignable({ issueKey: issue.key });
}

export async function assignIssue(issue: Issue, user?: User): Promise<void> {
  await jira(`/rest/api/3/issue/${encodeURIComponent(issue.key)}/assignee`, {
    method: "PUT",
    body: { accountId: user?.accountId ?? null },
  });
}

/** Spaces this account can create issues in. */
export async function getSpaces(): Promise<Space[]> {
  const spaces: Space[] = [];
  for (;;) {
    const page = await jira<{ values: Space[]; isLast?: boolean }>("/rest/api/3/project/search", {
      query: { action: "create", orderBy: "name", startAt: spaces.length, maxResults: 50 },
    });
    spaces.push(...page.values.map(({ id, key, name }) => ({ id, key, name })));
    if (page.isLast !== false || page.values.length === 0 || spaces.length >= 500) return spaces;
  }
}

type CreateMetaType = Choice & { subtask?: boolean; hierarchyLevel?: number };

export async function getCreateOptions(spaceKey: string): Promise<{ issueTypes: IssueTypeChoice[] }> {
  const meta = await jira<{ issueTypes?: CreateMetaType[]; values?: CreateMetaType[] }>(
    `/rest/api/3/issue/createmeta/${encodeURIComponent(spaceKey)}/issuetypes`,
    { query: { maxResults: 100 } },
  );
  const issueTypes = (meta.issueTypes ?? meta.values ?? []).map(({ id, name, subtask, hierarchyLevel }) => ({
    id,
    name,
    // Older sites leave the level out.
    level: hierarchyLevel ?? (subtask ? -1 : name.toLowerCase() === "epic" ? 1 : 0),
  }));
  return { issueTypes };
}

interface FieldMeta {
  fieldId: string;
  name: string;
  required: boolean;
  hasDefaultValue?: boolean;
  allowedValues?: Choice[];
  defaultValue?: Choice;
  schema?: { custom?: string };
}

// Fields the form fills in, or that Jira fills in itself.
const HANDLED_FIELDS = new Set([
  "project",
  "issuetype",
  "summary",
  "description",
  "priority",
  "assignee",
  "reporter",
  "parent",
  "labels",
  "duedate",
]);
// The sprint is set through the Agile API after creating, whatever its field is called.
const SPRINT_FIELD = "com.pyxis.greenhopper.jira:gh-sprint";

/** The space's priority scheme default, for create screens that don't say which priority is the default. */
async function schemeDefaultPriority(spaceKey: string): Promise<string | undefined> {
  try {
    const project = await jira<{ id: string }>(`/rest/api/3/project/${encodeURIComponent(spaceKey)}`);
    const page = await jira<{ values: { id: string; isDefault?: boolean }[] }>("/rest/api/3/priority/search", {
      query: { projectId: project.id, onlyDefault: "true" },
    });
    return page.values.find((value) => value.isDefault)?.id ?? page.values[0]?.id;
  } catch {
    // Jira then applies its own default when the priority is left out.
    return undefined;
  }
}

export async function getTypeFields(spaceKey: string, issueTypeId: string): Promise<TypeFields> {
  const meta = await jira<{ fields?: FieldMeta[]; values?: FieldMeta[] }>(
    `/rest/api/3/issue/createmeta/${encodeURIComponent(spaceKey)}/issuetypes/${encodeURIComponent(issueTypeId)}`,
    { query: { maxResults: 200 } },
  );
  const fields = meta.fields ?? meta.values ?? [];
  const priority = fields.find((field) => field.fieldId === "priority");
  const defaultPriorityId = priority
    ? (priority.defaultValue?.id ?? (await schemeDefaultPriority(spaceKey)))
    : undefined;
  return {
    priorities: priority?.allowedValues?.map(({ id, name }) => ({ id, name })),
    defaultPriorityId,
    missingRequired: fields
      .filter(
        (field) =>
          field.required &&
          !field.hasDefaultValue &&
          !HANDLED_FIELDS.has(field.fieldId) &&
          field.schema?.custom !== SPRINT_FIELD,
      )
      .map((field) => field.name),
    hasParent: fields.some((field) => field.fieldId === "parent"),
    hasLabels: fields.some((field) => field.fieldId === "labels"),
    hasDueDate: fields.some((field) => field.fieldId === "duedate"),
  };
}

/**
 * The running and planned sprints of a space's board, for the form's Sprint field.
 * Uses the first of `boardIds` (the board the form came from, then pinned ones), else the space's first scrum board.
 */
/** The first of `boardIds`, else the space's first board, of `type` when given. */
async function spaceBoardId(spaceKey: string, boardIds: string[], type?: "scrum"): Promise<string | undefined> {
  if (boardIds[0]) return boardIds[0];
  const { values } = await jira<{ values: JiraBoard[] }>("/rest/agile/1.0/board", {
    query: { projectKeyOrId: spaceKey, type, maxResults: 1 },
  });
  return values[0] ? String(values[0].id) : undefined;
}

/**
 * People who had issues on the space's board in the last 30 days, busiest first, for the form's Assignee field.
 * Uses the first of `boardIds` (the board the form came from, then pinned ones), else the space's first board.
 */
export async function getBoardPeople(spaceKey: string, boardIds: string[]): Promise<User[]> {
  const boardId = await spaceBoardId(spaceKey, boardIds);
  if (!boardId) return [];
  const { items } = await agilePages<{ fields: { assignee?: JiraUser | null } }>(
    `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/issue`,
    "issues",
    300,
    { jql: "assignee is not EMPTY AND updated >= -30d", fields: "assignee" },
  );
  const counts = new Map<string, { user: User; issues: number }>();
  for (const { fields } of items) {
    const { assignee } = fields;
    if (!assignee || assignee.active === false) continue;
    const entry = counts.get(assignee.accountId) ?? { user: toUser(assignee) as User, issues: 0 };
    entry.issues++;
    counts.set(assignee.accountId, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.issues - a.issues || a.user.displayName.localeCompare(b.user.displayName))
    .map((entry) => entry.user);
}

export async function getSprintChoices(spaceKey: string, boardIds: string[]): Promise<SprintChoice[]> {
  const boardId = await spaceBoardId(spaceKey, boardIds, "scrum");
  if (!boardId) return [];
  try {
    const { items } = await agilePages<JiraSprint>(
      `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/sprint`,
      "values",
      20,
      {
        state: "active,future",
      },
    );
    return items.map((sprint) => ({
      id: String(sprint.id),
      name: sprint.name,
      state: sprint.state === "active" ? "active" : "future",
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    }));
  } catch (error) {
    // Kanban boards and team-managed boards without sprints answer 400.
    if (error instanceof JiraError && error.status === 400) return [];
    throw error;
  }
}

const ISSUE_KEY = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;

/**
 * Open issues of `typeIds` in the space, the types one level above the new issue's, recently updated first.
 * `search` narrows them by key or summary, for spaces with more than one page of them.
 */
export async function getParentChoices(spaceKey: string, typeIds: string[], search = ""): Promise<ParentChoice[]> {
  if (!typeIds.length) return [];
  const text = search.trim();
  const clauses = [
    `project = ${jqlString(spaceKey)}`,
    `issuetype in (${typeIds.map(jqlString).join(", ")})`,
    "statusCategory != Done",
    ...(ISSUE_KEY.test(text)
      ? [`key = ${jqlString(text.toUpperCase())}`]
      : text
        ? [`summary ~ ${jqlString(`${text}*`)}`]
        : []),
  ];
  try {
    const page = await jira<{ issues: { key: string; fields: { summary?: string; issuetype?: { name?: string } } }[] }>(
      "/rest/api/3/search/jql",
      {
        method: "POST",
        body: {
          jql: `${clauses.join(" AND ")} ORDER BY updated DESC`,
          fields: ["summary", "issuetype"],
          maxResults: 100,
        },
      },
    );
    return page.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary ?? "",
      issueType: issue.fields.issuetype?.name ?? "Issue",
    }));
  } catch (error) {
    // Jira refuses some search text, like a key that doesn't exist. That's no match, not a failure.
    if (text && error instanceof JiraError && error.status === 400) return [];
    throw error;
  }
}

/** Labels already used on the site. Jira only lists them site-wide. */
export async function getLabels(): Promise<string[]> {
  const labels: string[] = [];
  for (;;) {
    const page = await jira<{ values: string[]; isLast?: boolean }>("/rest/api/3/label", {
      query: { startAt: labels.length, maxResults: 1000 },
    });
    labels.push(...page.values);
    if (page.isLast !== false || page.values.length === 0 || labels.length >= 5000) return labels.sort();
  }
}

// Jira's field names, as they come back in errors, to the form's.
const ERROR_FIELDS: Record<string, keyof NewIssue> = {
  project: "spaceKey",
  issuetype: "issueTypeId",
  summary: "summary",
  description: "description",
  priority: "priorityId",
  assignee: "assigneeId",
  parent: "parentKey",
  labels: "labels",
  duedate: "dueDate",
};

export async function createIssue(input: NewIssue): Promise<Created> {
  let created: { id: string; key: string };
  try {
    created = await jira<{ id: string; key: string }>("/rest/api/3/issue", {
      method: "POST",
      body: {
        fields: {
          project: { key: input.spaceKey },
          issuetype: { id: input.issueTypeId },
          summary: input.summary,
          ...(input.description ? { description: markdownToAdf(input.description) } : {}),
          ...(input.priorityId ? { priority: { id: input.priorityId } } : {}),
          ...(input.assigneeId ? { assignee: { accountId: input.assigneeId } } : {}),
          ...(input.parentKey ? { parent: { key: input.parentKey } } : {}),
          ...(input.labels?.length ? { labels: input.labels } : {}),
          ...(input.dueDate ? { duedate: input.dueDate } : {}),
        },
      },
    });
  } catch (error) {
    if (error instanceof JiraError && Object.keys(error.fields).length) {
      const fields: Partial<Record<keyof NewIssue, string>> = {};
      // Fields the form doesn't have go in the toast, since there's nowhere else to show them.
      const others: string[] = [];
      for (const [name, message] of Object.entries(error.fields)) {
        const field = ERROR_FIELDS[name];
        if (field) fields[field] = message;
        else others.push(message);
      }
      throw new FieldErrors(
        fields,
        others.length ? `${others.join(" ")} Continue in Jira to fill it in.` : error.message,
      );
    }
    throw error;
  }

  let warning: string | undefined;
  if (input.sprint) {
    try {
      await jira(`/rest/agile/1.0/sprint/${input.sprint.id}/issue`, {
        method: "POST",
        body: { issues: [created.key] },
      });
    } catch (error) {
      warning = `It's in the backlog, since adding it to ${input.sprint.name} failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  const [fields, pointsField] = await Promise.all([issueFields(false), getStoryPointsField()]);
  const raw = await jira<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(created.key)}`, { query: { fields } });
  return { issue: toIssue(raw, origin(), pointsField), warning };
}

/**
 * Jira's own create screen, filled in with the form's values, so the issue can be finished there.
 * Nothing is saved until it's created in Jira.
 */
export function getCreateUrl(input: Partial<NewIssue>): string | undefined {
  const site = siteOrigin();
  if (!site) return undefined;
  const url = new URL("/secure/CreateIssueDetails!init.jspa", site);
  const params: Record<string, string | undefined> = {
    pid: input.spaceId,
    issuetype: input.issueTypeId,
    summary: input.summary,
    description: input.description,
    priority: input.priorityId,
    assignee: input.assigneeId,
  };
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.href;
}
