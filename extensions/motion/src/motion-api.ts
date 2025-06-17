import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export interface MotionTask {
  id: string;
  name: string;
  description: string;
  duration: string | number;
  dueDate?: string;
  deadlineType: "HARD" | "SOFT" | "NONE";
  parentRecurringTaskId: string;
  completed: boolean;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    Name: string;
    Description: string;
    WorkspaceId: string;
  };
  status?: {
    name: string;
    isDefaultStatus: boolean;
    isResolvedStatus: boolean;
  };
  workspace: {
    id: string;
    name: string;
    teamId: string;
    type: string;
  };
  labels: Array<{
    name: string;
  }>;
  statuses: Array<{
    name: string;
    isDefaultStatus: boolean;
    isResolvedStatus: boolean;
  }>;
  priority: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
  assignees: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  scheduledStart?: string;
  createdTime: string;
  scheduledEnd?: string;
  schedulingIssue: boolean;
}

export interface MotionTasksResponse {
  meta: {
    nextCursor?: string;
    pageSize: number;
  };
  tasks: MotionTask[];
}

export interface MotionWorkspace {
  id: string;
  name: string;
  teamId: string;
  type: string;
  labels: Array<{
    name: string;
  }>;
  statuses: Array<{
    name: string;
    isDefaultStatus: boolean;
    isResolvedStatus: boolean;
  }>;
}

export interface MotionUser {
  id: string;
  name: string;
  email: string;
}

export interface MotionWorkspacesResponse {
  meta: {
    nextCursor?: string;
    pageSize: number;
  };
  workspaces: MotionWorkspace[];
}

export interface MotionProject {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  status?: {
    name: string;
    isDefaultStatus: boolean;
    isResolvedStatus: boolean;
  };
  createdTime: string;
  updatedTime: string;
}

export interface MotionProjectsResponse {
  meta: {
    nextCursor?: string;
    pageSize: number;
  };
  projects: MotionProject[];
}

const BASE_URL = "https://api.usemotion.com/v1";

async function makeMotionRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();

  console.log("🔗 Making request to:", `${BASE_URL}${endpoint}`);
  console.log("📋 Request options:", {
    method: options.method || "GET",
    headers: {
      "X-API-Key": apiKey ? "***REDACTED***" : "MISSING",
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? "Present" : "None",
  });

  if (options.body) {
    console.log("📦 Request body:", options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  console.log("📡 Response status:", response.status, response.statusText);

  if (!response.ok) {
    let errorMessage = `Motion API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      console.error("❌ Error response body:", errorBody);
      if (errorBody) {
        errorMessage += ` - ${errorBody}`;
      }
    } catch (e) {
      console.error("❌ Failed to read error body:", e);
      // Ignore error parsing error body
    }
    throw new Error(errorMessage);
  }

  const responseData = await response.json();
  console.log("✅ Response data:", JSON.stringify(responseData, null, 2));
  return responseData;
}

export async function getUser(): Promise<MotionUser> {
  return makeMotionRequest<MotionUser>("/users/me");
}

// Simple cache to avoid repeated API calls
const cache = {
  workspaces: null as MotionWorkspace[] | null,
  workspacesCacheTime: 0,
  projects: new Map<string, { data: MotionProject[]; cacheTime: number }>(),
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getWorkspaces(): Promise<MotionWorkspace[]> {
  // Check cache first
  const now = Date.now();
  if (cache.workspaces && now - cache.workspacesCacheTime < CACHE_DURATION) {
    console.log("📋 Using cached workspaces");
    return cache.workspaces;
  }

  const response = await makeMotionRequest<MotionWorkspacesResponse>("/workspaces");

  // Update cache
  cache.workspaces = response.workspaces;
  cache.workspacesCacheTime = now;

  return response.workspaces;
}

export async function getDefaultWorkspaceId(): Promise<string> {
  const workspaces = await getWorkspaces();
  if (workspaces.length === 0) {
    throw new Error("No workspaces found. Please ensure you have access to at least one Motion workspace.");
  }
  // Return the first workspace ID as default
  return workspaces[0].id;
}

export async function getTasks(params?: {
  assigneeId?: string;
  cursor?: string;
  includeAllStatuses?: boolean;
  label?: string;
  name?: string;
  projectId?: string;
  status?: string[];
  workspaceId?: string;
}): Promise<MotionTasksResponse> {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
  }

  const endpoint = `/tasks${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  return makeMotionRequest<MotionTasksResponse>(endpoint);
}

export async function createTask(task: {
  name: string;
  description?: string;
  duration?: string | number;
  dueDate?: string;
  deadlineType?: "HARD" | "SOFT" | "NONE";
  priority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
  assigneeId?: string;
  projectId?: string;
  workspaceId?: string;
  labels?: string[];
}): Promise<MotionTask> {
  console.log("🚀 createTask called with:", JSON.stringify(task, null, 2));

  // Clean up the task data according to Motion API requirements
  const taskData: Record<string, unknown> = {
    name: task.name.trim(),
  };

  console.log("📝 Starting task data preparation...");

  // Ensure we have a workspaceId - either provided or get the default
  if (task.workspaceId) {
    console.log("✅ Using provided workspaceId:", task.workspaceId);
    taskData.workspaceId = task.workspaceId;
  } else {
    console.log("🔍 Getting default workspaceId...");
    try {
      taskData.workspaceId = await getDefaultWorkspaceId();
      console.log("✅ Got default workspaceId:", taskData.workspaceId);
    } catch (error) {
      console.error("❌ Failed to get default workspaceId:", error);
      throw error;
    }
  }

  // Only add fields if they have valid values
  if (task.description && task.description.trim()) {
    console.log("📄 Adding description");
    taskData.description = task.description.trim();
  }

  if (task.duration !== undefined && task.duration !== "") {
    console.log("⏱️ Processing duration:", task.duration);
    if (task.duration === "NONE" || task.duration === "REMINDER") {
      taskData.duration = task.duration;
      console.log("✅ Set duration to:", task.duration);
    } else {
      const durationNum = parseInt(String(task.duration));
      if (!isNaN(durationNum) && durationNum > 0) {
        taskData.duration = durationNum;
        console.log("✅ Set duration to:", durationNum, "minutes");
      } else {
        console.log("⚠️ Invalid duration, skipping:", task.duration);
      }
    }
  }

  if (task.dueDate) {
    console.log("📅 Adding due date:", task.dueDate);
    taskData.dueDate = task.dueDate;
  }

  if (task.deadlineType) {
    console.log("⏰ Adding deadline type:", task.deadlineType);
    taskData.deadlineType = task.deadlineType;
  }

  if (task.priority) {
    console.log("🎯 Adding priority:", task.priority);
    taskData.priority = task.priority;
  }

  if (task.assigneeId) {
    console.log("👤 Adding assignee:", task.assigneeId);
    taskData.assigneeId = task.assigneeId;
  }

  if (task.projectId) {
    console.log("📁 Adding project:", task.projectId);
    taskData.projectId = task.projectId;
  }

  if (task.labels && task.labels.length > 0) {
    console.log("🏷️ Adding labels:", task.labels);
    taskData.labels = task.labels;
  }

  console.log("📤 Final task data to send:", JSON.stringify(taskData, null, 2));
  console.log("🌐 Making API request to Motion...");

  try {
    const result = await makeMotionRequest<MotionTask>("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
    console.log("✅ Task created successfully:", result.id);
    return result;
  } catch (error) {
    console.error("❌ API request failed:", error);
    throw error;
  }
}

export async function updateTask(taskId: string, updates: Partial<MotionTask>): Promise<MotionTask> {
  return makeMotionRequest<MotionTask>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function getProjects(workspaceId?: string): Promise<MotionProject[]> {
  const cacheKey = workspaceId || "all";
  const now = Date.now();

  // Check cache first
  const cachedProjects = cache.projects.get(cacheKey);
  if (cachedProjects && now - cachedProjects.cacheTime < CACHE_DURATION) {
    console.log("📋 Using cached projects for workspace:", workspaceId);
    return cachedProjects.data;
  }

  const searchParams = new URLSearchParams();
  if (workspaceId) {
    searchParams.append("workspaceId", workspaceId);
  }

  const endpoint = `/projects${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const response = await makeMotionRequest<MotionProjectsResponse>(endpoint);

  // Update cache
  cache.projects.set(cacheKey, {
    data: response.projects,
    cacheTime: now,
  });

  return response.projects;
}
