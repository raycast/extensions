import {
  getPreferenceValues,
  showToast,
  Toast,
  showInFinder,
} from "@raycast/api";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";
import {
  MoodleSiteInfo,
  MoodleCourse,
  MoodleCourseSection,
  MoodleAssignment,
  MoodleAssignmentsResponse,
  MoodleActionEventsResponse,
  MoodleNotificationsResponse,
} from "./types";
import { normalizeMoodleUrl } from "../utils/formatters";

export class MoodleError extends Error {
  constructor(
    message: string,
    public errorCode?: string,
    public exception?: string,
  ) {
    super(message);
    this.name = "MoodleError";
  }
}

const unsupportedMethodErrorCodes = new Set([
  "cannotfindthefunction",
  "functionnotavailable",
  "invalidfunction",
  "invalidmethod",
  "methodnotfound",
  "missingmethod",
  "unknownfunction",
  "unknownmethod",
]);

function isUnsupportedMethodError(error: unknown): boolean {
  return (
    error instanceof MoodleError &&
    typeof error.errorCode === "string" &&
    unsupportedMethodErrorCodes.has(error.errorCode.toLowerCase())
  );
}

/**
 * Detects whether the provided string is a MoodleSession cookie rather than a web service token.
 */
export function isSessionCookie(val: string): boolean {
  const clean = val.replace(/^MoodleSession=/i, "").trim();
  // Standard Moodle tokens are 32 hexadecimal characters (0-9, a-f)
  // Session cookies typically contain characters outside hex (e.g. g-z) and vary in length
  if (/[g-z]/i.test(clean)) return true;
  return clean.length !== 32;
}

/**
 * Extracts and cleans the token or session cookie.
 */
export function cleanToken(rawToken: string): string {
  let trimmed = (rawToken || "").trim();
  if (trimmed.startsWith("moodlemobile://token=")) {
    trimmed = trimmed.replace("moodlemobile://token=", "");
  }
  if (trimmed.startsWith("MoodleSession=")) {
    trimmed = trimmed.replace(/^MoodleSession=/i, "");
  }
  if (!isSessionCookie(trimmed)) {
    if (!/^[a-f0-9]{32}$/i.test(trimmed)) {
      try {
        const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
        const match = decoded.match(/[a-f0-9]{32}/i);
        if (match) {
          return match[0];
        }
      } catch {
        // ignore
      }
    }
  }
  return trimmed;
}

/**
 * Gets verified user preferences.
 */
export function getMoodlePrefs(): Preferences & {
  moodleUrl: string;
  apiToken: string;
} {
  const prefs = getPreferenceValues<Preferences>();
  const moodleUrl = prefs.moodleUrl.trim()
    ? normalizeMoodleUrl(prefs.moodleUrl)
    : "";
  const apiToken = cleanToken(prefs.apiToken);

  return {
    ...prefs,
    moodleUrl,
    apiToken,
  };
}

// ---------------------------------------------------------------------------
// Session Cookie Mode Helpers (for SSO users where Web Services are disabled)
// ---------------------------------------------------------------------------

interface SessionInfo {
  sesskey: string;
  userId: number;
  fullname: string;
  sitename: string;
  timestamp: number;
}

let cachedSessionInfo: SessionInfo | null = null;

async function getSessionInfo(): Promise<SessionInfo> {
  if (
    cachedSessionInfo &&
    Date.now() - cachedSessionInfo.timestamp < 1000 * 60 * 15
  ) {
    return cachedSessionInfo;
  }

  const { moodleUrl, apiToken } = getMoodlePrefs();
  const res = await fetch(`${moodleUrl}/my/`, {
    headers: {
      Cookie: `MoodleSession=${apiToken}`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });

  if (res.url.includes("/login/index.php")) {
    throw new MoodleError(
      "Your MoodleSession cookie has expired. Please copy the latest cookie value from your browser.",
    );
  }

  const html = await res.text();

  // Extract sesskey
  const sesskeyMatch =
    html.match(/"sesskey":"([a-zA-Z0-9]+)"/) ||
    html.match(/name="sesskey"\s+value="([a-zA-Z0-9]+)"/) ||
    html.match(/sesskey=([a-zA-Z0-9]+)/);

  if (!sesskeyMatch) {
    throw new MoodleError(
      "Could not validate session. Please verify your Moodle URL and MoodleSession cookie.",
    );
  }
  const sesskey = sesskeyMatch[1];

  // Extract userId
  const userIdMatch =
    html.match(/"userId":\s*([0-9]+)/i) ||
    html.match(/"userid":\s*([0-9]+)/i) ||
    html.match(/user\/profile\.php\?id=([0-9]+)/) ||
    html.match(/user\/view\.php\?id=([0-9]+)/) ||
    html.match(/data-userid="([0-9]+)"/);
  const userId = userIdMatch ? parseInt(userIdMatch[1], 10) : 0;

  // Extract fullname
  const nameMatch =
    html.match(/<span class="usertext[^>]*>([^<]+)<\/span>/i) ||
    html.match(/"userfullname":"([^"]+)"/i) ||
    html.match(/"fullname":"([^"]+)"/i);
  const fullname = nameMatch ? nameMatch[1].trim() : "Moodle User";

  // Extract sitename
  const siteMatch = html.match(/<title>([^<]+)<\/title>/i);
  const sitename = siteMatch ? siteMatch[1].split(":")[0].trim() : "Moodle";

  cachedSessionInfo = {
    sesskey,
    userId,
    fullname,
    sitename,
    timestamp: Date.now(),
  };

  return cachedSessionInfo;
}

/**
 * Executes a call to Moodle's built-in AJAX endpoint (/lib/ajax/service.php).
 */
export async function callMoodleAjax<T>(
  methodname: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { moodleUrl, apiToken } = getMoodlePrefs();
  const session = await getSessionInfo();

  const endpoint = `${moodleUrl}/lib/ajax/service.php?sesskey=${session.sesskey}&info=${methodname}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: `MoodleSession=${apiToken}`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify([
      {
        index: 0,
        methodname,
        args,
      },
    ]),
  });

  if (!res.ok) {
    throw new MoodleError(`HTTP error ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as Array<{
    data?: unknown;
    error?: boolean;
    exception?: { message?: string; errorcode?: string };
  }>;

  if (Array.isArray(data) && data.length > 0) {
    const item = data[0];
    if (item.error) {
      throw new MoodleError(
        item.exception?.message || "Moodle request failed",
        item.exception?.errorcode,
      );
    }
    return item.data as T;
  }

  throw new MoodleError("Unexpected response format from Moodle");
}

// ---------------------------------------------------------------------------
// Standard Web Service Mode (/webservice/rest/server.php)
// ---------------------------------------------------------------------------

export async function callMoodleWs<T>(
  wsFunction: string,
  params: Record<string, string | number | boolean | (string | number)[]> = {},
): Promise<T> {
  const { moodleUrl, apiToken } = getMoodlePrefs();

  if (!moodleUrl || !apiToken) {
    throw new MoodleError(
      "Please configure your Moodle URL and API Token / Cookie in extension preferences.",
    );
  }

  const endpoint = `${moodleUrl}/webservice/rest/server.php`;
  const url = new URL(endpoint);

  const searchParams = new URLSearchParams();
  searchParams.append("wstoken", apiToken);
  searchParams.append("wsfunction", wsFunction);
  searchParams.append("moodlewsrestformat", "json");

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        searchParams.append(`${key}[${index}]`, String(item));
      });
    } else if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: searchParams.toString(),
  });

  if (!response.ok) {
    throw new MoodleError(
      `HTTP error ${response.status}: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data && typeof data === "object" && "exception" in data) {
    const errorMsg =
      (data.message as string) ||
      (data.errorcode as string) ||
      "Moodle API Error";
    throw new MoodleError(
      errorMsg,
      data.errorcode as string,
      data.exception as string,
    );
  }

  return data as unknown as T;
}

// ---------------------------------------------------------------------------
// Unified Public API
// ---------------------------------------------------------------------------

let cachedSiteInfo: MoodleSiteInfo | null = null;

export async function getSiteInfo(): Promise<MoodleSiteInfo> {
  if (cachedSiteInfo) return cachedSiteInfo;

  const { moodleUrl, apiToken } = getMoodlePrefs();

  if (isSessionCookie(apiToken)) {
    const session = await getSessionInfo();
    cachedSiteInfo = {
      sitename: session.sitename,
      username: session.fullname,
      firstname: session.fullname,
      lastname: "",
      fullname: session.fullname,
      lang: "en",
      userid: session.userId,
      siteurl: moodleUrl,
      userpictureurl: "",
    };
    return cachedSiteInfo!;
  }

  const info = await callMoodleWs<MoodleSiteInfo>(
    "core_webservice_get_site_info",
  );
  cachedSiteInfo = info;
  return cachedSiteInfo!;
}

export async function getEnrolledCourses(): Promise<MoodleCourse[]> {
  const { apiToken } = getMoodlePrefs();

  if (isSessionCookie(apiToken)) {
    const session = await getSessionInfo();
    try {
      const courses = await callMoodleAjax<MoodleCourse[]>(
        "core_enrol_get_users_courses",
        { userid: session.userId },
      );
      if (Array.isArray(courses)) {
        return courses.sort(
          (a, b) =>
            (b.timemodified || b.startdate || 0) -
            (a.timemodified || a.startdate || 0),
        );
      }
    } catch (error) {
      if (!isUnsupportedMethodError(error)) throw error;
    }

    const timelineData = await callMoodleAjax<{ courses: MoodleCourse[] }>(
      "core_course_get_enrolled_courses_by_timeline_classification",
      { offset: 0, limit: 0, classification: "all", sort: "fullname" },
    );
    return (timelineData.courses || []).sort(
      (a, b) =>
        (b.timemodified || b.startdate || 0) -
        (a.timemodified || a.startdate || 0),
    );
  }

  const siteInfo = await getSiteInfo();
  const courses = await callMoodleWs<MoodleCourse[]>(
    "core_enrol_get_users_courses",
    { userid: siteInfo.userid },
  );

  return courses.sort(
    (a, b) =>
      (b.timemodified || b.startdate || 0) -
      (a.timemodified || a.startdate || 0),
  );
}

export async function getCourseContents(
  courseId: number,
): Promise<MoodleCourseSection[]> {
  const { apiToken } = getMoodlePrefs();

  if (isSessionCookie(apiToken)) {
    return await callMoodleAjax<MoodleCourseSection[]>(
      "core_course_get_contents",
      { courseid: courseId },
    );
  }

  return await callMoodleWs<MoodleCourseSection[]>("core_course_get_contents", {
    courseid: courseId,
  });
}

export async function getAssignments(): Promise<MoodleAssignment[]> {
  const { apiToken } = getMoodlePrefs();

  // If using session cookie, try mod_assign_get_assignments first, or calendar action events
  if (isSessionCookie(apiToken)) {
    const courses = await getEnrolledCourses();
    const courseMap = new Map(courses.map((c) => [c.id, c.fullname]));
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length > 0) {
      try {
        const response = await callMoodleAjax<MoodleAssignmentsResponse>(
          "mod_assign_get_assignments",
          { courseids: courseIds },
        );
        if (response && response.courses) {
          const list: MoodleAssignment[] = [];
          for (const c of response.courses) {
            const courseTitle =
              courseMap.get(c.id) || c.fullname || `Course ${c.id}`;
            for (const a of c.assignments) {
              list.push({ ...a, courseName: courseTitle });
            }
          }
          return list.sort((a, b) => (a.duedate || 0) - (b.duedate || 0));
        }
      } catch (error) {
        if (!isUnsupportedMethodError(error)) throw error;
      }
    }

    // Fallback: convert calendar action events
    const calEvents = await getUpcomingCalendarEvents();
    return (calEvents.events || []).map((e) => ({
      id: e.id,
      cmid: 0,
      url: e.action?.url,
      course: e.course?.id || 0,
      name: e.name,
      duedate: e.timesort || e.timestart,
      courseName: e.course?.fullname,
      intro: e.description,
    }));
  }

  const courses = await getEnrolledCourses();
  if (!courses.length) return [];

  const courseIds = courses.map((c) => c.id);
  const response = await callMoodleWs<MoodleAssignmentsResponse>(
    "mod_assign_get_assignments",
    { courseids: courseIds },
  );

  const courseMap = new Map(courses.map((c) => [c.id, c.fullname]));
  const allAssignments: MoodleAssignment[] = [];

  if (response && response.courses) {
    for (const c of response.courses) {
      const courseTitle = courseMap.get(c.id) || c.fullname || `Course ${c.id}`;
      for (const a of c.assignments) {
        allAssignments.push({
          ...a,
          courseName: courseTitle,
        });
      }
    }
  }

  return allAssignments.sort((a, b) => {
    if (!a.duedate) return 1;
    if (!b.duedate) return -1;
    return a.duedate - b.duedate;
  });
}

export async function getUpcomingCalendarEvents(): Promise<MoodleActionEventsResponse> {
  const now = Math.floor(Date.now() / 1000);
  const { apiToken } = getMoodlePrefs();

  if (isSessionCookie(apiToken)) {
    return await callMoodleAjax<MoodleActionEventsResponse>(
      "core_calendar_get_action_events_by_timesort",
      {
        timesortfrom: now - 86400,
        limitnum: 50,
      },
    );
  }

  return await callMoodleWs<MoodleActionEventsResponse>(
    "core_calendar_get_action_events_by_timesort",
    {
      timesortfrom: now - 86400,
      limitnum: 50,
    },
  );
}

export async function getNotifications(): Promise<MoodleNotificationsResponse> {
  const { apiToken } = getMoodlePrefs();
  const siteInfo = await getSiteInfo();

  if (isSessionCookie(apiToken)) {
    return await callMoodleAjax<MoodleNotificationsResponse>(
      "message_popup_get_popup_notifications",
      { useridto: siteInfo.userid },
    );
  }

  return await callMoodleWs<MoodleNotificationsResponse>(
    "message_popup_get_popup_notifications",
    { useridto: siteInfo.userid },
  );
}

export async function markNotificationRead(
  notificationId: number,
): Promise<void> {
  const { apiToken } = getMoodlePrefs();

  if (isSessionCookie(apiToken)) {
    await callMoodleAjax("core_message_mark_notification_read", {
      notificationid: notificationId,
    });
    return;
  }

  await callMoodleWs("core_message_mark_notification_read", {
    notificationid: notificationId,
  });
}

export async function downloadCourseFile(
  fileUrl: string,
  fileName: string,
  courseSubfolder?: string,
): Promise<string> {
  const { apiToken, downloadDirectory } = getMoodlePrefs();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Downloading ${fileName}...`,
  });

  try {
    const rawDownloadDirectory = String(downloadDirectory ?? "");
    let targetDir = rawDownloadDirectory.trim();
    if (!targetDir) {
      targetDir = path.join(os.homedir(), "Downloads", "Moodle");
    } else if (targetDir.startsWith("~")) {
      targetDir = path.join(os.homedir(), targetDir.slice(1));
    }

    if (courseSubfolder) {
      const safeCourseName = courseSubfolder
        .replace(/[/\\?%*:|"<>]/g, "_")
        .trim();
      targetDir = path.join(targetDir, safeCourseName);
    }

    await fs.mkdir(targetDir, { recursive: true });
    const destinationPath = path.join(targetDir, fileName);

    let res;
    if (isSessionCookie(apiToken)) {
      // Session cookie download
      res = await fetch(fileUrl, {
        headers: {
          Cookie: `MoodleSession=${apiToken}`,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });
    } else {
      // Token-based download
      const parsedUrl = new URL(fileUrl);
      parsedUrl.searchParams.set("token", apiToken);
      res = await fetch(parsedUrl.toString());
    }

    if (!res.ok) {
      throw new Error(`Failed to download: HTTP ${res.status}`);
    }

    if (!res.body) {
      throw new Error("No response body received");
    }

    const fileStream = createWriteStream(destinationPath);
    await pipeline(res.body as unknown as NodeJS.ReadableStream, fileStream);

    toast.style = Toast.Style.Success;
    toast.title = "Downloaded Successfully";
    toast.message = fileName;
    toast.primaryAction = {
      title: "Show in Finder",
      onAction: async () => {
        await showInFinder(destinationPath);
      },
    };

    return destinationPath;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download Failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}
