import { getPreferenceValues } from "@raycast/api";
import https from "https";

export interface Preferences {
  redmineUrl: string;
  apiToken: string;
  allowSelfSignedCert?: boolean;
}

export interface RedmineStatus {
  id: number;
  name: string;
  is_closed: boolean;
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
  description?: string;
}

export interface RedminePriority {
  id: number;
  name: string;
}

export interface RedmineActivity {
  id: number;
  name: string;
  is_default?: boolean;
}

export interface RedmineTracker {
  id: number;
  name: string;
}

export interface RedmineUser {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  mail: string;
}

export interface RedmineIssue {
  id: number;
  subject: string;
  description?: string;
  status: RedmineStatus;
  priority: RedminePriority;
  project: RedmineProject;
  tracker: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: number;
    name: string;
  };
  created_on: string;
  updated_on: string;
}

export interface RedmineIssuesResponse {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
}

export interface RedmineProjectsResponse {
  projects: RedmineProject[];
  total_count: number;
  offset: number;
  limit: number;
}

export interface RedmineProjectDetails {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  trackers?: RedmineTracker[];
}

export interface RedmineProjectDetailsResponse {
  project: RedmineProjectDetails;
}

export interface IssueFilters {
  status?: "all" | "open" | "closed";
  projectId?: number;
  offset?: number;
  limit?: number;
  subject?: string; // Search by subject
  issueId?: number; // Search by specific issue ID
}

export interface FetchIssuesResult {
  issues: RedmineIssue[];
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function getApiUrl(endpoint: string): string {
  const prefs = getPreferences();
  const baseUrl = prefs.redmineUrl.replace(/\/$/, ""); // Remove trailing slash
  return `${baseUrl}${endpoint}`;
}

function getAuthHeaders(): Record<string, string> {
  const prefs = getPreferences();
  return {
    "X-Redmine-API-Key": prefs.apiToken,
    "Content-Type": "application/json",
  };
}

async function fetchRedmineApi<T>(endpoint: string): Promise<T> {
  const url = getApiUrl(endpoint);
  const headers = getAuthHeaders();
  const prefs = getPreferences();

  // Create fetch options
  const fetchOptions: RequestInit = {
    method: "GET",
    headers,
  };

  // If self-signed certificates are allowed, use a custom agent
  if (prefs.allowSelfSignedCert) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });
    // Note: Node.js native fetch doesn't support agent directly
    // We'll use a workaround by setting the agent via the dispatcher
    // For now, we'll use the https module directly for HTTPS requests
    if (url.startsWith("https://")) {
      return fetchWithHttpsAgent<T>(url, headers, httpsAgent);
    }
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication failed. Please check your API token.");
    }
    if (response.status === 404) {
      throw new Error("Redmine instance not found. Please check your Redmine URL.");
    }
    throw new Error(`Redmine API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function fetchWithHttpsAgent<T>(url: string, headers: Record<string, string>, agent: https.Agent): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers,
      agent,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data) as T);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err instanceof Error ? err.message : String(err)}`));
          }
        } else {
          if (res.statusCode === 401) {
            reject(new Error("Authentication failed. Please check your API token."));
          } else if (res.statusCode === 404) {
            reject(new Error("Redmine instance not found. Please check your Redmine URL."));
          } else {
            reject(new Error(`Redmine API error: ${res.statusCode} ${res.statusMessage || "Unknown error"}`));
          }
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.end();
  });
}

export async function fetchIssues(filters: IssueFilters = {}): Promise<FetchIssuesResult> {
  const params = new URLSearchParams();
  params.append("assigned_to_id", "me");

  // Handle status filter
  if (filters.status === "open") {
    params.append("status_id", "open");
  } else if (filters.status === "closed") {
    params.append("status_id", "closed");
  }
  // If "all" or undefined, don't add status filter

  // Handle project filter
  if (filters.projectId) {
    params.append("project_id", filters.projectId.toString());
  }

  // Note: Redmine API doesn't support direct subject search parameter
  // Subject filtering will be done client-side after fetching
  // Handle specific issue ID search
  if (filters.issueId) {
    params.append("issue_id", filters.issueId.toString());
  }

  // Handle pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || 25;
  params.append("offset", offset.toString());
  params.append("limit", limit.toString());

  // Request more fields in the response
  params.append("include", "status,priority,project,tracker,assigned_to");

  const endpoint = `/issues.json?${params.toString()}`;
  const data = await fetchRedmineApi<RedmineIssuesResponse>(endpoint);

  // Filter by subject client-side if provided
  let filteredIssues = data.issues;
  if (filters.subject) {
    const searchTerm = filters.subject.toLowerCase();
    filteredIssues = data.issues.filter(
      (issue) =>
        issue.subject.toLowerCase().includes(searchTerm) ||
        (issue.description && issue.description.toLowerCase().includes(searchTerm)),
    );
  }

  return {
    issues: filteredIssues,
    totalCount: filters.subject ? filteredIssues.length : data.total_count,
    offset: data.offset,
    limit: data.limit,
    hasMore: filters.subject ? false : data.offset + data.issues.length < data.total_count,
  };
}

export async function fetchProjects(): Promise<RedmineProject[]> {
  const params = new URLSearchParams();
  params.append("limit", "100"); // Get up to 100 projects

  const endpoint = `/projects.json?${params.toString()}`;
  const data = await fetchRedmineApi<RedmineProjectsResponse>(endpoint);
  return data.projects;
}

export interface RedmineIssueResponse {
  issue: RedmineIssue;
}

export async function fetchIssueById(issueId: number): Promise<RedmineIssue> {
  const params = new URLSearchParams();
  params.append("include", "status,priority,project,tracker,assigned_to");

  const endpoint = `/issues/${issueId}.json?${params.toString()}`;
  const url = getApiUrl(endpoint);
  const headers = getAuthHeaders();
  const prefs = getPreferences();

  // If self-signed certificates are allowed, use https module
  if (prefs.allowSelfSignedCert && url.startsWith("https://")) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers,
        agent: httpsAgent,
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 404) {
            reject(new Error(`Issue #${issueId} not found`));
            return;
          }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data) as RedmineIssueResponse;
              resolve(responseData.issue);
            } catch (err) {
              reject(new Error(`Failed to parse response: ${err instanceof Error ? err.message : String(err)}`));
            }
          } else {
            if (res.statusCode === 401) {
              reject(new Error("Authentication failed. Please check your API token."));
            } else {
              reject(new Error(`Redmine API error: ${res.statusCode} ${res.statusMessage || "Unknown error"}`));
            }
          }
        });
      });

      req.on("error", (err) => {
        reject(new Error(`Request failed: ${err.message}`));
      });

      req.end();
    });
  }

  // Standard fetch for non-self-signed certificates
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Issue #${issueId} not found`);
    }
    if (response.status === 401) {
      throw new Error("Authentication failed. Please check your API token.");
    }
    throw new Error(`Redmine API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RedmineIssueResponse;
  return data.issue;
}

export interface TimeEntryData {
  issueId: number;
  hours: number;
  comments?: string;
  activityId: number;
  spentOn?: string; // Date in YYYY-MM-DD format
}

async function postRedmineApi<T>(endpoint: string, body: unknown): Promise<T> {
  const url = getApiUrl(endpoint);
  const headers = getAuthHeaders();
  const prefs = getPreferences();

  const bodyString = JSON.stringify(body);

  // If self-signed certificates are allowed, use https module
  if (prefs.allowSelfSignedCert && url.startsWith("https://")) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });
    return postWithHttpsAgent<T>(url, headers, httpsAgent, bodyString);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: bodyString,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication failed. Please check your API token.");
    }
    if (response.status === 422) {
      const errorData = (await response.json().catch(() => ({}))) as { errors?: string[] | string };
      const errorMessages = errorData.errors || ["Validation failed"];
      throw new Error(`Validation error: ${Array.isArray(errorMessages) ? errorMessages.join(", ") : errorMessages}`);
    }
    throw new Error(`Redmine API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function postWithHttpsAgent<T>(
  url: string,
  headers: Record<string, string>,
  agent: https.Agent,
  body: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(body),
      },
      agent,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data || "{}") as T);
          } catch {
            resolve({} as T);
          }
        } else {
          if (res.statusCode === 401) {
            reject(new Error("Authentication failed. Please check your API token."));
          } else if (res.statusCode === 422) {
            try {
              const errorData = JSON.parse(data);
              const errorMessages = errorData.errors || ["Validation failed"];
              reject(
                new Error(
                  `Validation error: ${Array.isArray(errorMessages) ? errorMessages.join(", ") : errorMessages}`,
                ),
              );
            } catch {
              reject(new Error(`Validation error: ${res.statusMessage || "Unknown error"}`));
            }
          } else {
            reject(new Error(`Redmine API error: ${res.statusCode} ${res.statusMessage || "Unknown error"}`));
          }
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

async function putRedmineApi<T>(endpoint: string, body: unknown): Promise<T> {
  const url = getApiUrl(endpoint);
  const headers = getAuthHeaders();
  const prefs = getPreferences();

  const bodyString = JSON.stringify(body);

  // If self-signed certificates are allowed, use https module
  if (prefs.allowSelfSignedCert && url.startsWith("https://")) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });
    return putWithHttpsAgent<T>(url, headers, httpsAgent, bodyString);
  }

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: bodyString,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication failed. Please check your API token.");
    }
    if (response.status === 422) {
      const errorData = (await response.json().catch(() => ({}))) as { errors?: string[] | string };
      const errorMessages = errorData.errors || ["Validation failed"];
      throw new Error(`Validation error: ${Array.isArray(errorMessages) ? errorMessages.join(", ") : errorMessages}`);
    }
    throw new Error(`Redmine API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function putWithHttpsAgent<T>(
  url: string,
  headers: Record<string, string>,
  agent: https.Agent,
  body: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: "PUT",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(body),
      },
      agent,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data || "{}") as T);
          } catch {
            resolve({} as T);
          }
        } else {
          if (res.statusCode === 401) {
            reject(new Error("Authentication failed. Please check your API token."));
          } else if (res.statusCode === 422) {
            try {
              const errorData = JSON.parse(data);
              const errorMessages = errorData.errors || ["Validation failed"];
              reject(
                new Error(
                  `Validation error: ${Array.isArray(errorMessages) ? errorMessages.join(", ") : errorMessages}`,
                ),
              );
            } catch {
              reject(new Error(`Validation error: ${res.statusMessage || "Unknown error"}`));
            }
          } else {
            reject(new Error(`Redmine API error: ${res.statusCode} ${res.statusMessage || "Unknown error"}`));
          }
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

export async function fetchActivities(): Promise<RedmineActivity[]> {
  const endpoint = "/enumerations/time_entry_activities.json";
  const data = await fetchRedmineApi<{ time_entry_activities: RedmineActivity[] }>(endpoint);
  return data.time_entry_activities;
}

export async function createTimeEntry(timeEntry: TimeEntryData): Promise<void> {
  const body = {
    time_entry: {
      issue_id: timeEntry.issueId,
      hours: timeEntry.hours,
      activity_id: timeEntry.activityId,
      comments: timeEntry.comments,
      spent_on: timeEntry.spentOn || new Date().toISOString().split("T")[0], // Default to today
    },
  };

  await postRedmineApi("/time_entries.json", body);
}

export async function fetchTrackers(): Promise<RedmineTracker[]> {
  const endpoint = "/trackers.json";
  const data = await fetchRedmineApi<{ trackers: RedmineTracker[] }>(endpoint);
  return data.trackers;
}

export async function fetchStatuses(): Promise<RedmineStatus[]> {
  const endpoint = "/issue_statuses.json";
  const data = await fetchRedmineApi<{ issue_statuses: RedmineStatus[] }>(endpoint);
  return data.issue_statuses;
}

export async function fetchPriorities(): Promise<RedminePriority[]> {
  const endpoint = "/enumerations/issue_priorities.json";
  const data = await fetchRedmineApi<{ issue_priorities: RedminePriority[] }>(endpoint);
  return data.issue_priorities;
}

export async function getCurrentUser(): Promise<RedmineUser> {
  const endpoint = "/users/current.json";
  const data = await fetchRedmineApi<{ user: RedmineUser }>(endpoint);
  return data.user;
}

export interface CreateIssueData {
  projectId: number;
  trackerId: number;
  subject: string;
  statusId: number;
  priorityId: number;
  description?: string;
}

export async function createIssue(issueData: CreateIssueData): Promise<RedmineIssue> {
  // Get current user to assign issue to them
  const currentUser = await getCurrentUser();

  const body = {
    issue: {
      project_id: issueData.projectId,
      tracker_id: issueData.trackerId,
      subject: issueData.subject,
      status_id: issueData.statusId,
      priority_id: issueData.priorityId,
      assigned_to_id: currentUser.id,
      description: issueData.description,
    },
  };

  const response = await postRedmineApi<RedmineIssueResponse>("/issues.json", body);
  return response.issue;
}

export async function fetchProjectDetails(projectId: number): Promise<RedmineProjectDetails> {
  const params = new URLSearchParams();
  params.append("include", "trackers");

  const endpoint = `/projects/${projectId}.json?${params.toString()}`;
  const data = await fetchRedmineApi<RedmineProjectDetailsResponse>(endpoint);
  return data.project;
}

export async function fetchProjectTrackers(projectId: number): Promise<RedmineTracker[]> {
  try {
    // Try to get trackers from project details
    const projectDetails = await fetchProjectDetails(projectId);
    if (projectDetails.trackers && projectDetails.trackers.length > 0) {
      return projectDetails.trackers;
    }
  } catch (err) {
    // If project details fetch fails or doesn't include trackers, fall back to global trackers
    console.warn("Failed to fetch project-specific trackers, using global trackers:", err);
  }

  // Fallback to global trackers if project-specific fetch fails
  return fetchTrackers();
}

export async function fetchProjectStatuses(projectId: number, trackerId?: number): Promise<RedmineStatus[]> {
  // Redmine API typically returns global statuses, but we can filter by project/tracker if needed
  // For now, return all statuses as they're usually valid for any project/tracker combination
  // In the future, this could be enhanced to filter based on project/tracker workflows
  try {
    const params = new URLSearchParams();
    if (trackerId) {
      params.append("tracker_id", trackerId.toString());
    }

    const endpoint = `/issue_statuses.json${params.toString() ? `?${params.toString()}` : ""}`;
    const data = await fetchRedmineApi<{ issue_statuses: RedmineStatus[] }>(endpoint);
    return data.issue_statuses;
  } catch (err) {
    // Fallback to global statuses if project/tracker-specific fetch fails
    console.warn("Failed to fetch project/tracker-specific statuses, using global statuses:", err);
    return fetchStatuses();
  }
}

export async function fetchProjectPriorities(projectId: number, trackerId?: number): Promise<RedminePriority[]> {
  // Redmine API typically returns global priorities, but we can filter by project/tracker if needed
  // For now, return all priorities as they're usually valid for any project/tracker combination
  try {
    const params = new URLSearchParams();
    if (trackerId) {
      params.append("tracker_id", trackerId.toString());
    }

    const endpoint = `/enumerations/issue_priorities.json${params.toString() ? `?${params.toString()}` : ""}`;
    const data = await fetchRedmineApi<{ issue_priorities: RedminePriority[] }>(endpoint);
    return data.issue_priorities;
  } catch (err) {
    // Fallback to global priorities if project/tracker-specific fetch fails
    console.warn("Failed to fetch project/tracker-specific priorities, using global priorities:", err);
    return fetchPriorities();
  }
}

export async function fetchIssueStatuses(issueId: number): Promise<RedmineStatus[]> {
  // First fetch the issue to get project and tracker info
  const issue = await fetchIssueById(issueId);

  // Then fetch statuses based on the issue's project and tracker
  return fetchProjectStatuses(issue.project.id, issue.tracker.id);
}

export async function updateIssueStatus(issueId: number, statusId: number): Promise<RedmineIssue> {
  const body = {
    issue: {
      status_id: statusId,
    },
  };

  const response = await putRedmineApi<RedmineIssueResponse>(`/issues/${issueId}.json`, body);
  return response.issue;
}
