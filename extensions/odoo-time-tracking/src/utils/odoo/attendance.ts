/**
 * Attendance API for check-in/check-out functionality
 */

import { getAuthenticatedClient } from "./auth";
import { AttendanceState, CachedData } from "./types";
import { getStorage } from "./storage";

// Cache configuration
const ATTENDANCE_CACHE_KEY = "odoo_attendance_cache";
const ATTENDANCE_CACHE_TTL = 60 * 1000; // 1 minute

async function cacheAttendanceState(state: AttendanceState): Promise<void> {
  const cached: CachedData<AttendanceState> = { data: state, timestamp: Date.now() };
  await getStorage().setItem(ATTENDANCE_CACHE_KEY, JSON.stringify(cached));
}

async function getCachedAttendanceState(): Promise<AttendanceState | null> {
  const raw = await getStorage().getItem(ATTENDANCE_CACHE_KEY);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as CachedData<AttendanceState>;
    if (Date.now() - cached.timestamp < ATTENDANCE_CACHE_TTL) {
      return cached.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get current attendance status
 */
export async function getAttendanceStatus(useCache = true): Promise<AttendanceState> {
  // Try to use cached data first
  if (useCache) {
    const cached = await getCachedAttendanceState();
    if (cached) {
      return cached;
    }
  }

  const client = await getAuthenticatedClient();

  try {
    // Call Odoo's attendance user data endpoint
    const result = await client.request<AttendanceState>("/hr_attendance/attendance_user_data", {});

    // Cache the result
    await cacheAttendanceState(result);

    return result;
  } catch (error) {
    // If the endpoint fails, try an alternative approach
    // Some Odoo versions might have different endpoints
    try {
      const result = await client.callKw<{
        attendance_state: "checked_in" | "checked_out";
        last_attendance_id: number | false;
        hours_today: number;
      }>("hr.employee", "attendance_user_data", []);

      // Transform to our expected format
      const attendanceState: AttendanceState = {
        attendance_state: result.attendance_state,
        last_check_in: null,
        last_check_out: null,
        hours_today: result.hours_today || 0,
        employee_name: "",
      };

      // Cache the result
      await cacheAttendanceState(attendanceState);

      return attendanceState;
    } catch {
      throw error; // Throw the original error
    }
  }
}

/**
 * Toggle check-in/check-out status
 */
export async function toggleCheckInOut(): Promise<AttendanceState> {
  const client = await getAuthenticatedClient();

  try {
    // Call Odoo's check-in/out toggle endpoint
    const result = await client.request<AttendanceState>("/hr_attendance/systray_check_in_out", {});

    // Cache the new state
    await cacheAttendanceState(result);

    return result;
  } catch (error) {
    // If the endpoint fails, try an alternative approach
    try {
      const currentState = await getAttendanceStatus(false);

      // Call the appropriate method based on current state
      if (currentState.attendance_state === "checked_out") {
        // Check in
        await client.callKw("hr.employee", "attendance_manual", [
          [], // No specific employee IDs (uses current user's employee)
          "hr_attendance.hr_attendance_action_my_attendances",
        ]);
      } else {
        // Check out
        await client.callKw("hr.employee", "attendance_manual", [
          [], // No specific employee IDs (uses current user's employee)
          "hr_attendance.hr_attendance_action_my_attendances",
        ]);
      }

      // Fetch the new state
      return await getAttendanceStatus(false);
    } catch {
      throw error; // Throw the original error
    }
  }
}

/**
 * Check if user is currently checked in
 */
export async function isCheckedIn(): Promise<boolean> {
  const state = await getAttendanceStatus();
  return state.attendance_state === "checked_in";
}

/**
 * Get hours worked today
 */
export async function getHoursToday(): Promise<number> {
  const state = await getAttendanceStatus();
  return state.hours_today || 0;
}
