/**
 * Portable Odoo API package
 *
 * Usage:
 *   import { initStorage, login, getAttendanceStatus } from "./utils/odoo";
 *
 *   // Initialize once with your storage backend
 *   initStorage(myStorageProvider);
 *
 *   // Then use any API function
 *   await login("https://mycompany.odoo.com", "user", "pass");
 */

// Storage setup (must be called before using any other export)
export { initStorage } from "./storage";
export type { StorageProvider } from "./storage";

// Client
export { OdooClient } from "./client";

// Auth
export { login, logout, getStoredSession, getAuthenticatedClient, hasActiveSession } from "./auth";

// Attendance
export { getAttendanceStatus, toggleCheckInOut, isCheckedIn, getHoursToday } from "./attendance";

// Timesheet
export {
  startTimer,
  updateTimer,
  startTimerWithDetails,
  assignTimerDetails,
  stopTimer,
  cancelTimer,
  getProjects,
  getTasks,
  createTask,
  getServerTime,
  getRunningTimer,
  getTimerState,
  hasActiveTimer,
} from "./timesheet";

// Types
export type {
  SessionInfo,
  LoginResponse,
  AttendanceState,
  AttendanceResponse,
  Project,
  Task,
  TimerState,
  TimerStartResponse,
  ServerTimeResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  CachedData,
} from "./types";
export { OdooApiError, SessionExpiredError } from "./types";

// Formatting utilities
export {
  formatDuration,
  formatHours,
  getElapsedSeconds,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  truncate,
  formatMenuBarTitle,
} from "./format";
