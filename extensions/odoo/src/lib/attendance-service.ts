import { executeKw, normalizeBaseUrl, OdooRpcError } from "./odoo-jsonrpc";
import { ODOO_DATABASE_NAME, ODOO_INSTANCE_URL } from "./odoo-internal-config";
import { authenticateRpcContext, getEmployeeForRpcContext, type MindnowOdooCredentials } from "./odoo-employee";
import { systrayAttendanceToggle, webSessionAuthenticate } from "./odoo-web-session";

/** Raycast preferences (email + password / API key only). URL and DB are fixed for Mindnow internal use. */
export type AttendanceCredentials = MindnowOdooCredentials;

type OdooSessionPrefs = {
  url: string;
  database: string;
  email: string;
  password: string;
};

function resolveOdooPrefs(creds: AttendanceCredentials): OdooSessionPrefs {
  return {
    url: ODOO_INSTANCE_URL,
    database: ODOO_DATABASE_NAME,
    email: creds.email,
    password: creds.password,
  };
}

export type AttendanceStatus =
  | {
      state: "out";
      employeeId: number;
      employeeName: string;
    }
  | {
      state: "in";
      employeeId: number;
      employeeName: string;
      attendanceId: number;
      checkIn: Date;
    };

/** Parse Odoo naive datetime strings as UTC (typical for SaaS). */
export function parseOdooDatetime(s: string): Date {
  if (s.includes("T")) {
    return new Date(s);
  }
  return new Date(s.replace(" ", "T") + "Z");
}

export function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

type AttendanceRow = { id: number; check_in: string | false; check_out: string | false };
type TodayAttendanceRow = {
  worked_hours: number | false;
  check_in: string | false;
  check_out: string | false;
};

export type AttendanceSummary = AttendanceStatus & {
  /** Sum of worked time for your local calendar day (Odoo naive datetimes vs local date filter). */
  todayWorkedMs: number;
};

function localCalendarDayDomain(): [string, string] {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const mo = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  return [`${y}-${mo}-${d} 00:00:00`, `${y}-${mo}-${d} 23:59:59`];
}

async function sumTodayWorkedMs(prefs: OdooSessionPrefs, employeeId: number): Promise<number> {
  const { baseUrl, uid } = await session(prefs);
  const password = prefs.password;
  const db = prefs.database;
  const [dayStart, dayEnd] = localCalendarDayDomain();

  const rows = await executeKw<TodayAttendanceRow[]>(
    baseUrl,
    db,
    uid,
    password,
    "hr.attendance",
    "search_read",
    [
      [
        ["employee_id", "=", employeeId],
        ["check_in", ">=", dayStart],
        ["check_in", "<=", dayEnd],
      ],
    ],
    { fields: ["worked_hours", "check_in", "check_out"], order: "check_in asc" },
  );

  let ms = 0;
  for (const row of rows) {
    const wh = row.worked_hours;
    if (typeof wh === "number" && wh > 0) {
      ms += wh * 3600 * 1000;
      continue;
    }
    const cin = row.check_in;
    if (typeof cin !== "string") continue;
    const start = parseOdooDatetime(cin);
    const cout = row.check_out;
    const end = cout === false ? Date.now() : parseOdooDatetime(String(cout));
    ms += Math.max(0, end - start.getTime());
  }
  return ms;
}

export async function getAttendanceSummary(creds: AttendanceCredentials): Promise<AttendanceSummary> {
  const prefs = resolveOdooPrefs(creds);
  const status = await getAttendanceStatus(creds);
  const todayWorkedMs = await sumTodayWorkedMs(prefs, status.employeeId);
  return { ...status, todayWorkedMs };
}

async function session(prefs: OdooSessionPrefs) {
  const ctx = await authenticateRpcContext({
    email: prefs.email,
    password: prefs.password,
  });
  return { baseUrl: ctx.baseUrl, uid: ctx.uid };
}

export async function getAttendanceStatus(creds: AttendanceCredentials): Promise<AttendanceStatus> {
  const ctx = await authenticateRpcContext(creds);
  const { baseUrl, uid, password, database: db } = ctx;

  const { id: employeeId, name: employeeName } = await getEmployeeForRpcContext(ctx);

  const open = await executeKw<AttendanceRow[]>(
    baseUrl,
    db,
    uid,
    password,
    "hr.attendance",
    "search_read",
    [
      [
        ["employee_id", "=", employeeId],
        ["check_out", "=", false],
      ],
    ],
    {
      fields: ["check_in", "check_out"],
      limit: 1,
      order: "check_in desc",
    },
  );

  if (!open.length) {
    return { state: "out", employeeId, employeeName };
  }

  const row = open[0];
  const checkInRaw = row.check_in;
  if (!checkInRaw || typeof checkInRaw !== "string") {
    throw new OdooRpcError("Invalid attendance record: missing check-in time.");
  }

  return {
    state: "in",
    employeeId,
    employeeName,
    attendanceId: row.id,
    checkIn: parseOdooDatetime(checkInRaw),
  };
}

/**
 * Uses the same HTTP route as the Odoo systray (`/hr_attendance/systray_check_in_out`), so permissions match the UI.
 * Direct JSON-RPC `hr.attendance` create/write requires Attendance Officer / Manager groups on many databases.
 */
export async function toggleCheckInOut(creds: AttendanceCredentials): Promise<AttendanceStatus> {
  const prefs = resolveOdooPrefs(creds);
  const baseUrl = normalizeBaseUrl(prefs.url);
  const sessionId = await webSessionAuthenticate(baseUrl, prefs.database, prefs.email, prefs.password);
  await systrayAttendanceToggle(baseUrl, sessionId);
  return getAttendanceStatus(creds);
}
