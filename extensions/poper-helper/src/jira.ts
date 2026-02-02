import { getPreferenceValues } from "@raycast/api";
import pLimit from "p-limit";
import { Preferences, getJiraCredentials } from "./utils";

interface JiraValidationResult {
  [key: string]: boolean;
}

/**
 * Validates a set of Jira issue keys by making HEAD requests to the Jira API.
 * This function runs validation requests in parallel for better performance.
 *
 * @param uniqueKeys - A Set of unique Jira issue keys to validate
 * @returns A promise resolving to a map of issue keys to their validity (boolean)
 */
export async function validateIssues(uniqueKeys: Set<string>): Promise<JiraValidationResult> {
  const preferences = getPreferenceValues<Preferences>();
  const validationMap: JiraValidationResult = { NONE: true };

  const keysToCheck = Array.from(uniqueKeys).filter((k) => k && k !== "NONE");
  if (keysToCheck.length === 0) {
    return validationMap;
  }

  const output = getJiraCredentials(preferences);
  if (!output) {
    console.warn("Jira configuration missing. Skipping validation.");
    return validationMap;
  }
  const { baseUrl, headers } = output;

  const promises = keysToCheck.map(async (key) => {
    try {
      const url = `${baseUrl}/rest/api/3/issue/${key}`;
      const response = await fetch(url, {
        method: "HEAD",
        headers,
      });
      validationMap[key] = response.ok;
    } catch (error) {
      console.error(`Error checking issue ${key}:`, error);
      validationMap[key] = false;
    }
  });

  await Promise.all(promises);
  return validationMap;
}

/**
 * Generates an ISO date string for "Today at 8 AM China Standard Time".
 * This is used to set the start time for work logs to a consistent local time.
 * Note: Hardcoded to +0800 as per original Python script logic.
 */
function getToday8AmChinaTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}T08:00:00.000+0800`;
}

export async function updateJiraIssue(issueKey: string, timeSpent: number, summary: string): Promise<boolean> {
  const preferences = getPreferenceValues<Preferences>();

  const output = getJiraCredentials(preferences);
  if (!output) {
    return false;
  }
  const { baseUrl, headers } = output;

  if (issueKey === "NONE") return true;

  const startedTime = getToday8AmChinaTime();

  const body = {
    timeSpentSeconds: Math.floor(timeSpent * 3600),
    started: startedTime,
    comment: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              text: summary,
              type: "text",
            },
          ],
        },
      ],
    },
  };

  try {
    const url = `${baseUrl}/rest/api/3/issue/${issueKey}/worklog`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Failed to update Jira for ${issueKey}: ${response.statusText}`);
    }
    return response.ok;
  } catch (error) {
    console.error(`Error updating Jira for ${issueKey}:`, error);
    return false;
  }
}

interface JiraUser {
  accountId: string;
  displayName: string;
}

interface JiraWorklog {
  author: {
    accountId: string;
  };
  timeSpentSeconds: number;
  started: string; // ISO 8601
}

interface WeeklySummary {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  totalSeconds: number;
  totalHours: number;
}

export interface WorkLogHistoryResult {
  weekly: WeeklySummary[];
  lastTwoWeeksSeconds: number;
  lastTwoWeeksHours: number;
}

async function getJiraMyself(baseUrl: string, headers: Record<string, string>): Promise<JiraUser | null> {
  try {
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, { headers });
    if (!response.ok) {
      console.error("getJiraMyself failed:", response.status, response.statusText);
      return null;
    }
    const user = (await response.json()) as JiraUser;
    return user;
  } catch (error) {
    console.error("Error fetching myself:", error);
    return null;
  }
}

/**
 * Searches for Jira issues that the current user has logged work on since a specific date.
 * Uses the /rest/api/3/search/jql endpoint with cursor-based pagination (nextPageToken).
 *
 * @param baseUrl - Jira base URL
 * @param headers - Auth headers
 * @param sinceDate - Start date in YYYY-MM-DD format
 * @returns Array of Issue Keys (string)
 */
async function searchIssuesWithWorklogs(
  baseUrl: string,
  headers: Record<string, string>,
  sinceDate: string,
): Promise<string[]> {
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${sinceDate}"`;
  const issues: string[] = [];
  const maxResults = 100;
  let nextPageToken: string | undefined = undefined;

  try {
    do {
      const url = `${baseUrl}/rest/api/3/search/jql`;
      interface SearchBody {
        jql: string;
        maxResults: number;
        fields: string[];
        nextPageToken?: string;
      }
      const body: SearchBody = {
        jql,
        maxResults,
        fields: ["key"],
      };
      if (nextPageToken) {
        body.nextPageToken = nextPageToken;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Search failed: ${response.status} ${response.statusText}`);
        console.error(`Error Body: ${errorText}`);
        break;
      }

      const data = (await response.json()) as { issues: { key: string }[]; nextPageToken?: string };
      if (data.issues) {
        data.issues.forEach((i) => issues.push(i.key));
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);
  } catch (error) {
    console.error("Error searching issues:", error);
  }
  return issues;
}

/**
 * Fetches all worklogs for a specific issue.
 * Handles pagination if an issue has more than 100 worklogs (using startAt/maxResults).
 *
 * @param baseUrl - Jira base URL
 * @param headers - Auth headers
 * @param issueKey - The Jira Issue Key (e.g. PROJ-123)
 * @returns Array of JiraWorklog objects
 */
async function getIssueWorklogs(
  baseUrl: string,
  headers: Record<string, string>,
  issueKey: string,
): Promise<JiraWorklog[]> {
  const worklogs: JiraWorklog[] = [];
  let startAt = 0;
  const maxResults = 100;
  let total = 0;

  try {
    do {
      const url = `${baseUrl}/rest/api/3/issue/${issueKey}/worklog?startAt=${startAt}&maxResults=${maxResults}`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.error(`Failed to fetch worklogs for ${issueKey}: ${response.status} ${response.statusText}`);
        break;
      }
      const data = (await response.json()) as { worklogs: JiraWorklog[]; total: number };
      if (data.worklogs) {
        worklogs.push(...data.worklogs);
      }
      total = data.total || 0;
      startAt += maxResults;
    } while (startAt < total);

    return worklogs;
  } catch (error) {
    console.error(`Error fetching worklogs for ${issueKey}:`, error);
    return [];
  }
}

/**
 * Aggregates work log history for the past 4 calendar weeks.
 * - Fetches all relevant issues.
 * - Downloads worklogs in parallel (limited concurrency).
 * - Filters for the current user and date range.
 * - Groups data into strict weekly buckets (Monday-Sunday).
 * - Calculates a specific "Last 2 Weeks" total (Current Week + Previous Week).
 */
export async function getRecentWorkLogSummary(): Promise<WorkLogHistoryResult> {
  const preferences = getPreferenceValues<Preferences>();
  const result: WorkLogHistoryResult = {
    weekly: [],
    lastTwoWeeksSeconds: 0,
    lastTwoWeeksHours: 0,
  };

  const output = getJiraCredentials(preferences);
  if (!output) return result;

  const { baseUrl, headers } = output;

  const myself = await getJiraMyself(baseUrl, headers);
  if (!myself) return result;

  const getMonday = (d: Date) => {
    const dCopy = new Date(d);
    const day = dCopy.getDay();
    const diff = dCopy.getDate() - day + (day == 0 ? -6 : 1);
    const monday = new Date(dCopy.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const toLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Calculate the "Last 2 Weeks" range based on Monday-aligned weeks.
  // This ensures we strictly sum "This Week" and "Last Week" without expecting a rolling 14-day window.
  const now = new Date();
  const currentMonday = getMonday(now);
  const currentWeekKey = toLocalYYYYMMDD(currentMonday);

  const lastMonday = new Date(currentMonday);
  lastMonday.setDate(currentMonday.getDate() - 7);
  const lastWeekKey = toLocalYYYYMMDD(lastMonday);

  const fourWeeksAgo = new Date(currentMonday);
  fourWeeksAgo.setDate(currentMonday.getDate() - 21);
  const sinceDateStr = toLocalYYYYMMDD(fourWeeksAgo);

  const issueKeys = await searchIssuesWithWorklogs(baseUrl, headers, sinceDateStr);
  const uniqueKeys = Array.from(new Set(issueKeys));

  const limit = pLimit(10);
  const worklogPromises = uniqueKeys.map((key) => limit(() => getIssueWorklogs(baseUrl, headers, key)));
  const allWorklogsBatches = await Promise.all(worklogPromises);
  const allWorklogs = allWorklogsBatches.flat();

  const myWorklogs = allWorklogs.filter((w) => w.author.accountId === myself.accountId && w.started >= sinceDateStr);

  const weekMap = new Map<string, number>();

  myWorklogs.forEach((w) => {
    const d = new Date(w.started);
    const monday = getMonday(d);
    const weekKey = toLocalYYYYMMDD(monday);

    const currentSeconds = weekMap.get(weekKey) || 0;
    weekMap.set(weekKey, currentSeconds + w.timeSpentSeconds);
  });

  const thisWeekSeconds = weekMap.get(currentWeekKey) || 0;
  const lastWeekSeconds = weekMap.get(lastWeekKey) || 0;
  result.lastTwoWeeksSeconds = thisWeekSeconds + lastWeekSeconds;

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  result.weekly = sortedWeeks.slice(0, 4).map(([weekStart, seconds]) => {
    const [y, m, d] = weekStart.split("-").map(Number);
    const startDateObj = new Date(y, m - 1, d);

    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + 6);

    return {
      weekStart,
      weekEnd: toLocalYYYYMMDD(endDateObj),
      totalSeconds: seconds,
      totalHours: parseFloat((seconds / 3600).toFixed(2)),
    };
  });

  result.lastTwoWeeksHours = parseFloat((result.lastTwoWeeksSeconds / 3600).toFixed(2));

  return result;
}
