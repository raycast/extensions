/**
 * TypeScript type definitions for Odoo API responses and data structures
 */

// Session and authentication types
export interface SessionInfo {
  sessionId: string;
  baseUrl: string;
  userId: number;
  companyId: number;
  employeeId: number;
  employeeName: string;
  username: string;
  cookies?: string[]; // HTTP cookies for session maintenance
}

export interface LoginResponse {
  jsonrpc: string;
  id: number;
  result: {
    uid: number;
    username: string;
    name: string;
    company_id: number;
    partner_id: number;
    session_id: string;
  };
}

// Attendance types
export interface AttendanceState {
  attendance_state: "checked_in" | "checked_out";
  last_check_in: string | null;
  last_check_out: string | null;
  hours_today: number;
  employee_name: string;
}

export interface AttendanceResponse {
  jsonrpc: string;
  id: number;
  result: AttendanceState;
}

// Timesheet and timer types
export interface Project {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  name: string;
}

export interface TimerState {
  timerId: number | null;
  projectId: number | null;
  projectName: string | null;
  taskId: number | null;
  taskName: string | null;
  description: string | null;
  startTime: string | null;
}

export interface TimerStartResponse {
  jsonrpc: string;
  id: number;
  result: {
    id: number;
    start_time: string;
  };
}

export interface ServerTimeResponse {
  jsonrpc: string;
  id: number;
  result: string;
}

// JSON-RPC request/response types
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: Record<string, unknown>;
  id: number;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: {
      message: string;
      debug: string;
    };
  };
}

// Error types
export class OdooApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public debug?: string,
  ) {
    super(message);
    this.name = "OdooApiError";
  }
}

export class SessionExpiredError extends Error {
  constructor(message = "Session expired, please login again") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

// Cache types
export interface CachedData<T> {
  data: T;
  timestamp: number;
}
