import { executeKw } from "./odoo-jsonrpc";
import { authenticateRpcContext, getEmployeeForRpcContext, type MindnowOdooCredentials } from "./odoo-employee";

/** Rolling window for the timesheets list (days including today). */
export const TIMESHEET_LIST_LOOKBACK_DAYS = 30;

export type ProjectRow = { id: number; name: string };
export type TaskRow = { id: number; name: string };

export type TimesheetLine = {
  id: number;
  /** ISO date YYYY-MM-DD */
  date: string;
  description: string;
  hours: number;
  projectName: string | null;
  taskName: string | null;
};

type AnalyticLineRead = {
  id: number;
  date: string | false;
  name: string | false;
  unit_amount: number | false;
  project_id: [number, string] | false;
  task_id: [number, string] | false;
};

type ProjectRead = { id: number; name: string | false };
type TaskRead = { id: number; name: string | false };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function defaultTimesheetDateRange(): { dateFrom: string; dateTo: string } {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - (TIMESHEET_LIST_LOOKBACK_DAYS - 1));
  return { dateFrom: toIsoDate(dateFrom), dateTo: toIsoDate(dateTo) };
}

function normalizeOdooDate(raw: string | false): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const s = raw.trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function many2oneLabel(v: [number, string] | false | undefined): string | null {
  if (v === false || v === undefined) return null;
  if (Array.isArray(v) && typeof v[1] === "string" && v[1].trim()) return v[1].trim();
  return null;
}

function normalizeLine(row: AnalyticLineRead): TimesheetLine {
  const date = normalizeOdooDate(row.date);
  const desc = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "/";
  const ua = row.unit_amount;
  const hours = typeof ua === "number" && !Number.isNaN(ua) ? ua : 0;
  return {
    id: row.id,
    date,
    description: desc,
    hours,
    projectName: many2oneLabel(row.project_id),
    taskName: many2oneLabel(row.task_id),
  };
}

function normalizeProject(row: ProjectRead): ProjectRow {
  const n = typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Project #${row.id}`;
  return { id: row.id, name: n };
}

function normalizeTask(row: TaskRead): TaskRow {
  const n = typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Task #${row.id}`;
  return { id: row.id, name: n };
}

export async function listTimesheetLines(
  creds: MindnowOdooCredentials,
  range: { dateFrom: string; dateTo: string } = defaultTimesheetDateRange(),
): Promise<TimesheetLine[]> {
  const ctx = await authenticateRpcContext(creds);
  const emp = await getEmployeeForRpcContext(ctx);

  const rows = await executeKw<AnalyticLineRead[]>(
    ctx.baseUrl,
    ctx.database,
    ctx.uid,
    ctx.password,
    "account.analytic.line",
    "search_read",
    [
      [
        ["employee_id", "=", emp.id],
        ["date", ">=", range.dateFrom],
        ["date", "<=", range.dateTo],
      ],
    ],
    {
      fields: ["date", "name", "unit_amount", "project_id", "task_id"],
      order: "date desc, id desc",
      limit: 500,
    },
  );

  return rows.map(normalizeLine);
}

export async function listProjects(creds: MindnowOdooCredentials): Promise<ProjectRow[]> {
  const ctx = await authenticateRpcContext(creds);

  const rows = await executeKw<ProjectRead[]>(
    ctx.baseUrl,
    ctx.database,
    ctx.uid,
    ctx.password,
    "project.project",
    "search_read",
    [[["active", "=", true]]],
    { fields: ["name"], order: "name asc", limit: 200 },
  );

  return rows.map(normalizeProject);
}

export async function listTasksForProject(creds: MindnowOdooCredentials, projectId: number): Promise<TaskRow[]> {
  const ctx = await authenticateRpcContext(creds);

  const rows = await executeKw<TaskRead[]>(
    ctx.baseUrl,
    ctx.database,
    ctx.uid,
    ctx.password,
    "project.task",
    "search_read",
    [[["project_id", "=", projectId]]],
    { fields: ["name"], order: "name asc", limit: 200 },
  );

  return rows.map(normalizeTask);
}

export type CreateTimesheetLineInput = {
  projectId: number;
  taskId: number;
  /** YYYY-MM-DD */
  date: string;
  hours: number;
  /** Odoo line description (`name`); optional (defaults to `/`). */
  description?: string;
};

export async function createTimesheetLine(
  creds: MindnowOdooCredentials,
  input: CreateTimesheetLineInput,
): Promise<number> {
  const ctx = await authenticateRpcContext(creds);
  const emp = await getEmployeeForRpcContext(ctx);

  const name = typeof input.description === "string" && input.description.trim() ? input.description.trim() : "/";

  const newId = await executeKw<number>(
    ctx.baseUrl,
    ctx.database,
    ctx.uid,
    ctx.password,
    "account.analytic.line",
    "create",
    [
      {
        employee_id: emp.id,
        project_id: input.projectId,
        task_id: input.taskId,
        date: input.date,
        unit_amount: input.hours,
        name,
      },
    ],
  );

  return newId;
}
