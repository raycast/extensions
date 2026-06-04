import { exec } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from '@raycast/api';
import { runAppleScript, executeSQL } from '@raycast/utils';
import queryString from 'query-string';
import {
  Area,
  CommandListName,
  List,
  Project,
  Todo,
  AddTodoParams,
  UpdateTodoParams,
  AddProjectParams,
  UpdateProjectParams,
  TodoSummary,
  TodoDetails,
  ProjectSummary,
  ProjectDetails,
  AreaSummary,
  AreaDetails,
  ChecklistItem,
} from './types';

export const preferences = getPreferenceValues<Preferences>();

// Things stores its data in a SQLite database with WAL mode (concurrent reads safe)
// Modern Things 3 uses: ThingsData-XXXXX/Things Database.thingsdatabase/main.sqlite
// Older versions used: Things Database.thingsSQLite
function findThingsDBPath(): string {
  const container = join(homedir(), 'Library', 'Group Containers', 'JLMPQHK86H.com.culturedcode.ThingsMac');

  // New path format (Things 3.x modern): ThingsData-*/Things Database.thingsdatabase/main.sqlite
  try {
    const entries = readdirSync(container);
    const dataDir = entries.find((e) => e.startsWith('ThingsData-'));
    if (dataDir) {
      const newPath = join(container, dataDir, 'Things Database.thingsdatabase', 'main.sqlite');
      if (existsSync(newPath)) return newPath;
    }
  } catch {
    // container doesn't exist or isn't readable — fall through
  }

  // Legacy path format
  return join(container, 'Things Database.thingsSQLite');
}

let _thingsDBPath: string | undefined;
function getThingsDBPath(): string {
  if (!_thingsDBPath) _thingsDBPath = findThingsDBPath();
  return _thingsDBPath;
}

// ---------------------------------------------------------------------------
// Things packed-date helpers (ported from Swift Database.swift)
// Things stores dates as packed Int64: (year << 16) | (month << 12) | (day << 7)
// ---------------------------------------------------------------------------

const YEAR_SHIFT = 16;
const MONTH_SHIFT = 12;
const DAY_SHIFT = 7;
const MONTH_MASK = 0xf;
const DAY_MASK = 0x1f;
const RECURRING_DEADLINE_PLACEHOLDER = 262213760;
const NEXT_INSTANCE_PLACEHOLDER = 69760;

/** Decode a Things packed-date integer to "YYYY-MM-DD", or null if invalid/placeholder. */
export function convertThingsDate(value: number): string | null {
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

/**
 * Resolve effective dates for a todo/project (handles recurring tasks).
 * Ported from Swift Database.swift resolveEffectiveDates().
 */
export function resolveEffectiveDates(
  startDate: number,
  deadline: number,
  nextInstanceStartDate: number,
  recurrenceRule: unknown,
): ResolvedDates {
  // Effective start: prefer startDate, fall back to nextInstanceStartDate (unless placeholder)
  let effectiveStartDate: string | null = null;
  if (startDate && startDate !== 0) {
    effectiveStartDate = convertThingsDate(startDate);
  } else if (
    nextInstanceStartDate &&
    nextInstanceStartDate !== 0 &&
    nextInstanceStartDate !== NEXT_INSTANCE_PLACEHOLDER
  ) {
    effectiveStartDate = convertThingsDate(nextInstanceStartDate);
  }

  // Recurring deadline: placeholder indicates deadline is relative to next instance
  if (deadline === RECURRING_DEADLINE_PLACEHOLDER) {
    const offset = parseDeadlineOffset(recurrenceRule);
    if (offset !== null && nextInstanceStartDate && nextInstanceStartDate !== 0) {
      const computedPacked = addDaysToThingsDate(nextInstanceStartDate, offset);
      const effectiveDeadline = computedPacked !== null ? convertThingsDate(computedPacked) : null;
      return { effectiveDeadline, effectiveStartDate, dueDateIsRecurring: true };
    }
    return { effectiveDeadline: null, effectiveStartDate, dueDateIsRecurring: true };
  }

  if (deadline && deadline !== 0) {
    return { effectiveDeadline: convertThingsDate(deadline), effectiveStartDate, dueDateIsRecurring: false };
  }

  return { effectiveDeadline: null, effectiveStartDate, dueDateIsRecurring: false };
}

// ---------------------------------------------------------------------------
// SQLite query helpers (executeSQL from @raycast/utils)
// ---------------------------------------------------------------------------

// Common SQL fragments (ported from Swift TodoQueries.swift)

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
  (SELECT GROUP_CONCAT(tg.title, ',')
   FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags
   WHERE tt.tasks = t.uuid) as tagList`;

// Excludes recurring master tasks that have an active instance
const EXCLUDE_MASTER = `
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

const TODO_BASE_WHERE = `t.type = 0 AND t.trashed = 0 AND t.status = 0`;

function listWhere(listName: string): string {
  const todayEnd = getEndOfToday();
  switch (listName) {
    case 'inbox':
      return `${TODO_BASE_WHERE} AND t.start = 0`;
    case 'today':
      return `${TODO_BASE_WHERE} AND t.start = 1 AND t.startDate IS NOT NULL AND t.startDate <= ${todayEnd}`;
    case 'anytime':
      return `${TODO_BASE_WHERE} AND t.start = 1 AND (t.startDate IS NULL OR t.startDate > ${todayEnd})`;
    case 'upcoming':
      return `${TODO_BASE_WHERE} AND t.start = 2 AND t.startDate IS NOT NULL`;
    case 'someday':
      return `${TODO_BASE_WHERE} AND t.start = 2 AND t.startDate IS NULL`;
    default:
      return TODO_BASE_WHERE;
  }
}

/** Build WHERE clause for queryTodos(), mutually exclusive filters. */
function buildTodosWhereClause(listName?: string | null, projectId?: string | null, areaId?: string | null): string {
  if (projectId) {
    return `${TODO_BASE_WHERE} AND t.project = '${sqlEscape(projectId)}'${EXCLUDE_MASTER}`;
  }
  if (areaId) {
    return `${TODO_BASE_WHERE} AND t.area = '${sqlEscape(areaId)}' AND t.project IS NULL${EXCLUDE_MASTER}`;
  }
  if (listName) {
    return `${listWhere(listName)}${EXCLUDE_MASTER}`;
  }
  return `${TODO_BASE_WHERE}${EXCLUDE_MASTER}`;
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

/** Query todos with optional list/project/area filter. Returns TodoSummary[]. */
export async function queryTodos(
  opts: {
    listName?: string | null;
    projectId?: string | null;
    areaId?: string | null;
  } = {},
): Promise<TodoSummary[]> {
  const where = buildTodosWhereClause(opts.listName, opts.projectId, opts.areaId);
  const sql = `SELECT ${TODO_SELECT_SUMMARY} ${TODO_JOINS} WHERE ${where} ORDER BY t."index"`;
  const rows = await executeSQL<TodoSummaryRow>(getThingsDBPath(), sql);
  return rows.map(rowToTodoSummary);
}

/** Query a single todo's full details including checklist items. */
export async function queryTodoDetails(todoId: string): Promise<TodoDetails | null> {
  const sql = `SELECT ${TODO_SELECT_DETAIL} ${TODO_JOINS}
    WHERE t.uuid = '${sqlEscape(todoId)}' AND t.type = 0 AND t.trashed = 0 LIMIT 1`;
  const rows = await executeSQL<TodoDetailRow>(getThingsDBPath(), sql);
  if (!rows.length) return null;
  const row = rows[0];
  const checklistItems = await queryChecklistItems(todoId);
  const summary = rowToTodoSummary(row);
  return {
    ...summary,
    status: row.status === 2 ? 'canceled' : row.status === 3 ? 'completed' : 'open',
    notes: row.notes,
    tags: row.tagList ? row.tagList.split(',').filter(Boolean) : [],
    checklistItems,
  };
}

/** Query multiple todos' full details in batch. */
export async function queryTodosDetails(todoIds: string[]): Promise<TodoDetails[]> {
  if (!todoIds.length) return [];
  const inClause = todoIds.map((id) => `'${sqlEscape(id)}'`).join(', ');
  const sql = `SELECT ${TODO_SELECT_DETAIL} ${TODO_JOINS}
    WHERE t.uuid IN (${inClause}) AND t.type = 0 AND t.trashed = 0 ORDER BY t."index"`;
  const rows = await executeSQL<TodoDetailRow>(getThingsDBPath(), sql);

  // Batch fetch all checklist items
  const allChecklist = await queryChecklistItemsBatch(todoIds);

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

/** Search todos by title/notes keyword. */
export async function searchTodos(query: string): Promise<TodoSummary[]> {
  // Escape special LIKE characters
  const q = sqlEscape(query).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const sql = `SELECT ${TODO_SELECT_SUMMARY} ${TODO_JOINS}
    WHERE ${TODO_BASE_WHERE}
      AND (t.title LIKE '%${q}%' ESCAPE '\\' OR t.notes LIKE '%${q}%' ESCAPE '\\')
    ${EXCLUDE_MASTER}
    ORDER BY t."index"`;
  const rows = await executeSQL<TodoSummaryRow>(getThingsDBPath(), sql);
  return rows.map(rowToTodoSummary);
}

/** Query checklist items for a single todo. */
export async function queryChecklistItems(todoId: string): Promise<ChecklistItem[]> {
  const sql = `SELECT uuid as id, title, status FROM TMChecklistItem WHERE task = '${sqlEscape(todoId)}' ORDER BY "index"`;
  const rows = await executeSQL<{ id: string; title: string; status: number }>(getThingsDBPath(), sql);
  return rows.map((r) => ({ id: r.id, title: r.title, completed: r.status === 3 }));
}

/** Batch query checklist items for multiple todos. Returns a dict keyed by todo uuid. */
async function queryChecklistItemsBatch(todoIds: string[]): Promise<Record<string, ChecklistItem[]>> {
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

/** Query all open projects (summary). */
export async function queryProjects(): Promise<ProjectSummary[]> {
  const sql = `SELECT uuid as id, title as name, status FROM TMTask WHERE type = 1 AND trashed = 0 AND status = 0 ORDER BY "index"`;
  const rows = await executeSQL<{ id: string; name: string; status: number }>(getThingsDBPath(), sql);
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

/** Query a single project's full details. */
export async function queryProjectDetails(projectId: string): Promise<ProjectDetails | null> {
  const sql = `
    SELECT
      p.uuid as id, p.title as name, p.status,
      COALESCE(p.notes, '') as notes,
      p.deadline, p.startDate,
      NULLIF(p.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
      p.rt1_recurrenceRule as recurrenceRule,
      a.uuid as areaId, a.title as areaName,
      (SELECT GROUP_CONCAT(tg.title, ',')
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

/** Query all areas (summary). */
export async function queryAreas(): Promise<AreaSummary[]> {
  const sql = `SELECT uuid as id, title as name FROM TMArea ORDER BY "index"`;
  const rows = await executeSQL<{ id: string; name: string }>(getThingsDBPath(), sql);
  return rows;
}

/** Query a single area's full details. */
export async function queryAreaDetails(areaId: string): Promise<AreaDetails | null> {
  const sql = `
    SELECT
      a.uuid as id, a.title as name,
      (SELECT GROUP_CONCAT(tg.title, ',')
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

/** Query all tag names. */
export async function queryTags(): Promise<string[]> {
  const sql = `SELECT title FROM TMTag ORDER BY title COLLATE NOCASE`;
  const rows = await executeSQL<{ title: string }>(getThingsDBPath(), sql);
  return rows.map((r) => r.title);
}

/** Add a JSON payload via the things:///json URL scheme (requires auth token). */
export async function addJson(jsonData: unknown[]): Promise<void> {
  const { authToken } = getPreferenceValues<Preferences>();
  if (!authToken) throw new Error('unauthorized');
  const encoded = encodeURIComponent(JSON.stringify(jsonData));
  await silentlyOpenThingsURL(`things:///json?auth-token=${encodeURIComponent(authToken)}&data=${encoded}`);
}

export class ThingsError extends Error {
  constructor(
    message: string,
    public readonly type: 'APP_NOT_FOUND' | 'PERMISSION_DENIED' | 'EXECUTION_ERROR' | 'UNKNOWN_ERROR',
    public readonly originalError?: string,
    public readonly operation?: string,
  ) {
    super(operation ? `${operation}: ${message}` : message);
    this.name = 'ThingsError';
  }
}

export const executeJxa = async (script: string, operation?: string) => {
  try {
    const result = await runAppleScript(`(function(){${script}})()`, {
      humanReadableOutput: false,
      language: 'JavaScript',
      timeout: 60 * 1000, // 60 seconds
    });

    // Some calls only update data and don't return anything
    if (!result) {
      return;
    }

    // JXA's non-human-readable output is similar to JSON, but is actually a JSON-like representation of the JavaScript object.
    // While values should not be `undefined`, JXA will include {"key": undefined} in its output if they are.
    // This is not valid JSON, so we replace those values with `null` to make it valid JSON.
    return JSON.parse(result.replace(/:\s*undefined/g, ': null'));
  } catch (err: unknown) {
    const errorMessage = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err);
    const message = errorMessage.replace('execution error: Error: ', '');

    if (message.match(/Application can't be found/i)) {
      throw new ThingsError(
        'Things application not found. Please make sure Things is installed and running.',
        'APP_NOT_FOUND',
        message,
        operation,
      );
      // https://developer.apple.com/documentation/coreservices/1527221-anonymous/erraeeventnotpermitted
    } else if (
      message.match(/not allowed assistive access/i) ||
      message.match(/permission/i) ||
      message.match(/-1743/)
    ) {
      throw new ThingsError(
        'Permission denied. Please grant Raycast access to Things in System Settings > Privacy & Security > Automation > Raycast > Things.',
        'PERMISSION_DENIED',
        message,
        operation,
      );
    } else if (message.match(/doesn't understand/i) || message.match(/can't get/i)) {
      throw new ThingsError(
        'Things automation interface error. This might be due to a Things version incompatibility or the app not being ready.',
        'EXECUTION_ERROR',
        message,
        operation,
      );
    } else if (message.match(/timed out/i)) {
      throw new ThingsError(
        'Command timed out. Things may be unresponsive or not running.',
        'EXECUTION_ERROR',
        message,
        operation,
      );
    } else {
      throw new ThingsError(`Unexpected error: ${message}`, 'UNKNOWN_ERROR', message, operation);
    }
  }
};

const commandListNameToListIdMapping: Record<CommandListName, string> = {
  inbox: 'TMInboxListSource',
  today: 'TMTodayListSource',
  anytime: 'TMNextListSource',
  upcoming: 'TMCalendarListSource',
  someday: 'TMSomedayListSource',
  logbook: 'TMLogbookListSource',
  trash: 'TMTrashListSource',
};

// SQLite-based getListTodos — much faster than JXA (~15s → <100ms).
// Logbook and Trash are not available via the SQLite query layer (they require
// different status/trashed flags); those fall back to JXA automatically.
const SQL_SUPPORTED_LISTS = new Set(['inbox', 'today', 'anytime', 'upcoming', 'someday']);

async function getListTodosFromDB(commandListName: CommandListName): Promise<Todo[]> {
  // Build a richer SQL query that also fetches project/area info and creation date
  const where = buildTodosWhereClause(commandListName);
  const sql = `
    SELECT
      t.uuid as id,
      t.title as name,
      t.deadline,
      t.startDate,
      NULLIF(t.rt1_nextInstanceStartDate, ${NEXT_INSTANCE_PLACEHOLDER}) as nextInstanceStartDate,
      t.rt1_recurrenceRule as recurrenceRule,
      (t.rt1_recurrenceRule IS NOT NULL OR t.rt1_repeatingTemplate IS NOT NULL) as isRecurring,
      t.status,
      COALESCE(t.notes, '') as notes,
      t.type,
      (SELECT GROUP_CONCAT(tg.title, ',')
       FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags
       WHERE tt.tasks = t.uuid) as tagList,
      p.uuid as projectId,
      p.title as projectName,
      p.status as projectStatus,
      NULLIF(p.deadline, 0) as projectDeadline,
      NULLIF(p.startDate, 0) as projectStartDate,
      (SELECT GROUP_CONCAT(tg.title, ',')
       FROM TMTaskTag tt JOIN TMTag tg ON tg.uuid = tt.tags
       WHERE tt.tasks = p.uuid) as projectTagList,
      pa.uuid as projectAreaId,
      pa.title as projectAreaName,
      a.uuid as areaId,
      a.title as areaName,
      (SELECT GROUP_CONCAT(tg.title, ',')
       FROM TMAreaTag at2 JOIN TMTag tg ON tg.uuid = at2.tags
       WHERE at2.areas = COALESCE(a.uuid, pa.uuid)) as areaTagList,
      t.creationDate as creationDateRaw
    FROM TMTask t
    LEFT JOIN TMTask p ON t.project = p.uuid
    LEFT JOIN TMArea pa ON p.area = pa.uuid
    LEFT JOIN TMArea a ON t.area = a.uuid
    WHERE ${where}
    ORDER BY t."index"`;

  type ListTodoRow = {
    id: string;
    name: string;
    deadline: number | null;
    startDate: number | null;
    nextInstanceStartDate: number | null;
    recurrenceRule: unknown;
    isRecurring: number;
    status: number;
    notes: string;
    type: number;
    tagList: string | null;
    projectId: string | null;
    projectName: string | null;
    projectStatus: number | null;
    projectDeadline: number | null;
    projectStartDate: number | null;
    projectTagList: string | null;
    projectAreaId: string | null;
    projectAreaName: string | null;
    areaId: string | null;
    areaName: string | null;
    areaTagList: string | null;
    creationDateRaw: number | null;
  };

  const rows = await executeSQL<ListTodoRow>(getThingsDBPath(), sql);

  return rows.map((row): Todo => {
    const { effectiveDeadline, effectiveStartDate } = resolveEffectiveDates(
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
      project = {
        id: row.projectId,
        name: row.projectName ?? '',
        status: row.projectStatus === 2 ? 'canceled' : row.projectStatus === 3 ? 'completed' : 'open',
        tags: row.projectTagList ?? '',
        dueDate: row.projectDeadline ? (convertThingsDate(row.projectDeadline) ?? '') : '',
        activationDate: row.projectStartDate ? (convertThingsDate(row.projectStartDate) ?? '') : '',
        notes: '',
        area: projectArea,
      };
    } else if (row.areaId) {
      area = { id: row.areaId, name: row.areaName ?? '' };
      areaTags = row.areaTagList ?? null;
    }

    // creationDate is stored as Unix timestamp seconds in SQLite
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
      areaTags,
      project,
      area,
    };
  });
}

export const getListTodos = async (commandListName: CommandListName): Promise<Todo[]> => {
  // Use fast SQLite path for supported lists, fall back to JXA for logbook/trash
  if (SQL_SUPPORTED_LISTS.has(commandListName)) {
    try {
      return await getListTodosFromDB(commandListName);
    } catch (error) {
      console.warn(`getListTodos: SQLite query failed for '${commandListName}', falling back to JXA:`, error);
    }
  }
  return getListTodosViaJXA(commandListName);
};

const getListTodosViaJXA = (commandListName: CommandListName): Promise<Todo[]> => {
  return executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const todos = things.lists.byId('${commandListNameToListIdMapping[commandListName]}').toDos();

  return todos.map(todo => {
    const props = todo.properties();

    let areaTags = '';
    const areaRef = props.area;

    let project = null;
    const projectRef = props.project;
    if (projectRef) {
      const projectProps = projectRef.properties();
      let projectArea = null;
      const projectAreaRef = projectProps.area;
      if (projectAreaRef) {
        const areaProps = projectAreaRef.properties();
        projectArea = { id: areaProps.id, name: areaProps.name };
        areaTags = projectAreaRef.tagNames() || '';
      }
      project = {
        id: projectProps.id,
        name: projectProps.name,
        status: projectProps.status,
        tags: projectRef.tagNames(),
        dueDate: projectProps.dueDate ? projectProps.dueDate.toISOString() : null,
        activationDate: projectProps.activationDate ? projectProps.activationDate.toISOString() : null,
        area: projectArea,
      };
    }

    let area = null;
    if (areaRef && !projectRef) {
      const areaProps = areaRef.properties();
      area = { id: areaProps.id, name: areaProps.name };
      areaTags = areaRef.tagNames() || '';
    }

    return {
      id: props.id,
      name: props.name,
      status: props.status,
      notes: props.notes,
      tags: todo.tagNames(),
      dueDate: props.dueDate ? props.dueDate.toISOString() : null,
      activationDate: props.activationDate ? props.activationDate.toISOString() : null,
      creationDate: props.creationDate ? props.creationDate.toISOString() : null,
      isProject: props.pcls === "project",
      areaTags: areaTags || null,
      project,
      area,
    };
  });
`,
    `Get ${commandListName} list`,
  );
};

export const getTodoName = (todoId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const todo = things.toDos.byId('${todoId}')

  return todo.name();
`,
    'Get todo name',
  );

export const getProjectName = (projectId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  const project = things.projects.byId('${projectId}')

  return project.name();
`,
    'Get project name',
  );

const DATE_KEYS = new Set(['dueDate', 'activationDate', 'completionDate', 'cancellationDate']);

export const setTodoProperty = (todoId: string, key: string, value: string) => {
  // Date keys must be passed as JS Date objects in JXA — plain strings crash Things.
  // Use the local-time constructor (y, m-1, d) instead of new Date('YYYY-MM-DD') which
  // parses as UTC midnight and shifts the date by one day in negative-offset timezones.
  let valueExpr: string;
  if (DATE_KEYS.has(key)) {
    const [y, m, d] = value.split('-').map(Number);
    valueExpr = `new Date(${y}, ${m - 1}, ${d})`;
  } else {
    valueExpr = `'${value}'`;
  }
  return executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.toDos.byId('${todoId}').${key} = ${valueExpr};
`,
    'Set todo property',
  );
};

export const deleteTodo = (todoId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.toDos.byId('${todoId}'));
`,
    'Delete todo',
  );

export const deleteProject = (projectId: string) =>
  executeJxa(
    `
  const things = Application('${preferences.thingsAppIdentifier}');
  things.delete(things.projects.byId('${projectId}'));
`,
    'Delete project',
  );

// JXA mapping templates - reusable across individual and combined queries
// Uses properties() batching to minimize Apple Event overhead
const mapTagJxa = `tag => tag.name()`;

const mapTagWithHierarchyJxa = `tag => {
  const props = tag.properties();
  const parentRef = props.parentTag;
  return {
    name: props.name,
    parent: parentRef ? parentRef.name() : null
  };
}`;

const mapProjectTodoJxa = `todo => {
  const props = todo.properties();
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes,
    tags: todo.tagNames(),
    dueDate: props.dueDate ? props.dueDate.toISOString() : null,
    activationDate: props.activationDate ? props.activationDate.toISOString() : null,
    creationDate: props.creationDate ? props.creationDate.toISOString() : null,
  };
}`;

const mapProjectJxa = `project => {
  const props = project.properties();
  const areaRef = props.area;
  let area = null;
  if (areaRef) {
    const areaProps = areaRef.properties();
    area = { id: areaProps.id, name: areaProps.name, tags: areaRef.tagNames() };
  }
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes,
    tags: project.tagNames(),
    dueDate: props.dueDate ? props.dueDate.toISOString() : null,
    activationDate: props.activationDate ? props.activationDate.toISOString() : null,
    area,
    todos: project.toDos().map(${mapProjectTodoJxa})
  };
}`;

const mapAreaTodoJxa = `todo => {
  const props = todo.properties();
  return {
    id: props.id,
    name: props.name,
    status: props.status,
    notes: props.notes,
    tags: todo.tagNames(),
    dueDate: props.dueDate ? props.dueDate.toISOString() : null,
    activationDate: props.activationDate ? props.activationDate.toISOString() : null,
    creationDate: props.creationDate ? props.creationDate.toISOString() : null,
    isProject: props.pcls === "project",
  };
}`;

const mapAreaJxa = `area => {
  const props = area.properties();
  return {
    id: props.id,
    name: props.name,
    tags: area.tagNames(),
    todos: area.toDos().map(${mapAreaTodoJxa})
  };
}`;

export type TagWithParent = {
  name: string;
  parent: string | null;
};

type CollectionMap = {
  tags: string[];
  tagsWithHierarchy: TagWithParent[];
  projects: Project[];
  areas: Area[];
  lists: List[];
};

const jxaFetches = [
  { name: 'tags', needs: ['tags'], expr: `things.tags().map(${mapTagJxa})` },
  { name: 'tagsWithHierarchy', needs: ['tagsWithHierarchy'], expr: `things.tags().map(${mapTagWithHierarchyJxa})` },
  { name: 'projects', needs: ['projects', 'lists'], expr: `things.projects().map(${mapProjectJxa})` },
  { name: 'areas', needs: ['areas', 'lists'], expr: `things.areas().map(${mapAreaJxa})` },
];

export async function getCollections<K extends keyof CollectionMap>(...keys: K[]): Promise<Pick<CollectionMap, K>> {
  const keySet = new Set<string>(keys);

  const script = [
    `const things = Application('${preferences.thingsAppIdentifier}');`,
    `const result = {};`,
    ...jxaFetches
      .filter(({ needs }) => needs.some((k) => keySet.has(k)))
      .map(({ name, expr }) => `result.${name} = ${expr};`),
    `return result;`,
  ].join('\n');

  const raw = await executeJxa(script, `Get ${keys.join(', ')}`);

  return Object.fromEntries(
    keys.map((key) => [key, key === 'lists' ? organizeLists(raw.projects, raw.areas) : raw[key]]),
  ) as Pick<CollectionMap, K>;
}

function organizeLists(projects: Project[] = [], areas: Area[] = []): List[] {
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

type QuickFindData = {
  areas: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; areaName?: string }>;
  todos: Array<{ id: string; name: string; status: string; projectName?: string; areaName?: string }>;
};

// Read directly from Things' SQLite database — bypasses Apple Events entirely.
// A single SQL query with JOINs replaces hundreds of serialized Apple Events,
// reducing initial load from ~15s to <100ms.
const getQuickFindDataFromDB = async (): Promise<QuickFindData> => {
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

// JXA fallback — used only if SQLite access fails (e.g., DB path changed).
// Mirrors the SQLite query: all open, non-trashed todos regardless of which
// list they live in (Inbox, Today, Anytime, Upcoming, Someday, or a project).
const getQuickFindDataJXA = async (): Promise<QuickFindData> => {
  return executeJxa(
    `
    const things = Application('${preferences.thingsAppIdentifier}');
    const areas = things.areas().map(area => ({ id: area.id(), name: area.name() }));
    const projects = things.projects().map(project => ({
      id: project.id(), name: project.name(),
      areaName: project.area() && project.area().name(),
    }));
    const todos = things.toDos().filter(t => t.status() === 'open').map(todo => ({
      id: todo.id(),
      name: todo.name(),
      status: 'open',
      projectName: todo.project() && todo.project().name(),
      areaName: todo.area() && todo.area().name(),
    }));
    return { areas, projects, todos };
  `,
    'Get quick find data',
  );
};

// Try SQLite first (fast, <100ms), fall back to JXA if DB access fails
export const getQuickFindData = async (): Promise<QuickFindData> => {
  try {
    return await getQuickFindDataFromDB();
  } catch (error) {
    console.warn('Quick Find: SQLite query failed, falling back to JXA:', error);
    return getQuickFindDataJXA();
  }
};

export async function silentlyOpenThingsURL(url: string) {
  const asyncExec = promisify(exec);
  await asyncExec(`open -g "${url}"`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateQueryString(params: Record<string, any>): string {
  return queryString.stringify(params, {
    skipNull: true,
    skipEmptyString: true,
  });
}

export async function updateTodo(id: string, todoParams: UpdateTodoParams) {
  const { authToken } = getPreferenceValues<Preferences>();

  if (!authToken) throw new Error('unauthorized');

  await silentlyOpenThingsURL(
    `things:///update?${generateQueryString({
      'auth-token': authToken,
      id,
      ...todoParams,
    })}`,
  );
}

export async function updateProject(id: string, projectParams: UpdateProjectParams) {
  const { authToken } = getPreferenceValues<Preferences>();

  if (!authToken) throw new Error('unauthorized');

  await silentlyOpenThingsURL(
    `things:///update-project?${generateQueryString({
      'auth-token': authToken,
      id,
      ...projectParams,
    })}`,
  );
}

export async function addTodo(todoParams: AddTodoParams) {
  await silentlyOpenThingsURL(`things:///add?${generateQueryString(todoParams)}`);
}

export async function addProject(projectParams: AddProjectParams) {
  await silentlyOpenThingsURL(`things:///add-project?${generateQueryString(projectParams)}`);
}

export async function handleError(error: unknown, title?: string) {
  if (error instanceof Error && error.message === 'unauthorized') {
    await showToast({
      style: Toast.Style.Failure,
      title: 'This action needs an authentication token.',
      message: `Please set it in the extension preferences.\nYou can find your unique token in Things' settings. go to Things → Settings → General → Enable Things URLs → Manage`,
      primaryAction: {
        title: 'Open Extension Preferences',
        onAction(toast) {
          openExtensionPreferences();
          toast.hide();
        },
      },
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: title ?? 'Something went wrong',
    message: error instanceof Error ? error.message : String(error),
  });
}
