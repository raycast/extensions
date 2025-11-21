import { ensureValidSession, clearStoredSession, getSessionCookies } from "./auth";
import { AttendanceResponse, ModifyPageData } from "./types";
import { SSL_BASE_URL } from "./constants";
import { parseAttendanceHtml } from "./parse-attendance";
import { parse } from "node-html-parser";
import { parseClockFields } from "./clock-fields";

/**
 * Result of clocking validation
 */
interface ClockingValidation {
  supported: boolean;
  missingFields: string[];
}

/**
 * Get default headers for API requests
 */
async function getDefaultHeaders(skipValidation = false): Promise<Record<string, string>> {
  if (!skipValidation) {
    await ensureValidSession(); // Ensure session is valid
  }
  const cookies = await getSessionCookies(); // Get all cookies

  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: cookies,
    Referer: `${SSL_BASE_URL}/employee`,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };
}

/**
 * Get attendance data for a specific month
 */
export async function getAttendance(year?: number, month?: number): Promise<AttendanceResponse> {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const headers = await getDefaultHeaders();

  // Calculate first and last day of the month
  const firstDay = 1;
  const lastDay = new Date(targetYear, targetMonth, 0).getDate(); // Get last day of month

  // Build URL with query parameters
  const params = new URLSearchParams({
    list_type: "normal",
    search_type: "month",
    month: String(targetMonth),
    year: String(targetYear),
    "from[m]": String(targetMonth),
    "from[d]": String(firstDay),
    "from[y]": String(targetYear),
    "to[m]": String(targetMonth),
    "to[d]": String(lastDay),
    "to[y]": String(targetYear),
  });

  const url = `${SSL_BASE_URL}/employee/attendance?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  const html = await response.text();

  // Check if response is a login page (more specific detection)
  const isEmployeePage =
    html.includes("jbc-container") || html.includes("Attendance Book") || html.includes("JOBCAN MyPage");
  const isLoginPage =
    (html.includes('id="login-contents"') ||
      html.includes('action="/users/sign_in"') ||
      (html.includes("/users/sign_in") && html.includes('type="password"'))) &&
    !isEmployeePage;

  if (response.status === 401 || response.status === 403 || isLoginPage) {
    console.debug(
      `[API] ${response.status === 401 || response.status === 403 ? `${response.status} Unauthorized` : "Login page detected"} - Session may have expired`,
    );
    // Try to refresh session and retry
    try {
      console.debug(`[API] Attempting to re-authenticate...`);
      // Clear the invalid session and force a fresh login
      await clearStoredSession();
      console.debug(`[API] Cleared invalid session, forcing fresh login`);
      const newSid = await ensureValidSession();
      console.debug(`[API] Re-authenticated, got new sid: ${newSid.substring(0, 10)}...`);
      const newHeaders = await getDefaultHeaders();
      const retryResponse = await fetch(url, {
        method: "GET",
        headers: newHeaders,
      });

      if (!retryResponse.ok) {
        throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
      }

      const retryHtml = await retryResponse.text();

      // Check if still a login page (more specific detection)
      const isRetryEmployeePage =
        retryHtml.includes("jbc-container") ||
        retryHtml.includes("Attendance Book") ||
        retryHtml.includes("JOBCAN MyPage");
      const isRetryLoginPage =
        (retryHtml.includes('id="login-contents"') ||
          retryHtml.includes('action="/users/sign_in"') ||
          (retryHtml.includes("/users/sign_in") && retryHtml.includes('type="password"'))) &&
        !isRetryEmployeePage;

      if (isRetryLoginPage) {
        throw new Error("Session appears to be invalid. Please check your credentials and try logging in again.");
      }

      const result = parseAttendanceHtml(retryHtml, targetYear, targetMonth);
      return result;
    } catch (error) {
      console.debug(`[API] Authentication failed for ${url}: ${error}`);
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}. Please check your credentials.`,
      );
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.debug(`[API] GET ${url} - Error ${response.status}: ${errorText.substring(0, 200)}`);
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  // Check for error messages
  if (html.includes("error") || html.includes("Error") || html.includes("エラー")) {
    const errorMatch = html.match(/<[^>]*error[^>]*>([^<]+)/i);
    if (errorMatch) {
      console.debug(`[API] Error text found: ${errorMatch[1]}`);
    }
  }

  const result = parseAttendanceHtml(html, targetYear, targetMonth);
  return result;
}

/**
 * Get modify page data (token, client_id, employee_id, available spots)
 */
export async function getModifyPageData(year: number, month: number, day: number): Promise<ModifyPageData> {
  const headers = await getDefaultHeaders();
  const url = `${SSL_BASE_URL}/employee/adit/modify?year=${year}&month=${month}&day=${day}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch modify page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Check if it's a login page
  if (html.includes("sign_in") || html.includes("ログイン")) {
    console.debug(`[API] Modify page returned login page - session expired`);
    throw new Error("Session expired. Please try again.");
  }

  const root = parse(html);

  // Extract token
  const tokenInput = root.querySelector('input[name="token"]');
  if (!tokenInput) {
    throw new Error("Could not find token in modify page");
  }
  const token = tokenInput.getAttribute("value") || "";

  // Extract client_id
  const clientIdInput = root.querySelector('input[name="client_id"]');
  if (!clientIdInput) {
    throw new Error("Could not find client_id in modify page");
  }
  const clientId = clientIdInput.getAttribute("value") || "";

  // Extract employee_id
  const employeeIdInput = root.querySelector('input[name="employee_id"]');
  if (!employeeIdInput) {
    throw new Error("Could not find employee_id in modify page");
  }
  const employeeId = employeeIdInput.getAttribute("value") || "";

  // Extract available spots (group_id dropdown)
  const groupSelect = root.querySelector('select[name="group_id"]');
  const availableSpots: Array<{ id: string; name: string }> = [];

  if (groupSelect) {
    const options = groupSelect.querySelectorAll("option");
    for (const option of options) {
      const id = option.getAttribute("value") || "";
      const name = option.text.trim();
      if (id && name) {
        availableSpots.push({ id, name });
      }
    }
  }

  // Parse all form fields from HTML
  const formFields = parseClockFields(html);

  return {
    token,
    clientId,
    employeeId,
    availableSpots,
    formFields,
  };
}

/**
 * Validate that all required fields are supported
 */
function validateClockingSupport(modifyPageData: ModifyPageData): ClockingValidation {
  const missingFields: string[] = [];

  if (!modifyPageData.token) {
    missingFields.push("token");
  }
  if (!modifyPageData.clientId) {
    missingFields.push("client_id");
  }
  if (!modifyPageData.employeeId) {
    missingFields.push("employee_id");
  }
  if (modifyPageData.availableSpots.length === 0) {
    missingFields.push("group_id (no spots available)");
  }

  return {
    supported: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Convert HH:MM format to HHMM format for API
 */
function convertTimeFormat(time: string): string {
  return time.replace(":", "");
}

/**
 * Clock In & Out for a specific date
 * Accepts either individual parameters (for backward compatibility) or a field value map
 */
export async function clockInOut(
  date: Date,
  clockInTimeOrFieldMap: string | Record<string, string>,
  clockOutTime?: string,
  spotNameOrId?: string,
  notes?: string,
): Promise<void> {
  // Handle new field map format
  let clockInTime: string;
  let clockOutTimeValue: string;
  let spotNameOrIdValue: string;
  let notesValue: string;

  if (typeof clockInTimeOrFieldMap === "object") {
    // New format: field value map
    const fieldMap = clockInTimeOrFieldMap;
    clockInTime = fieldMap.clockInTime || "10:00";
    clockOutTimeValue = fieldMap.clockOutTime || "19:00";
    spotNameOrIdValue = fieldMap.group_id || "";
    notesValue = fieldMap.notice || "";
  } else {
    // Old format: individual parameters (backward compatibility)
    clockInTime = clockInTimeOrFieldMap;
    clockOutTimeValue = clockOutTime || "19:00";
    spotNameOrIdValue = spotNameOrId || "";
    notesValue = notes || "";
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  console.debug(`[API] Starting Clock In & Out for ${year}/${month}/${day}`);

  // Step 1: Get modify page data
  const modifyData = await getModifyPageData(year, month, day);

  // Step 2: Validate support
  const validation = validateClockingSupport(modifyData);
  if (!validation.supported) {
    throw new Error(`Clocking not supported. Missing fields: ${validation.missingFields.join(", ")}`);
  }

  // Step 3: Resolve group_id from name or use directly if it's an ID
  let groupId = spotNameOrIdValue;
  if (spotNameOrIdValue && !spotNameOrIdValue.match(/^\d+$/)) {
    // It's a name, find matching spot
    const spot = modifyData.availableSpots.find(
      (s) =>
        s.name.toLowerCase().includes(spotNameOrIdValue.toLowerCase()) ||
        spotNameOrIdValue.toLowerCase().includes(s.name.toLowerCase()),
    );
    if (spot) {
      groupId = spot.id;
      console.debug(`[API] Resolved spot name "${spotNameOrIdValue}" to group_id=${groupId}`);
    } else {
      groupId = modifyData.availableSpots[0].id;
    }
  } else if (!spotNameOrIdValue) {
    // Use first available spot
    groupId = modifyData.availableSpots[0].id;
  }

  if (!notesValue) {
    throw new Error("Notes are required for clocking in/out");
  }

  // Use skipValidation for clock requests since we just validated in getModifyPageData
  const headers = await getDefaultHeaders(true);
  const insertUrl = `${SSL_BASE_URL}/employee/adit/insert/`;

  // Step 4: Clock in
  console.debug(`[API] Clocking in at ${clockInTime}...`);
  const clockInBody = new URLSearchParams({
    token: modifyData.token,
    year: String(year),
    month: String(month),
    day: String(day),
    client_id: modifyData.clientId,
    employee_id: modifyData.employeeId,
    delete_minutes: "",
    time: convertTimeFormat(clockInTime),
    group_id: groupId,
    notice: notesValue,
    _: "",
  });

  const clockInResponse = await fetch(insertUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "text/javascript, text/html, application/xml, text/xml, */*",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: clockInBody.toString(),
  });

  if (!clockInResponse.ok) {
    throw new Error(`Clock in failed: ${clockInResponse.status} ${clockInResponse.statusText}`);
  }

  const clockInResult = (await clockInResponse.json()) as { result: number };
  if (clockInResult.result !== 1) {
    throw new Error(`Clock in failed: ${JSON.stringify(clockInResult)}`);
  }

  // Step 5: Clock out
  console.debug(`[API] Clocking out at ${clockOutTimeValue}...`);
  const clockOutBody = new URLSearchParams({
    token: modifyData.token,
    year: String(year),
    month: String(month),
    day: String(day),
    client_id: modifyData.clientId,
    employee_id: modifyData.employeeId,
    delete_minutes: "",
    time: convertTimeFormat(clockOutTimeValue),
    group_id: groupId,
    notice: notesValue,
    _: "",
  });

  const clockOutResponse = await fetch(insertUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "text/javascript, text/html, application/xml, text/xml, */*",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: clockOutBody.toString(),
  });

  if (!clockOutResponse.ok) {
    throw new Error(`Clock out failed: ${clockOutResponse.status} ${clockOutResponse.statusText}`);
  }

  const clockOutResult = (await clockOutResponse.json()) as { result: number };
  if (clockOutResult.result !== 1) {
    throw new Error(`Clock out failed: ${JSON.stringify(clockOutResult)}`);
  }

  console.debug(`[API] Clock In & Out completed successfully`);
}
