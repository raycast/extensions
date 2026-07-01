import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { executeSQL } from '@raycast/utils';
import type {
  Area,
  CollectionMap,
  CommandListName,
  Project,
  QuickFindData,
  Todo,
  TodoSummary,
  TodoDetails,
  ProjectDetails,
  AreaDetails,
  ChecklistItem,
} from './types';
import { organizeLists } from './helpers';
import {
  NEXT_INSTANCE_PLACEHOLDER,
  REQUIRED_SCHEMA,
  getEndOfToday,
  assertPackedDateEncoding,
  resolveEffectiveDates,
} from './things-internals';

// Things stores its data in a SQLite database. Tries known locations in order:
//   1. ThingsData-*/Things Database.thingsdatabase/main.sqlite (modern)
//   2. Things Database.thingsSQLite (legacy fallback)
function findThingsDBPath(): string {
  const container = join(homedir(), 'Library', 'Group Containers', 'JLMPQHK86H.com.culturedcode.ThingsMac');

  const notFoundError = new Error(
    'Things database not found. Make sure Things is installed and Raycast has Full Disk Access in System Settings → Privacy & Security → Full Disk Access.',
  );

  if (!existsSync(container)) throw notFoundError;

  // Collect all candidate paths. The modern path requires a dynamic directory
  // name (ThingsData-*), so we resolve it via readdirSync.
  const candidates: string[] = [];

  const dataDir = readdirSync(container).find((e) => e.startsWith('ThingsData-'));
  if (dataDir) {
    candidates.push(join(container, dataDir, 'Things Database.thingsdatabase', 'main.sqlite'));
  }

  candidates.push(join(container, 'Things Database.thingsSQLite'));

  const found = candidates.find(existsSync);
  if (found) return found;

  throw notFoundError;
}

// Cached validated DB path. Re-resolved if the file no longer exists on disk
// (e.g. Things was reinstalled or the database file was moved), which also
// re-runs all assertions to catch schema changes after a Things update.
let _validatedDBPath: string | undefined;
async function getValidatedDBPath(): Promise<string> {
  if (_validatedDBPath && existsSync(_validatedDBPath)) return _validatedDBPath;
  const dbPath = findThingsDBPath();
  assertPackedDateEncoding();
  await assertDatabaseSchema(dbPath);
  _validatedDBPath = dbPath;
  return _validatedDBPath;
}

/**
 * Verify that the Things database contains all tables and columns required by
 * this extension. Uses a single sqlite_master query for all tables at once.
 * Throws a descriptive error if Things has changed its schema.
 */
async function assertDatabaseSchema(dbPath: string): Promise<void> {
  const tableNames = Object.keys(REQUIRED_SCHEMA)
    .map((t) => `'${t}'`)
    .join(', ');
  const rows = await executeSQL<{ table_name: string; column_name: string }>(
    dbPath,
    `SELECT m.name AS table_name, p.name AS column_name
     FROM sqlite_master m
     JOIN pragma_table_info(m.name) p
     WHERE m.type = 'table' AND m.name IN (${tableNames})`,
  );

  const found: Record<string, Set<string>> = {};
  for (const row of rows) {
    if (!found[row.table_name]) found[row.table_name] = new Set();
    found[row.table_name].add(row.column_name);
  }

  const schemaError = (detail: string) =>
    new Error(
      `Things updated and changed its internal database schema — please check for an extension update. ${detail}`,
    );

  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
    if (!found[table]) throw schemaError(`Table "${table}" not found.`);
    const missing = columns.filter((c) => !found[table].has(c));
    if (missing.length) throw schemaError(`Missing column(s) in "${table}": ${missing.join(', ')}.`);
  }
}

/** Escape a string for safe embedding in a SQLite string literal. */
function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/** Map a Things integer status to its string equivalent. */
function mapStatus(n: number | null): 'canceled' | 'completed' | 'open' {
  return n === 2 ? 'canceled' : n === 3 ? 'completed' : 'open';
}

/** SQL CASE expression that maps a Things integer status column to a string. */
const STATUS_CASE = (col: string) => `CASE ${col} WHEN 2 THEN 'canceled' WHEN 3 THEN 'completed' ELSE 'open' END`;

/** SQL subquery: GROUP_CONCAT of tag names for a task row (append `as colName` at the call site). */
const taskTagsSql = (tableAlias: string) =>
  `(SELECT GROUP_CONCAT(tg.title, ', ') FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags WHERE tt.tasks = ${tableAlias}.uuid)`;

/** SQL subquery: GROUP_CONCAT of tag names for an area row (append `as colName` at the call site). */
const areaTagsSql = (tableAlias: string) =>
  `(SELECT GROUP_CONCAT(tg.title, ', ') FROM TMAreaTag at2 JOIN TMTag tg ON tg.uuid = at2.tags WHERE at2.areas = ${tableAlias}.uuid)`;

const TODO_JOINS = `
  FROM TMTask t
  LEFT JOIN TMTask p ON t.project = p.uuid
  LEFT JOIN TMArea pa ON p.area = pa.uuid
  LEFT JOIN TMArea a ON t.area = a.uuid`;

const TODO_SELECT_SUMMARY = `
  t.uuid as id,
  t.title as name,
  t.deadline,
  t.startDate,
  NULLIF(t.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
  t.rt1_recurrenceRule as recurrenceRule,
  (t.rt1_recurrenceRule IS NOT NULL OR t.rt1_repeatingTemplate IS NOT NULL) as isRecurring,
  p.title as projectName,
  p.uuid as projectId,
  COALESCE(a.title, pa.title) as areaName,
  COALESCE(a.uuid, pa.uuid) as areaId`;

const TODO_SELECT_DETAIL = `${TODO_SELECT_SUMMARY},
  t.status,
  COALESCE(t.notes, '') as notes,
  ${taskTagsSql('t')} as tagList`;

// Used by AI tool queries (queryTodos, searchTodos) — todos only, no projects
const TODO_BASE_WHERE = `t.type = 0 AND t.trashed = 0 AND t.status = 0`;

/** Build WHERE clause for queryTodos() project/area filters, mutually exclusive. */
function buildTodosWhereClause(projectId?: string | null, areaId?: string | null): string {
  if (projectId) {
    return `${TODO_BASE_WHERE} AND t.project = '${sqlEscape(projectId)}'${EXCLUDE_MASTER_WHERE}`;
  }
  if (areaId) {
    return `${TODO_BASE_WHERE} AND t.area = '${sqlEscape(areaId)}' AND t.project IS NULL${EXCLUDE_MASTER_WHERE}`;
  }
  return `${TODO_BASE_WHERE}${EXCLUDE_MASTER_WHERE}`;
}

// Raw row types returned by executeSQL (dates are still packed integers from DB)
type TodoSummaryRow = {
  id: string;
  name: string;
  deadline: number | null;
  startDate: number | null;
  nextInstanceStartDate: number | null;
  recurrenceRule: unknown;
  isRecurring: number;
  projectName: string | null;
  projectId: string | null;
  areaName: string | null;
  areaId: string | null;
};

type TodoDetailRow = TodoSummaryRow & {
  status: number;
  notes: string;
  tagList: string | null;
};

type ProjectDetailRow = {
  id: string;
  name: string;
  status: number;
  notes: string;
  deadline: number | null;
  startDate: number | null;
  nextInstanceStartDate: number | null;
  recurrenceRule: unknown;
  areaId: string | null;
  areaName: string | null;
  tagList: string | null;
  todoCount: number;
};

type AreaDetailRow = { id: string; name: string; tagList: string | null; projectCount: number; todoCount: number };

type CollectionProjectRow = {
  id: string;
  name: string;
  status: string;
  notes: string;
  tags: string | null;
  deadline: number | null;
  startDate: number | null;
  nextInstanceStartDate: number | null;
  recurrenceRule: unknown;
  areaId: string | null;
  areaName: string | null;
  areaTags: string | null;
};

type CollectionTodoBaseRow = {
  id: string;
  name: string;
  status: string;
  notes: string;
  tags: string | null;
  deadline: number | null;
  startDate: number | null;
  nextInstanceStartDate: number | null;
  recurrenceRule: unknown;
  creationDate: string | null;
};

type CollectionTodoRow = CollectionTodoBaseRow & { projectId: string | null };

type CollectionAreaRow = { id: string; name: string; tags: string | null };

type CollectionAreaTodoRow = CollectionTodoBaseRow & { areaId: string | null };

/** Convert a collection todo row to a Todo object (shared between projects and areas branches). */
function collectionTodoToTodo(t: CollectionTodoBaseRow): Todo {
  const { effectiveDeadline, effectiveStartDate } = resolveEffectiveDates(
    t.startDate ?? 0,
    t.deadline ?? 0,
    t.nextInstanceStartDate ?? 0,
    t.recurrenceRule,
  );
  return {
    id: t.id,
    name: t.name,
    status: t.status as Todo['status'],
    notes: t.notes,
    tags: t.tags ?? '',
    areaTags: null,
    dueDate: effectiveDeadline ?? '',
    activationDate: effectiveStartDate ?? '',
    creationDate: t.creationDate ?? '',
  };
}

/** Convert a raw DB summary row to a TodoSummary (with decoded dates). */
function rowToTodoSummary(row: TodoSummaryRow): TodoSummary {
  const { effectiveDeadline, effectiveStartDate, dueDateIsRecurring } = resolveEffectiveDates(
    row.startDate ?? 0,
    row.deadline ?? 0,
    row.nextInstanceStartDate ?? 0,
    row.recurrenceRule,
  );
  return {
    id: row.id,
    name: row.name,
    dueDate: effectiveDeadline ?? undefined,
    dueDateIsRecurring,
    activationDate: effectiveStartDate ?? undefined,
    isRecurring: Boolean(row.isRecurring),
    projectName: row.projectName ?? undefined,
    projectId: row.projectId ?? undefined,
    areaName: row.areaName ?? undefined,
    areaId: row.areaId ?? undefined,
  };
}

export async function queryTodosSQL(
  opts: {
    listName?: string | null;
    projectId?: string | null;
    areaId?: string | null;
  } = {},
): Promise<TodoSummary[]> {
  if (opts.listName) {
    const todos = await getListTodosFromDB(opts.listName as CommandListName);
    return todos.map(todoToSummary);
  }
  const dbPath = await getValidatedDBPath();
  const where = buildTodosWhereClause(opts.projectId, opts.areaId);
  const sql = `SELECT ${TODO_SELECT_SUMMARY} ${TODO_JOINS} WHERE ${where}`;
  const rows = await executeSQL<TodoSummaryRow>(dbPath, sql);
  return rows.map(rowToTodoSummary);
}

/** Convert a UI Todo (from getListTodosFromDB) to a TodoSummary for AI tools. */
function todoToSummary(todo: Todo): TodoSummary {
  return {
    id: todo.id,
    name: todo.name,
    status: todo.status !== 'open' ? todo.status : undefined,
    dueDate: todo.dueDate || undefined,
    dueDateIsRecurring: todo.dueDateIsRecurring ?? false,
    activationDate: todo.activationDate || undefined,
    isRecurring: todo.isRecurring ?? false,
    projectName: todo.project?.name,
    projectId: todo.project?.id,
    areaName: todo.area?.name,
    areaId: todo.area?.id,
  };
}

export async function queryTodoDetailsSQL(todoId: string): Promise<TodoDetails | null> {
  const dbPath = await getValidatedDBPath();
  const sql = `SELECT ${TODO_SELECT_DETAIL} ${TODO_JOINS}
    WHERE t.uuid = '${sqlEscape(todoId)}' AND t.type = 0 AND t.trashed = 0 LIMIT 1`;
  const [rows, checklistItems] = await Promise.all([
    executeSQL<TodoDetailRow>(dbPath, sql),
    queryChecklistItemsSQL(dbPath, todoId),
  ]);
  if (!rows.length) return null;
  const row = rows[0];
  const summary = rowToTodoSummary(row);
  return {
    ...summary,
    status: mapStatus(row.status),
    notes: row.notes,
    tags: row.tagList ? row.tagList.split(', ').filter(Boolean) : [],
    checklistItems,
  };
}

export async function queryTodosDetailsSQL(todoIds: string[]): Promise<TodoDetails[]> {
  if (!todoIds.length) return [];
  const dbPath = await getValidatedDBPath();
  const inClause = todoIds.map((id) => `'${sqlEscape(id)}'`).join(', ');
  const sql = `SELECT ${TODO_SELECT_DETAIL} ${TODO_JOINS}
    WHERE t.uuid IN (${inClause}) AND t.type = 0 AND t.trashed = 0`;
  const [rows, allChecklist] = await Promise.all([
    executeSQL<TodoDetailRow>(dbPath, sql),
    queryChecklistItemsBatchSQL(dbPath, todoIds),
  ]);
  return rows.map((row) => {
    const summary = rowToTodoSummary(row);
    return {
      ...summary,
      status: mapStatus(row.status),
      notes: row.notes,
      tags: row.tagList ? row.tagList.split(', ').filter(Boolean) : [],
      checklistItems: allChecklist[row.id] ?? [],
    };
  });
}

export async function searchTodosSQL(query: string): Promise<TodoSummary[]> {
  const dbPath = await getValidatedDBPath();
  const q = sqlEscape(query).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const sql = `SELECT ${TODO_SELECT_SUMMARY} ${TODO_JOINS}
    WHERE ${TODO_BASE_WHERE}
      AND (t.title LIKE '%${q}%' ESCAPE '\\' OR t.notes LIKE '%${q}%' ESCAPE '\\')
    ${EXCLUDE_MASTER_WHERE}`;
  const rows = await executeSQL<TodoSummaryRow>(dbPath, sql);
  return rows.map(rowToTodoSummary);
}

/** Query checklist items for a single todo. */
async function queryChecklistItemsSQL(dbPath: string, todoId: string): Promise<ChecklistItem[]> {
  const sql = `SELECT uuid as id, title, status FROM TMChecklistItem WHERE task = '${sqlEscape(todoId)}' ORDER BY "index"`;
  const rows = await executeSQL<{ id: string; title: string; status: number }>(dbPath, sql);
  return rows.map((r) => ({ id: r.id, title: r.title, completed: r.status === 3 }));
}

/** Batch query checklist items for multiple todos. Returns a dict keyed by todo uuid. */
async function queryChecklistItemsBatchSQL(
  dbPath: string,
  todoIds: string[],
): Promise<Record<string, ChecklistItem[]>> {
  if (!todoIds.length) return {};
  const inClause = todoIds.map((id) => `'${sqlEscape(id)}'`).join(', ');
  const sql = `SELECT uuid as id, task, title, status FROM TMChecklistItem WHERE task IN (${inClause}) ORDER BY task, "index"`;
  const rows = await executeSQL<{ id: string; task: string; title: string; status: number }>(dbPath, sql);
  const result: Record<string, ChecklistItem[]> = {};
  for (const r of rows) {
    if (!result[r.task]) result[r.task] = [];
    result[r.task].push({ id: r.id, title: r.title, completed: r.status === 3 });
  }
  return result;
}

export async function queryProjectDetailsSQL(projectId: string): Promise<ProjectDetails | null> {
  const dbPath = await getValidatedDBPath();
  const sql = `
    SELECT
      p.uuid as id, p.title as name, p.status,
      COALESCE(p.notes, '') as notes,
      p.deadline, p.startDate,
      NULLIF(p.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
      p.rt1_recurrenceRule as recurrenceRule,
      a.uuid as areaId, a.title as areaName,
      ${taskTagsSql('p')} as tagList,
      (SELECT COUNT(*) FROM TMTask t WHERE t.project = p.uuid AND t.type = 0 AND t.trashed = 0 AND t.status = 0) as todoCount
    FROM TMTask p
    LEFT JOIN TMArea a ON a.uuid = p.area
    WHERE p.uuid = '${sqlEscape(projectId)}' AND p.type = 1 AND p.trashed = 0 LIMIT 1`;
  const rows = await executeSQL<ProjectDetailRow>(dbPath, sql);
  if (!rows.length) return null;
  const r = rows[0];
  const { effectiveDeadline, effectiveStartDate } = resolveEffectiveDates(
    r.startDate ?? 0,
    r.deadline ?? 0,
    r.nextInstanceStartDate ?? 0,
    r.recurrenceRule,
  );
  return {
    id: r.id,
    name: r.name,
    status: mapStatus(r.status),
    notes: r.notes,
    tags: r.tagList ? r.tagList.split(', ').filter(Boolean) : [],
    dueDate: effectiveDeadline ?? undefined,
    activationDate: effectiveStartDate ?? undefined,
    areaId: r.areaId ?? undefined,
    areaName: r.areaName ?? undefined,
    todoCount: r.todoCount,
  };
}

export async function queryAreaDetailsSQL(areaId: string): Promise<AreaDetails | null> {
  const dbPath = await getValidatedDBPath();
  const sql = `
    SELECT
      a.uuid as id, a.title as name,
      ${areaTagsSql('a')} as tagList,
      (SELECT COUNT(*) FROM TMTask p WHERE p.area = a.uuid AND p.type = 1 AND p.trashed = 0 AND p.status = 0) as projectCount,
      (SELECT COUNT(*) FROM TMTask t WHERE t.area = a.uuid AND t.type = 0 AND t.project IS NULL AND t.trashed = 0 AND t.status = 0) as todoCount
    FROM TMArea a
    WHERE a.uuid = '${sqlEscape(areaId)}' LIMIT 1`;
  const rows = await executeSQL<AreaDetailRow>(dbPath, sql);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    tags: r.tagList ? r.tagList.split(', ').filter(Boolean) : [],
    projectCount: r.projectCount,
    todoCount: r.todoCount,
  };
}

const LIST_SELECT = `
    SELECT
      t.uuid as id,
      t.title as name,
      t.deadline,
      t.startDate,
      NULLIF(t.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
      t.rt1_recurrenceRule as recurrenceRule,
      (t.rt1_recurrenceRule IS NOT NULL OR t.rt1_repeatingTemplate IS NOT NULL) as isRecurring,
      t.type,
      t.status,
      COALESCE(t.notes, '') as notes,
      ${taskTagsSql('t')} as tagList,
      p.uuid as projectId,
      p.title as projectName,
      p.status as projectStatus,
      NULLIF(p.deadline, 0) as projectDeadline,
      NULLIF(p.startDate, 0) as projectStartDate,
      NULLIF(p.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as projectNextInstanceStartDate,
      p.rt1_recurrenceRule as projectRecurrenceRule,
      COALESCE(p.notes, '') as projectNotes,
      ${taskTagsSql('p')} as projectTagList,
      pa.uuid as projectAreaId,
      pa.title as projectAreaName,
      a.uuid as areaId,
      a.title as areaName,
      (SELECT GROUP_CONCAT(tg.title, ', ') FROM TMAreaTag at2 JOIN TMTag tg ON tg.uuid = at2.tags WHERE at2.areas = COALESCE(a.uuid, pa.uuid)) as areaTagList,
      t.creationDate as creationDateRaw
    FROM TMTask t
    LEFT JOIN TMTask p ON t.project = p.uuid
    LEFT JOIN TMArea pa ON p.area = pa.uuid
    LEFT JOIN TMArea a ON t.area = a.uuid`;

// Excludes recurring master templates that have at least one active instance scheduled.
// Active instances have rt1_repeatingTemplate pointing back to the master.
const EXCLUDE_MASTER_WHERE = `
  AND NOT (
    t.rt1_repeatingTemplate IS NULL
    AND t.rt1_recurrenceRule IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM TMTask i
      WHERE i.rt1_repeatingTemplate = t.uuid
        AND i.trashed = 0
        AND i.status = 0
    )
  )`;

type ListTodoRow = {
  id: string;
  name: string;
  deadline: number | null;
  startDate: number | null;
  nextInstanceStartDate: number | null;
  recurrenceRule: unknown;
  isRecurring: number;
  type: number;
  status: number;
  notes: string;
  tagList: string | null;
  projectId: string | null;
  projectName: string | null;
  projectStatus: number | null;
  projectDeadline: number | null;
  projectStartDate: number | null;
  projectNextInstanceStartDate: number | null;
  projectRecurrenceRule: unknown;
  projectNotes: string | null;
  projectTagList: string | null;
  projectAreaId: string | null;
  projectAreaName: string | null;
  areaId: string | null;
  areaName: string | null;
  areaTagList: string | null;
  creationDateRaw: number | null;
};

function mapListTodoRow(row: ListTodoRow): Todo {
  const { effectiveDeadline, effectiveStartDate, dueDateIsRecurring } = resolveEffectiveDates(
    row.startDate ?? 0,
    row.deadline ?? 0,
    row.nextInstanceStartDate ?? 0,
    row.recurrenceRule,
  );

  let project: Project | undefined;
  let area: Area | undefined;
  let areaTags: string | null = null;

  if (row.projectId) {
    let projectArea: Area | undefined;
    if (row.projectAreaId) {
      projectArea = { id: row.projectAreaId, name: row.projectAreaName ?? '' };
      areaTags = row.areaTagList ?? null;
    }
    const { effectiveDeadline: projDue, effectiveStartDate: projStart } = resolveEffectiveDates(
      row.projectStartDate ?? 0,
      row.projectDeadline ?? 0,
      row.projectNextInstanceStartDate ?? 0,
      row.projectRecurrenceRule,
    );
    project = {
      id: row.projectId,
      name: row.projectName ?? '',
      status: mapStatus(row.projectStatus),
      notes: row.projectNotes ?? '',
      tags: row.projectTagList ?? '',
      dueDate: projDue ?? '',
      activationDate: projStart ?? '',
      area: projectArea,
    };
  } else if (row.areaId) {
    area = { id: row.areaId, name: row.areaName ?? '' };
    areaTags = row.areaTagList ?? null;
  }

  const creationDate = row.creationDateRaw ? new Date(row.creationDateRaw * 1000).toISOString() : null;

  return {
    id: row.id,
    name: row.name,
    status: mapStatus(row.status),
    notes: row.notes,
    tags: row.tagList ?? '',
    dueDate: effectiveDeadline ?? '',
    activationDate: effectiveStartDate ?? '',
    creationDate: creationDate ?? '',
    isProject: row.type === 1,
    isRecurring: Boolean(row.isRecurring),
    dueDateIsRecurring,
    areaTags,
    project,
    area,
  };
}

async function runListQuery(dbPath: string, sql: string): Promise<Todo[]> {
  const rows = await executeSQL<ListTodoRow>(dbPath, sql);
  return rows.map(mapListTodoRow);
}

// Open, unscheduled (start=0), not trashed. Sorted by user-defined index.
// Includes todos (type=0) and projects (type=1) — Things shows both in Inbox.
async function getInboxTodosFromDB(dbPath: string): Promise<Todo[]> {
  return runListQuery(
    dbPath,
    `
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 0
      AND t.status = 0
      AND t.start = 0
    ORDER BY t."index" ASC
  `,
  );
}

// Open, scheduled for today or earlier (start=1, startDate <= end-of-today).
// Includes todos (type=0) and projects (type=1) — Things shows both in Today.
// Excludes recurring master templates that have an active instance already scheduled.
async function getTodayTodosFromDB(dbPath: string): Promise<Todo[]> {
  const todayEnd = getEndOfToday();
  return runListQuery(
    dbPath,
    `
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 0
      AND t.status = 0
      AND t.start = 1
      AND t.startDate IS NOT NULL
      AND t.startDate <= ${todayEnd}
      ${EXCLUDE_MASTER_WHERE}
    ORDER BY t.todayIndex ASC, t."index" ASC
  `,
  );
}

// Anytime is built in two groups:
//   1. Today todos (type=0, start=1, startDate <= today) — sorted by index
//   2. Rest todos  (type=0, start=1, startDate IS NULL or > today) — sorted by index
// Projects are not included. Todos inside Someday/Upcoming projects (project.start = 2) are excluded.
// Recurring master templates that have an active instance are excluded (the instance is shown instead).
async function getAnytimeTodosFromDB(dbPath: string): Promise<Todo[]> {
  const todayEnd = getEndOfToday();
  const [todayTodos, restTodos] = await Promise.all([
    runListQuery(
      dbPath,
      `
      ${LIST_SELECT}
      WHERE
        t.type = 0
        AND t.trashed = 0
        AND t.status = 0
        AND t.start = 1
        AND t.startDate IS NOT NULL
        AND t.startDate <= ${todayEnd}
        AND (t.project IS NULL OR (SELECT p.start FROM TMTask p WHERE p.uuid = t.project) = 1)
        ${EXCLUDE_MASTER_WHERE}
      ORDER BY
        CASE WHEN t.project IS NULL THEN 0 ELSE 1 END ASC,
        p."index" ASC,
        t."index" DESC
    `,
    ),
    runListQuery(
      dbPath,
      `
      ${LIST_SELECT}
      WHERE
        t.type = 0
        AND t.trashed = 0
        AND t.status = 0
        AND t.start = 1
        AND (t.startDate IS NULL OR t.startDate > ${todayEnd})
        AND (t.project IS NULL OR (SELECT p.start FROM TMTask p WHERE p.uuid = t.project) = 1)
        ${EXCLUDE_MASTER_WHERE}
      ORDER BY
        CASE WHEN t.project IS NULL THEN 0 ELSE 1 END ASC,
        p."index" ASC,
        t."index" ASC
    `,
    ),
  ]);
  const seenIds = new Set(todayTodos.map((t) => t.id));
  return [...todayTodos, ...restTodos.filter((t) => !seenIds.has(t.id))];
}

// Open, start=2, has a concrete startDate OR is a recurring master with a known next instance date
// (rt1_nextInstanceStartDate != NEXT_INSTANCE_PLACEHOLDER). Things shows these in Upcoming via the next instance date.
// Includes todos (type=0) and projects (type=1). Sorted: todos first, then projects, each by index.
async function getUpcomingTodosFromDB(dbPath: string): Promise<Todo[]> {
  return runListQuery(
    dbPath,
    `
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 0
      AND t.status = 0
      AND t.start = 2
      AND (
        t.startDate IS NOT NULL
        OR (
          t.rt1_recurrenceRule IS NOT NULL
          AND t.rt1_repeatingTemplate IS NULL
          AND t.rt1_nextInstanceStartDate IS NOT NULL
          AND t.rt1_nextInstanceStartDate != ${NEXT_INSTANCE_PLACEHOLDER}
        )
      )
    ORDER BY
      COALESCE(t.startDate, NULLIF(t.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER})) ASC,
      CASE WHEN t.project IS NULL THEN 0 ELSE 1 END ASC,
      p."index" ASC,
      CASE WHEN t.startDate IS NULL THEN 0 ELSE 1 END ASC,
      CASE WHEN t.todayIndex IS NULL OR t.todayIndex = 0 THEN 1 ELSE 0 END ASC,
      t.todayIndex ASC,
      t."index" DESC
  `,
  );
}

// Open, start=2, no concrete startDate, non-recurring.
// Recurring masters are excluded (they belong in Upcoming via next instance date).
// Includes todos (type=0) and projects (type=1). Sorted: todos first, then projects, each by index.
async function getSomedayTodosFromDB(dbPath: string): Promise<Todo[]> {
  return runListQuery(
    dbPath,
    `
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 0
      AND t.status = 0
      AND t.start = 2
      AND t.startDate IS NULL
      AND t.rt1_recurrenceRule IS NULL
      AND t.rt1_repeatingTemplate IS NULL
    ORDER BY t.type ASC, t."index" ASC
  `,
  );
}

// Completed or canceled items (status IN (2,3)) with a stop date, not trashed.
// Includes todos (type=0) and projects (type=1). Sorted by completion date, newest first.
async function getLogbookTodosFromDB(dbPath: string): Promise<Todo[]> {
  return runListQuery(
    dbPath,
    `
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 0
      AND t.status IN (2, 3)
      AND t.stopDate IS NOT NULL
    ORDER BY t.stopDate DESC
  `,
  );
}

// All trashed items regardless of status. Includes todos and projects.
// Sorted by most recently modified first.
async function getTrashTodosFromDB(dbPath: string): Promise<Todo[]> {
  return runListQuery(
    dbPath,
    `
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 1
    ORDER BY t.userModificationDate DESC
  `,
  );
}

export async function getListTodosFromDB(commandListName: CommandListName): Promise<Todo[]> {
  const dbPath = await getValidatedDBPath();
  switch (commandListName) {
    case 'inbox':
      return getInboxTodosFromDB(dbPath);
    case 'today':
      return getTodayTodosFromDB(dbPath);
    case 'anytime':
      return getAnytimeTodosFromDB(dbPath);
    case 'upcoming':
      return getUpcomingTodosFromDB(dbPath);
    case 'someday':
      return getSomedayTodosFromDB(dbPath);
    case 'logbook':
      return getLogbookTodosFromDB(dbPath);
    case 'trash':
      return getTrashTodosFromDB(dbPath);
    default:
      return [];
  }
}

export async function getCollectionsFromDB<K extends keyof CollectionMap>(
  ...keys: K[]
): Promise<Pick<CollectionMap, K>> {
  const dbPath = await getValidatedDBPath();
  const keySet = new Set<string>(keys);
  const result: Partial<CollectionMap> = {};

  if (keySet.has('tags') || keySet.has('tagsWithHierarchy')) {
    const rows = await executeSQL<{ title: string; parentTitle: string | null }>(
      dbPath,
      `SELECT t.title, p.title as parentTitle FROM TMTag t LEFT JOIN TMTag p ON p.uuid = t.parent ORDER BY t.title COLLATE NOCASE`,
    );
    if (keySet.has('tags')) {
      result.tags = rows.map((r) => r.title);
    }
    if (keySet.has('tagsWithHierarchy')) {
      result.tagsWithHierarchy = rows.map((r) => ({ name: r.title, parent: r.parentTitle ?? null }));
    }
  }

  if (keySet.has('projects') || keySet.has('lists')) {
    const [projectRows, todoRows] = await Promise.all([
      executeSQL<CollectionProjectRow>(
        dbPath,
        `SELECT p.uuid as id, p.title as name,
          ${STATUS_CASE('p.status')} as status,
          COALESCE(p.notes, '') as notes,
          ${taskTagsSql('p')} as tags,
          p.deadline, p.startDate,
          NULLIF(p.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
          p.rt1_recurrenceRule as recurrenceRule,
          a.uuid as areaId, a.title as areaName,
          ${areaTagsSql('a')} as areaTags
        FROM TMTask p
        LEFT JOIN TMArea a ON a.uuid = p.area
        WHERE p.type = 1 AND p.trashed = 0 AND p.status = 0`,
      ),
      executeSQL<CollectionTodoRow>(
        dbPath,
        `SELECT t.uuid as id, t.title as name,
          ${STATUS_CASE('t.status')} as status,
          COALESCE(t.notes, '') as notes,
          ${taskTagsSql('t')} as tags,
          t.deadline, t.startDate,
          NULLIF(t.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
          t.rt1_recurrenceRule as recurrenceRule,
          datetime(t.creationDate, 'unixepoch') as creationDate,
          t.project as projectId
        FROM TMTask t
        WHERE t.type = 0 AND t.trashed = 0 AND t.status = 0`,
      ),
    ]);

    const todosByProject: Record<string, Todo[]> = {};
    for (const t of todoRows) {
      if (t.projectId) {
        if (!todosByProject[t.projectId]) todosByProject[t.projectId] = [];
        todosByProject[t.projectId].push(collectionTodoToTodo(t));
      }
    }

    result.projects = projectRows.map((p) => {
      const { effectiveDeadline, effectiveStartDate } = resolveEffectiveDates(
        p.startDate ?? 0,
        p.deadline ?? 0,
        p.nextInstanceStartDate ?? 0,
        p.recurrenceRule,
      );
      return {
        id: p.id,
        name: p.name,
        status: p.status as Project['status'],
        notes: p.notes,
        tags: p.tags ?? '',
        dueDate: effectiveDeadline ?? '',
        activationDate: effectiveStartDate ?? '',
        area: p.areaId ? { id: p.areaId, name: p.areaName ?? '', tags: p.areaTags ?? '' } : undefined,
        todos: todosByProject[p.id] ?? [],
      };
    });
  }

  if (keySet.has('areas') || keySet.has('lists')) {
    const [areaRows, areaTodoRows] = await Promise.all([
      executeSQL<CollectionAreaRow>(
        dbPath,
        `SELECT a.uuid as id, a.title as name,
          ${areaTagsSql('a')} as tags
        FROM TMArea a WHERE a.visible = 1`,
      ),
      executeSQL<CollectionAreaTodoRow>(
        dbPath,
        `SELECT t.uuid as id, t.title as name,
          ${STATUS_CASE('t.status')} as status,
          COALESCE(t.notes, '') as notes,
          ${taskTagsSql('t')} as tags,
          t.deadline, t.startDate,
          NULLIF(t.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
          t.rt1_recurrenceRule as recurrenceRule,
          datetime(t.creationDate, 'unixepoch') as creationDate,
          t.area as areaId
        FROM TMTask t
        WHERE t.type = 0 AND t.trashed = 0 AND t.status = 0 AND t.project IS NULL AND t.area IS NOT NULL`,
      ),
    ]);

    const todosByArea: Record<string, Todo[]> = {};
    for (const t of areaTodoRows) {
      if (t.areaId) {
        if (!todosByArea[t.areaId]) todosByArea[t.areaId] = [];
        todosByArea[t.areaId].push(collectionTodoToTodo(t));
      }
    }

    result.areas = areaRows.map((a) => ({
      id: a.id,
      name: a.name,
      tags: a.tags ?? '',
      todos: todosByArea[a.id] ?? [],
    }));
  }

  if (keySet.has('lists')) {
    result.lists = organizeLists(result.projects, result.areas);
  }

  return Object.fromEntries(keys.map((key) => [key, result[key]])) as Pick<CollectionMap, K>;
}

// Read directly from Things' SQLite database — a single SQL query with JOINs
// replaces many serialized Apple Events.
export const getQuickFindDataFromDB = async (): Promise<QuickFindData> => {
  const dbPath = await getValidatedDBPath();
  type AreaRow = { id: string; name: string };
  type ProjectRow = { id: string; name: string; areaName: string | null };
  type TodoRow = { id: string; name: string; status: string; projectName: string | null; areaName: string | null };

  const [areaRows, projectRows, todoRows] = await Promise.all([
    executeSQL<AreaRow>(
      dbPath,
      `SELECT a.uuid as id, a.title as name
      FROM TMArea a WHERE a.visible = 1`,
    ),
    executeSQL<ProjectRow>(
      dbPath,
      `SELECT p.uuid as id, p.title as name, a.title as areaName
      FROM TMTask p
      LEFT JOIN TMArea a ON a.uuid = p.area
      WHERE p.type = 1 AND p.trashed = 0 AND p.status = 0`,
    ),
    executeSQL<TodoRow>(
      dbPath,
      `SELECT t.uuid as id, t.title as name, 'open' as status,
        p.title as projectName,
        COALESCE(pa.title, da.title) as areaName
      FROM TMTask t
      LEFT JOIN TMTask p ON p.uuid = t.project
      LEFT JOIN TMArea da ON da.uuid = t.area
      LEFT JOIN TMArea pa ON pa.uuid = p.area
      WHERE t.type = 0 AND t.trashed = 0 AND t.status = 0`,
    ),
  ]);

  return {
    areas: areaRows,
    projects: projectRows.map((p) => ({ ...p, areaName: p.areaName ?? undefined })),
    todos: todoRows.map((t) => ({ ...t, projectName: t.projectName ?? undefined, areaName: t.areaName ?? undefined })),
  };
};
