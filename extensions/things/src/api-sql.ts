import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { executeSQL } from '@raycast/utils';
import {
  Area,
  CommandListName,
  List,
  Project,
  Todo,
  TodoSummary,
  TodoDetails,
  ProjectDetails,
  AreaDetails,
  ChecklistItem,
} from './types';

// Things stores its data in a SQLite database. Tries known locations in order:
//   1. ThingsData-*/Things Database.thingsdatabase/main.sqlite
//   2. Things Database.thingsdatabase/main.sqlite
//   3. ~/Library/Containers/com.culturedcode.ThingsMac/.../Things.sqlite3
//   4. Things Database.thingsSQLite
function findThingsDBPath(): string {
  const container = join(homedir(), 'Library', 'Group Containers', 'JLMPQHK86H.com.culturedcode.ThingsMac');

  // 1. ThingsData-*/Things Database.thingsdatabase/main.sqlite
  try {
    const entries = readdirSync(container);
    const dataDir = entries.find((e) => e.startsWith('ThingsData-'));
    if (dataDir) {
      const p = join(container, dataDir, 'Things Database.thingsdatabase', 'main.sqlite');
      if (existsSync(p)) return p;
    }
  } catch {
    // container doesn't exist or isn't readable — fall through
  }

  // 2. Things Database.thingsdatabase/main.sqlite  (container root)
  const p2 = join(container, 'Things Database.thingsdatabase', 'main.sqlite');
  if (existsSync(p2)) return p2;

  // 3. Older sandbox container path
  const p3 = join(
    homedir(),
    'Library',
    'Containers',
    'com.culturedcode.ThingsMac',
    'Data',
    'Library',
    'Application Support',
    'Cultured Code',
    'Things',
    'Things.sqlite3',
  );
  if (existsSync(p3)) return p3;

  // 4. Legacy fallback
  return join(container, 'Things Database.thingsSQLite');
}

let _thingsDBPath: string | undefined;
function getThingsDBPath(): string {
  if (!_thingsDBPath) _thingsDBPath = findThingsDBPath();
  return _thingsDBPath;
}

// Things stores dates as packed Int64: (year << 16) | (month << 12) | (day << 7)
const YEAR_SHIFT = 16;
const MONTH_SHIFT = 12;
const DAY_SHIFT = 7;
const MONTH_MASK = 0xf;
const DAY_MASK = 0x1f;
const RECURRING_DEADLINE_PLACEHOLDER = 262213760;
const NEXT_INSTANCE_PLACEHOLDER = 69760;

/** Decode a Things packed-date integer to "YYYY-MM-DD", or null if invalid/placeholder. */
function convertThingsDate(value: number): string | null {
  if (!value || value === RECURRING_DEADLINE_PLACEHOLDER || value === NEXT_INSTANCE_PLACEHOLDER) return null;
  const year = value >> YEAR_SHIFT;
  const month = (value >> MONTH_SHIFT) & MONTH_MASK;
  const day = (value >> DAY_SHIFT) & DAY_MASK;
  if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Encode a calendar date to Things packed-date integer. */
function encodeThingsDate(year: number, month: number, day: number): number {
  return (year << YEAR_SHIFT) | (month << MONTH_SHIFT) | (day << DAY_SHIFT);
}

/** Returns Things packed-date for end-of-today (encodeThingsDate(today) + 127 covers all times within today). */
function getEndOfToday(): number {
  const now = new Date();
  return encodeThingsDate(now.getFullYear(), now.getMonth() + 1, now.getDate()) + 127;
}

/** Add N calendar days to a Things packed-date integer and re-encode. */
function addDaysToThingsDate(packedDate: number, days: number): number | null {
  const dateStr = convertThingsDate(packedDate);
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return encodeThingsDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Parse the recurrence offset (in days) from a Things plist XML recurrence rule. */
function parseDeadlineOffset(plistXml: unknown): number | null {
  if (!plistXml || typeof plistXml !== 'string') return null;
  const match = plistXml.match(/<key>ts<\/key>\s*<integer>(-?\d+)<\/integer>/);
  if (!match) return null;
  return Math.abs(parseInt(match[1], 10));
}

/** Escape a string for safe embedding in a SQLite string literal. */
function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

type ResolvedDates = {
  effectiveDeadline: string | null;
  effectiveStartDate: string | null;
  dueDateIsRecurring: boolean;
};

/** Resolve effective dates for a todo/project (handles recurring tasks). */
function resolveEffectiveDates(
  startDate: number,
  deadline: number,
  nextInstanceStartDate: number,
  recurrenceRule: unknown,
): ResolvedDates {
  // Effective start: prefer startDate, fall back to nextInstanceStartDate (unless placeholder)
  let effectiveStartDate: string | null = null;
  if (startDate) {
    effectiveStartDate = convertThingsDate(startDate);
  } else if (nextInstanceStartDate && nextInstanceStartDate !== NEXT_INSTANCE_PLACEHOLDER) {
    effectiveStartDate = convertThingsDate(nextInstanceStartDate);
  }

  // Recurring deadline: placeholder indicates deadline is relative to next instance
  if (deadline === RECURRING_DEADLINE_PLACEHOLDER) {
    const offset = parseDeadlineOffset(recurrenceRule);
    if (offset !== null && nextInstanceStartDate) {
      const computedPacked = addDaysToThingsDate(nextInstanceStartDate, offset);
      const effectiveDeadline = computedPacked !== null ? convertThingsDate(computedPacked) : null;
      return { effectiveDeadline, effectiveStartDate, dueDateIsRecurring: true };
    }
    return { effectiveDeadline: null, effectiveStartDate, dueDateIsRecurring: true };
  }

  if (deadline) {
    return { effectiveDeadline: convertThingsDate(deadline), effectiveStartDate, dueDateIsRecurring: false };
  }

  return { effectiveDeadline: null, effectiveStartDate, dueDateIsRecurring: false };
}

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
  (SELECT GROUP_CONCAT(tg.title, ', ')
   FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags
   WHERE tt.tasks = t.uuid) as tagList`;

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
  const where = buildTodosWhereClause(opts.projectId, opts.areaId);
  const sql = `SELECT ${TODO_SELECT_SUMMARY} ${TODO_JOINS} WHERE ${where}`;
  const rows = await executeSQL<TodoSummaryRow>(getThingsDBPath(), sql);
  return rows.map(rowToTodoSummary);
}

/** Convert a UI Todo (from getListTodosFromDB) to a TodoSummary for AI tools. */
function todoToSummary(todo: Todo): TodoSummary {
  return {
    id: todo.id,
    name: todo.name,
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
  const sql = `SELECT ${TODO_SELECT_DETAIL} ${TODO_JOINS}
    WHERE t.uuid = '${sqlEscape(todoId)}' AND t.type = 0 AND t.trashed = 0 LIMIT 1`;
  const rows = await executeSQL<TodoDetailRow>(getThingsDBPath(), sql);
  if (!rows.length) return null;
  const row = rows[0];
  const checklistItems = await queryChecklistItemsSQL(todoId);
  const summary = rowToTodoSummary(row);
  return {
    ...summary,
    status: row.status === 2 ? 'canceled' : row.status === 3 ? 'completed' : 'open',
    notes: row.notes,
    tags: row.tagList ? row.tagList.split(',').filter(Boolean) : [],
    checklistItems,
  };
}

export async function queryTodosDetailsSQL(todoIds: string[]): Promise<TodoDetails[]> {
  if (!todoIds.length) return [];
  const inClause = todoIds.map((id) => `'${sqlEscape(id)}'`).join(', ');
  const sql = `SELECT ${TODO_SELECT_DETAIL} ${TODO_JOINS}
    WHERE t.uuid IN (${inClause}) AND t.type = 0 AND t.trashed = 0`;
  const rows = await executeSQL<TodoDetailRow>(getThingsDBPath(), sql);
  const allChecklist = await queryChecklistItemsBatchSQL(todoIds);
  return rows.map((row) => {
    const summary = rowToTodoSummary(row);
    return {
      ...summary,
      status: row.status === 2 ? 'canceled' : row.status === 3 ? 'completed' : 'open',
      notes: row.notes,
      tags: row.tagList ? row.tagList.split(',').filter(Boolean) : [],
      checklistItems: allChecklist[row.id] ?? [],
    };
  });
}

export async function searchTodosSQL(query: string): Promise<TodoSummary[]> {
  const q = sqlEscape(query).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const sql = `SELECT ${TODO_SELECT_SUMMARY} ${TODO_JOINS}
    WHERE ${TODO_BASE_WHERE}
      AND (t.title LIKE '%${q}%' ESCAPE '\\' OR t.notes LIKE '%${q}%' ESCAPE '\\')
    ${EXCLUDE_MASTER_WHERE}`;
  const rows = await executeSQL<TodoSummaryRow>(getThingsDBPath(), sql);
  return rows.map(rowToTodoSummary);
}

/** Query checklist items for a single todo. */
async function queryChecklistItemsSQL(todoId: string): Promise<ChecklistItem[]> {
  const sql = `SELECT uuid as id, title, status FROM TMChecklistItem WHERE task = '${sqlEscape(todoId)}' ORDER BY "index"`;
  const rows = await executeSQL<{ id: string; title: string; status: number }>(getThingsDBPath(), sql);
  return rows.map((r) => ({ id: r.id, title: r.title, completed: r.status === 3 }));
}

/** Batch query checklist items for multiple todos. Returns a dict keyed by todo uuid. */
async function queryChecklistItemsBatchSQL(todoIds: string[]): Promise<Record<string, ChecklistItem[]>> {
  if (!todoIds.length) return {};
  const inClause = todoIds.map((id) => `'${sqlEscape(id)}'`).join(', ');
  const sql = `SELECT uuid as id, task, title, status FROM TMChecklistItem WHERE task IN (${inClause}) ORDER BY task, "index"`;
  const rows = await executeSQL<{ id: string; task: string; title: string; status: number }>(getThingsDBPath(), sql);
  const result: Record<string, ChecklistItem[]> = {};
  for (const r of rows) {
    if (!result[r.task]) result[r.task] = [];
    result[r.task].push({ id: r.id, title: r.title, completed: r.status === 3 });
  }
  return result;
}

export async function queryProjectDetailsSQL(projectId: string): Promise<ProjectDetails | null> {
  const sql = `
    SELECT
      p.uuid as id, p.title as name, p.status,
      COALESCE(p.notes, '') as notes,
      p.deadline, p.startDate,
      NULLIF(p.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
      p.rt1_recurrenceRule as recurrenceRule,
      a.uuid as areaId, a.title as areaName,
      (SELECT GROUP_CONCAT(tg.title, ', ')
       FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags WHERE tt.tasks = p.uuid) as tagList,
      (SELECT COUNT(*) FROM TMTask t WHERE t.project = p.uuid AND t.type = 0 AND t.trashed = 0 AND t.status = 0) as todoCount
    FROM TMTask p
    LEFT JOIN TMArea a ON a.uuid = p.area
    WHERE p.uuid = '${sqlEscape(projectId)}' AND p.type = 1 AND p.trashed = 0 LIMIT 1`;
  type ProjectRow = {
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
  const rows = await executeSQL<ProjectRow>(getThingsDBPath(), sql);
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
    status: r.status === 2 ? 'canceled' : r.status === 3 ? 'completed' : 'open',
    notes: r.notes,
    tags: r.tagList ? r.tagList.split(',').filter(Boolean) : [],
    dueDate: effectiveDeadline ?? undefined,
    activationDate: effectiveStartDate ?? undefined,
    areaId: r.areaId ?? undefined,
    areaName: r.areaName ?? undefined,
    todoCount: r.todoCount,
  };
}

export async function queryAreaDetailsSQL(areaId: string): Promise<AreaDetails | null> {
  const sql = `
    SELECT
      a.uuid as id, a.title as name,
      (SELECT GROUP_CONCAT(tg.title, ', ')
       FROM TMAreaTag at2 JOIN TMTag tg ON tg.uuid = at2.tags WHERE at2.areas = a.uuid) as tagList,
      (SELECT COUNT(*) FROM TMTask p WHERE p.area = a.uuid AND p.type = 1 AND p.trashed = 0 AND p.status = 0) as projectCount,
      (SELECT COUNT(*) FROM TMTask t WHERE t.area = a.uuid AND t.type = 0 AND t.project IS NULL AND t.trashed = 0 AND t.status = 0) as todoCount
    FROM TMArea a
    WHERE a.uuid = '${sqlEscape(areaId)}' LIMIT 1`;
  type AreaRow = { id: string; name: string; tagList: string | null; projectCount: number; todoCount: number };
  const rows = await executeSQL<AreaRow>(getThingsDBPath(), sql);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    tags: r.tagList ? r.tagList.split(',').filter(Boolean) : [],
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
      (SELECT GROUP_CONCAT(tg.title, ', ')
       FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags
       WHERE tt.tasks = t.uuid) as tagList,
      p.uuid as projectId,
      p.title as projectName,
      p.status as projectStatus,
      NULLIF(p.deadline, 0) as projectDeadline,
      NULLIF(p.startDate, 0) as projectStartDate,
      NULLIF(p.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as projectNextInstanceStartDate,
      p.rt1_recurrenceRule as projectRecurrenceRule,
      COALESCE(p.notes, '') as projectNotes,
      (SELECT GROUP_CONCAT(tg.title, ', ')
       FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags
       WHERE tt.tasks = p.uuid) as projectTagList,
      pa.uuid as projectAreaId,
      pa.title as projectAreaName,
      a.uuid as areaId,
      a.title as areaName,
      (SELECT GROUP_CONCAT(tg.title, ', ')
       FROM TMAreaTag at2 JOIN TMTag tg ON tg.uuid = at2.tags
       WHERE at2.areas = COALESCE(a.uuid, pa.uuid)) as areaTagList,
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
      status: row.projectStatus === 2 ? 'canceled' : row.projectStatus === 3 ? 'completed' : 'open',
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
    status: row.status === 2 ? 'canceled' : row.status === 3 ? 'completed' : 'open',
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

async function runListQuery(sql: string): Promise<Todo[]> {
  const rows = await executeSQL<ListTodoRow>(getThingsDBPath(), sql);
  return rows.map(mapListTodoRow);
}

// Open, unscheduled (start=0), not trashed. Sorted by user-defined index.
// Includes todos (type=0) and projects (type=1) — Things shows both in Inbox.
async function getInboxTodosFromDB(): Promise<Todo[]> {
  return runListQuery(`
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 0
      AND t.status = 0
      AND t.start = 0
    ORDER BY t."index" ASC
  `);
}

// Open, scheduled for today or earlier (start=1, startDate <= end-of-today).
// Includes todos (type=0) and projects (type=1) — Things shows both in Today.
// Excludes recurring master templates that have an active instance already scheduled.
async function getTodayTodosFromDB(): Promise<Todo[]> {
  const todayEnd = getEndOfToday();
  return runListQuery(`
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
  `);
}

// Anytime is built in two groups:
//   1. Today todos (type=0, start=1, startDate <= today) — sorted by index
//   2. Rest todos  (type=0, start=1, startDate IS NULL or > today) — sorted by index
// Projects are not included. Todos inside Someday/Upcoming projects (project.start = 2) are excluded.
// Recurring master templates that have an active instance are excluded (the instance is shown instead).
async function getAnytimeTodosFromDB(): Promise<Todo[]> {
  const todayEnd = getEndOfToday();
  const [todayTodos, restTodos] = await Promise.all([
    runListQuery(`
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
    `),
    runListQuery(`
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
    `),
  ]);
  const seenIds = new Set(todayTodos.map((t) => t.id));
  return [...todayTodos, ...restTodos.filter((t) => !seenIds.has(t.id))];
}

// Open, start=2, has a concrete startDate OR is a recurring master with a known next instance date
// (rt1_nextInstanceStartDate != 69760 placeholder). Things shows these in Upcoming via the next instance date.
// Includes todos (type=0) and projects (type=1). Sorted: todos first, then projects, each by index.
async function getUpcomingTodosFromDB(): Promise<Todo[]> {
  return runListQuery(`
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
          AND t.rt1_nextInstanceStartDate != 69760
        )
      )
    ORDER BY
      COALESCE(t.startDate, NULLIF(t.rt1_nextInstanceStartDate, 69760)) ASC,
      CASE WHEN t.project IS NULL THEN 0 ELSE 1 END ASC,
      p."index" ASC,
      CASE WHEN t.startDate IS NULL THEN 0 ELSE 1 END ASC,
      CASE WHEN t.todayIndex IS NULL OR t.todayIndex = 0 THEN 1 ELSE 0 END ASC,
      t.todayIndex ASC,
      t."index" DESC
  `);
}

// Open, start=2, no concrete startDate, non-recurring.
// Recurring masters are excluded (they belong in Upcoming via next instance date).
// Includes todos (type=0) and projects (type=1). Sorted: todos first, then projects, each by index.
async function getSomedayTodosFromDB(): Promise<Todo[]> {
  return runListQuery(`
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
  `);
}

// Completed or canceled items (status IN (2,3)) with a stop date, not trashed.
// Includes todos (type=0) and projects (type=1). Sorted by completion date, newest first.
async function getLogbookTodosFromDB(): Promise<Todo[]> {
  return runListQuery(`
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 0
      AND t.status IN (2, 3)
      AND t.stopDate IS NOT NULL
    ORDER BY t.stopDate DESC
  `);
}

// All trashed items regardless of status. Includes todos and projects.
// Sorted by most recently modified first.
async function getTrashTodosFromDB(): Promise<Todo[]> {
  return runListQuery(`
    ${LIST_SELECT}
    WHERE
      t.type IN (0, 1)
      AND t.trashed = 1
    ORDER BY t.userModificationDate DESC
  `);
}

export async function getListTodosFromDB(commandListName: CommandListName): Promise<Todo[]> {
  switch (commandListName) {
    case 'inbox':
      return getInboxTodosFromDB();
    case 'today':
      return getTodayTodosFromDB();
    case 'anytime':
      return getAnytimeTodosFromDB();
    case 'upcoming':
      return getUpcomingTodosFromDB();
    case 'someday':
      return getSomedayTodosFromDB();
    case 'logbook':
      return getLogbookTodosFromDB();
    case 'trash':
      return getTrashTodosFromDB();
  }
}

export type TagWithParent = {
  name: string;
  parent: string | null;
};

export type CollectionMap = {
  tags: string[];
  tagsWithHierarchy: TagWithParent[];
  projects: Project[];
  areas: Area[];
  lists: List[];
};

export async function getCollectionsFromDB<K extends keyof CollectionMap>(
  ...keys: K[]
): Promise<Pick<CollectionMap, K>> {
  const keySet = new Set<string>(keys);
  const result: Partial<CollectionMap> = {};

  if (keySet.has('tags') || keySet.has('tagsWithHierarchy')) {
    const rows = await executeSQL<{ title: string; parentTitle: string | null }>(
      getThingsDBPath(),
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
    type ProjectRow = {
      id: string;
      name: string;
      status: string;
      notes: string;
      tags: string | null;
      dueDate: string | null;
      activationDate: string | null;
      areaId: string | null;
      areaName: string | null;
      areaTags: string | null;
    };
    const projectRows = await executeSQL<ProjectRow>(
      getThingsDBPath(),
      `SELECT p.uuid as id, p.title as name,
        CASE p.status WHEN 2 THEN 'canceled' WHEN 3 THEN 'completed' ELSE 'open' END as status,
        COALESCE(p.notes, '') as notes,
        (SELECT GROUP_CONCAT(tg.title, ', ') FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags WHERE tt.tasks = p.uuid) as tags,
        NULL as dueDate, NULL as activationDate, -- dates not fetched in collection summary; use queryProjectDetailsSQL for full data
        a.uuid as areaId, a.title as areaName,
        (SELECT GROUP_CONCAT(tg.title, ', ') FROM TMAreaTag at2 JOIN TMTag tg ON tg.uuid = at2.tags WHERE at2.areas = a.uuid) as areaTags
      FROM TMTask p
      LEFT JOIN TMArea a ON a.uuid = p.area
      WHERE p.type = 1 AND p.trashed = 0 AND p.status = 0`,
    );

    type TodoRow = {
      id: string;
      name: string;
      status: string;
      notes: string;
      tags: string | null;
      dueDate: string | null;
      activationDate: string | null;
      creationDate: string | null;
      projectId: string | null;
    };
    const todoRows = await executeSQL<TodoRow>(
      getThingsDBPath(),
      `SELECT t.uuid as id, t.title as name,
        CASE t.status WHEN 2 THEN 'canceled' WHEN 3 THEN 'completed' ELSE 'open' END as status,
        COALESCE(t.notes, '') as notes,
        (SELECT GROUP_CONCAT(tg.title, ', ') FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags WHERE tt.tasks = t.uuid) as tags,
        NULL as dueDate, NULL as activationDate,
        datetime(t.creationDate, 'unixepoch') as creationDate,
        t.project as projectId
      FROM TMTask t
      WHERE t.type = 0 AND t.trashed = 0 AND t.status = 0`,
    );

    const todosByProject: Record<string, Todo[]> = {};
    for (const t of todoRows) {
      if (t.projectId) {
        if (!todosByProject[t.projectId]) todosByProject[t.projectId] = [];
        todosByProject[t.projectId].push({
          id: t.id,
          name: t.name,
          status: t.status as Todo['status'],
          notes: t.notes,
          tags: t.tags ?? '',
          areaTags: null,
          dueDate: t.dueDate ?? '',
          activationDate: t.activationDate ?? '',
          creationDate: t.creationDate ?? '',
        });
      }
    }

    result.projects = projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status as Project['status'],
      notes: p.notes,
      tags: p.tags ?? '',
      dueDate: p.dueDate ?? '',
      activationDate: p.activationDate ?? '',
      area: p.areaId ? { id: p.areaId, name: p.areaName ?? '', tags: p.areaTags ?? '' } : undefined,
      todos: todosByProject[p.id] ?? [],
    }));
  }

  if (keySet.has('areas') || keySet.has('lists')) {
    type AreaRow = { id: string; name: string; tags: string | null };
    const areaRows = await executeSQL<AreaRow>(
      getThingsDBPath(),
      `SELECT a.uuid as id, a.title as name,
        (SELECT GROUP_CONCAT(tg.title, ', ') FROM TMAreaTag at2 JOIN TMTag tg ON tg.uuid = at2.tags WHERE at2.areas = a.uuid) as tags
      FROM TMArea a WHERE a.visible = 1`,
    );

    type AreaTodoRow = {
      id: string;
      name: string;
      status: string;
      notes: string;
      tags: string | null;
      dueDate: string | null;
      activationDate: string | null;
      creationDate: string | null;
      areaId: string | null;
    };
    const areaTodoRows = await executeSQL<AreaTodoRow>(
      getThingsDBPath(),
      `SELECT t.uuid as id, t.title as name,
        CASE t.status WHEN 2 THEN 'canceled' WHEN 3 THEN 'completed' ELSE 'open' END as status,
        COALESCE(t.notes, '') as notes,
        (SELECT GROUP_CONCAT(tg.title, ', ') FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags WHERE tt.tasks = t.uuid) as tags,
        NULL as dueDate, NULL as activationDate,
        datetime(t.creationDate, 'unixepoch') as creationDate,
        t.area as areaId
      FROM TMTask t
      WHERE t.type = 0 AND t.trashed = 0 AND t.status = 0 AND t.project IS NULL AND t.area IS NOT NULL`,
    );

    const todosByArea: Record<string, Todo[]> = {};
    for (const t of areaTodoRows) {
      if (t.areaId) {
        if (!todosByArea[t.areaId]) todosByArea[t.areaId] = [];
        todosByArea[t.areaId].push({
          id: t.id,
          name: t.name,
          status: t.status as Todo['status'],
          notes: t.notes,
          tags: t.tags ?? '',
          areaTags: null,
          dueDate: t.dueDate ?? '',
          activationDate: t.activationDate ?? '',
          creationDate: t.creationDate ?? '',
        });
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

export function organizeLists(projects: Project[] = [], areas: Area[] = []): List[] {
  const projectsWithoutAreas = projects
    .filter((project) => !project.area)
    .map((project) => ({ ...project, type: 'project' as const }));

  const organizedAreasAndProjects: List[] = [];
  areas.forEach((area) => {
    organizedAreasAndProjects.push({ ...area, type: 'area' as const });

    const associatedProjects = projects
      .filter((project) => project.area && project.area.id === area.id)
      .map((project) => ({ ...project, type: 'project' as const }));
    organizedAreasAndProjects.push(...associatedProjects);
  });

  return [...projectsWithoutAreas, ...organizedAreasAndProjects];
}

export type QuickFindData = {
  areas: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; areaName?: string }>;
  todos: Array<{ id: string; name: string; status: string; projectName?: string; areaName?: string }>;
};

// Read directly from Things' SQLite database — a single SQL query with JOINs
// replaces many serialized Apple Events.
export const getQuickFindDataFromDB = async (): Promise<QuickFindData> => {
  const sql = `SELECT json_object(
    'areas', COALESCE((
      SELECT json_group_array(json_object('id', a.uuid, 'name', a.title))
      FROM TMArea a WHERE a.visible = 1
    ), json('[]')),
    'projects', COALESCE((
      SELECT json_group_array(json_object(
        'id', p.uuid, 'name', p.title, 'areaName', a.title
      ))
      FROM TMTask p
      LEFT JOIN TMArea a ON a.uuid = p.area
      WHERE p.type = 1 AND p.trashed = 0 AND p.status = 0
    ), json('[]')),
    'todos', COALESCE((
      SELECT json_group_array(json_object(
        'id', t.uuid, 'name', t.title,
        'status', 'open',
        'projectName', p.title,
        'areaName', COALESCE(pa.title, da.title)
      ))
      FROM TMTask t
      LEFT JOIN TMTask p ON p.uuid = t.project
      LEFT JOIN TMArea da ON da.uuid = t.area
      LEFT JOIN TMArea pa ON pa.uuid = p.area
      WHERE t.type = 0 AND t.trashed = 0 AND t.status = 0
    ), json('[]'))
  ) as result`;

  const rows = await executeSQL<{ result: string }>(getThingsDBPath(), sql);
  const data = JSON.parse(rows[0].result);

  // SQLite returns null for missing values; convert to undefined to match TypeScript optionals
  const nullToUndefined = (v: string | null) => v ?? undefined;

  return {
    areas: (data.areas || []).filter((v: unknown) => v != null),
    projects: (data.projects || [])
      .filter((v: unknown) => v != null)
      .map((p: { id: string; name: string; areaName: string | null }) => ({
        ...p,
        areaName: nullToUndefined(p.areaName),
      })),
    todos: (data.todos || [])
      .filter((v: unknown) => v != null)
      .map((t: { id: string; name: string; status: string; projectName: string | null; areaName: string | null }) => ({
        ...t,
        projectName: nullToUndefined(t.projectName),
        areaName: nullToUndefined(t.areaName),
      })),
  };
};
