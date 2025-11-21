// Session Types
export interface SessionData {
  sid: string;
  cookies: string; // All session cookies (e.g., "locale=en; _jbcid_session=...; sid=...")
  expiry: number; // Unix timestamp in milliseconds
}

// Attendance Types

/**
 * Raw attendance entry as parsed from HTML
 */
export interface AttendanceEntryRaw {
  date: string; // Format: YYYY-MM-DD
  dayOfWeek: string; // e.g., "Mon", "Tue"
  holidayType?: string; // e.g., "National", "Legal", "Public National"
  shiftTime?: string; // e.g., "11:00～15:00"
  clockIn?: string; // e.g., "09:00"
  clockOut?: string; // e.g., "18:00"
  workingHours?: string; // e.g., "08:00"
  offShiftWorkingHours?: string; // e.g., "00:00"
  overtime?: string; // e.g., "00:00"
  nightShift?: string; // e.g., "00:00"
  break?: string; // e.g., "01:00"
  status: string[]; // e.g., ["A"] for Absence, ["L"] for Late, ["PV"] for Paid Vacation
  statusTooltip?: string; // Tooltip text for status
  isPending?: boolean; // Row has class 'jbc-table-warning' (clock-in/out pending approval)
}

/**
 * Attendance status enum for processed entries
 */
export enum AttendanceStatus {
  Pending = "pending", // Pending (table row has class 'jbc-table-warning')
  Logged = "logged", // Fully logged with clock-in, clock-out, and working hours
  HolidayWork = "holiday_work", // Worked on a holiday
  Absence = "absence", // Absent (status: A)
  Late = "late", // Late clock-in (status: L)
  PaidVacation = "paid_vacation", // Paid vacation (status: PV)
  SubstitutionHoliday = "substitution_holiday", // Substitution holiday (status: SH)
  Holiday = "holiday", // Holiday with no work
  Unlogged = "unlogged", // Not yet logged or incomplete
}

/**
 * Processed attendance entry for UI consumption
 */
export interface AttendanceEntry {
  date: string; // Format: YYYY-MM-DD
  dayOfWeek: string; // e.g., "Mon", "Tue"
  holidayType?: string; // e.g., "National", "Legal", "Public National"
  shiftTime?: string; // e.g., "11:00～15:00"
  clockIn?: string; // e.g., "09:00"
  clockOut?: string; // e.g., "18:00"
  workingHours?: string; // e.g., "08:00"
  offShiftWorkingHours?: string; // e.g., "00:00"
  overtime?: string; // e.g., "00:00"
  nightShift?: string; // e.g., "00:00"
  break?: string; // e.g., "01:00"
  status: AttendanceStatus; // Primary status for this entry
  rawStatus: string[]; // Original status codes from HTML
  statusTooltip?: string; // Tooltip text for status
  isLogged: boolean; // Has clock-in, clock-out, and working hours
  isHoliday: boolean; // Is a holiday (with or without work)
}

export interface AttendanceResponse {
  entries: AttendanceEntry[];
  year: number;
  month: number;
}

// Clocking Types

/**
 * Clock field definition (re-exported from clock-fields.ts for convenience)
 */
export type { ClockField } from "./clock-fields";
import type { ClockField } from "./clock-fields";

/**
 * Data extracted from the modify page
 */
export interface ModifyPageData {
  token: string;
  clientId: string;
  employeeId: string;
  availableSpots: Array<{ id: string; name: string }>;
  formFields: ClockField[]; // Form fields detected from the modify page
}

/**
 * Transform raw attendance entry to processed entry for UI
 */
export function transformAttendanceEntry(raw: AttendanceEntryRaw): AttendanceEntry {
  const isLogged = !!(raw.clockIn && raw.clockOut && raw.workingHours);
  const isHoliday = !!raw.holidayType;

  // Determine primary status
  let status: AttendanceStatus;

  // Check for pending status first (highest priority)
  if (raw.isPending) {
    status = AttendanceStatus.Pending;
  } else if (isHoliday && isLogged) {
    status = AttendanceStatus.HolidayWork;
  } else if (isLogged) {
    status = AttendanceStatus.Logged;
  } else if (raw.status.includes("A")) {
    status = AttendanceStatus.Absence;
  } else if (raw.status.includes("L")) {
    status = AttendanceStatus.Late;
  } else if (raw.status.includes("PV")) {
    status = AttendanceStatus.PaidVacation;
  } else if (raw.status.includes("SH")) {
    status = AttendanceStatus.SubstitutionHoliday;
  } else if (isHoliday) {
    status = AttendanceStatus.Holiday;
  } else {
    status = AttendanceStatus.Unlogged;
  }

  return {
    date: raw.date,
    dayOfWeek: raw.dayOfWeek,
    holidayType: raw.holidayType,
    shiftTime: raw.shiftTime,
    clockIn: raw.clockIn,
    clockOut: raw.clockOut,
    workingHours: raw.workingHours,
    offShiftWorkingHours: raw.offShiftWorkingHours,
    overtime: raw.overtime,
    nightShift: raw.nightShift,
    break: raw.break,
    status,
    rawStatus: raw.status,
    statusTooltip: raw.statusTooltip,
    isLogged,
    isHoliday,
  };
}
