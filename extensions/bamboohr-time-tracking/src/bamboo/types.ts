export interface RawTimesheetEntry {
  [key: string]: unknown;
}

export interface NormalizedTimeEntry {
  id?: string;
  date?: string;
  start?: Date;
  end?: Date;
  durationMs?: number;
  type?: string;
  note?: string;
  projectId?: string;
  projectName?: string;
  raw: RawTimesheetEntry;
}

export interface ClockStatus {
  status: "clocked_in" | "clocked_out";
  runningEntry?: NormalizedTimeEntry;
  lastEntry?: NormalizedTimeEntry;
  todayTotalMs: number;
}

export interface TimesheetEntryInput {
  start: Date;
  end?: Date;
  note?: string;
  type?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ClockEntryPayload {
  entries: ClockEntry[];
}

export interface ClockEntry {
  id?: number;
  employeeId: number;
  date: string;
  start: string;
  end?: string;
  note?: string;
  projectId?: number;
}

export interface WhosOutEntry {
  id: number;
  type: "timeOff" | "holiday";
  employeeId?: number;
  name: string;
  start: string;
  end: string;
}
