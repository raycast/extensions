import { getPreferenceValues } from "@raycast/api";
// node-fetch v3 is ESM only, but Raycast uses CommonJS
// Using this approach for compatibility
import fetch, { Response } from "node-fetch";

interface Preferences {
  apiKey: string;
  workspaceId: string;
}

interface MotionTask {
  id?: string;
  name: string;
  description?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  workspaceId: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  label?: string;
  projectId?: string;
  duration?: number | "NONE" | "REMINDER";
  autoScheduled?: {
    startDate?: string;
    deadlineType?: "HARD" | "SOFT" | "NONE";
    schedule?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
}

interface Workspace {
  id: string;
  name: string;
  teamId: string | null;
  type: string;
  labels: string[];
  taskStatuses: TaskStatus[];
  // Adding debug properties to help with testing
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  memberCount?: number;
  settings?: Record<string, unknown>;
}

interface TaskStatus {
  name: string;
  isDefaultStatus: boolean;
  isResolvedStatus: boolean;
}

interface WorkspacesResponse {
  workspaces: Workspace[];
}

// Motion API endpoints
const BASE_URL = "https://api.usemotion.com/v1";

// Available labels (fetched from workspace data)
export const LABEL_PRESETS = [
  "House",
  "Personal",
  "St Faith's",
  "Westside",
  "Goals",
  "BAU",
  "ACA",
  "Job hunt",
  "Boys",
  "Board",
];

// Schedule presets to fix build error
export const SCHEDULE_PRESETS = ["Later Today", "Tomorrow", "This Week", "Next Week", "Custom"];

// Add debug logging to help troubleshoot API issues
const logRequest = (
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>
) => {
  console.log(`[REQUEST] ${method} ${url}`);
  console.log("[HEADERS]", JSON.stringify(headers, null, 2));
  if (body) {
    console.log("[BODY]", JSON.stringify(body, null, 2));
  }
};

const logResponse = async (response: Response) => {
  console.log(`[RESPONSE] Status: ${response.status} ${response.statusText}`);
  try {
    // Clone the response to read the body, as it can only be read once
    const clone = response.clone();
    const text = await clone.text();
    console.log("[RESPONSE BODY]", text);
    return text;
  } catch (error) {
    console.log("[RESPONSE BODY ERROR]", error);
    return "";
  }
};

export const getMotionApiClient = () => {
  const preferences = getPreferenceValues<Preferences>();

  // Set up API authentication with the provided API key
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": preferences.apiKey,
  };

  // Log the workspace ID for debugging
  console.log("[DEBUG] Using workspace ID:", preferences.workspaceId);

  return {
    // Get the workspace ID (for use in components)
    getWorkspaceId(): string {
      return preferences.workspaceId;
    },

    async createTask(taskInput: {
      title: string;
      description?: string;
      dueDate?: Date;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
      status?: "TODO" | "IN_PROGRESS" | "DONE";
      label?: string;
      projectId?: string;
      duration?: number | "NONE" | "REMINDER";
    }): Promise<MotionTask> {
      console.log("[DEBUG] Creating task with input:", JSON.stringify(taskInput, null, 2));

      // Simplify our approach now that we know the correct format
      const url = `${BASE_URL}/tasks`;

      // Destructure to remove the label property which API doesn't accept
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { label, ...taskData } = taskInput;

      // Create task object with the correct properties
      const task = {
        name: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate?.toISOString(),
        priority: taskData.priority,
        status: taskData.status,
        workspaceId: preferences.workspaceId,
        projectId: taskData.projectId,
        duration: taskData.duration, // Add duration field
        // Add auto-scheduling by default
        autoScheduled: {
          deadlineType: "SOFT", // Use SOFT deadline by default
          schedule: "Work Hours", // Use standard work hours for scheduling
        },
      };

      logRequest("POST", url, headers, task);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(task),
        });

        if (!response.ok) {
          const responseText = await logResponse(response);
          throw new Error(
            `Failed to create task: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`
          );
        }

        return response.json() as Promise<MotionTask>;
      } catch (error) {
        console.error("[DEBUG] Create task error:", error);
        throw error;
      }
    },

    async getProjects(): Promise<Project[]> {
      const url = `${BASE_URL}/projects?workspaceId=${preferences.workspaceId}`;
      logRequest("GET", url, headers);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          const responseText = await logResponse(response);
          throw new Error(
            `Failed to get projects: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`
          );
        }

        // Parse the response
        const data = await response.json();

        // Log full response for debugging
        console.log("[DEBUG] Projects response data:", JSON.stringify(data, null, 2));

        // Handle both array and object with projects property formats
        if (Array.isArray(data)) {
          return data as Project[];
        } else if (data && typeof data === "object") {
          // Check for common wrapper properties like 'projects', 'items', 'data', etc.
          for (const key of ["projects", "items", "data", "results"]) {
            if (Array.isArray(data[key])) {
              return data[key] as Project[];
            }
          }

          // If we can't find a projects array in a known property, return whatever we got
          console.warn("[DEBUG] Couldn't find projects array in response, returning raw data");
          return Array.isArray(data) ? data : ([data] as Project[]);
        }

        // Fallback to empty array if we couldn't parse anything
        console.warn("[DEBUG] Returning empty array as couldn't parse projects response");
        return [];
      } catch (error) {
        console.error("[DEBUG] Get projects error:", error);
        throw error;
      }
    },

    async getTasks(): Promise<MotionTask[]> {
      // The workspace-based URL approach is not working (404 error)
      // Let's try using the base tasks endpoint with a query parameter instead
      const url = `${BASE_URL}/tasks?workspaceId=${preferences.workspaceId}`;
      logRequest("GET", url, headers);

      try {
        console.log("[DEBUG] Attempting to fetch tasks from Motion API...");
        const response = await fetch(url, {
          method: "GET",
          headers,
        });

        console.log(
          `[DEBUG] Motion API response status: ${response.status} ${response.statusText}`
        );

        if (!response.ok) {
          const responseText = await logResponse(response);
          const errorMessage = `Failed to get tasks: ${response.statusText}${responseText ? ` - ${responseText}` : ""} (Status: ${response.status})`;
          console.error("[DEBUG] API Error:", errorMessage);
          throw new Error(errorMessage);
        }

        // Parse the response
        const data = await response.json();

        // Log full response for debugging
        console.log("[DEBUG] Tasks response data:", JSON.stringify(data, null, 2));
        console.log(`[DEBUG] Response data type: ${typeof data}, isArray: ${Array.isArray(data)}`);

        if (data === null || data === undefined) {
          console.warn("[DEBUG] Response data is null or undefined");
          return [];
        }

        // Handle both array and object with tasks property formats
        if (Array.isArray(data)) {
          console.log(`[DEBUG] Found ${data.length} tasks in array format`);
          return data as MotionTask[];
        } else if (data && typeof data === "object") {
          // Check for common wrapper properties like 'tasks', 'items', 'data', etc.
          for (const key of ["tasks", "items", "data", "results"]) {
            if (Array.isArray(data[key])) {
              console.log(`[DEBUG] Found ${data[key].length} tasks in '${key}' property`);
              return data[key] as MotionTask[];
            }
          }

          // If we can't find a tasks array in a known property, return whatever we got
          // This will at least give us debugging info
          console.warn("[DEBUG] Couldn't find tasks array in response, returning raw data");
          return Array.isArray(data) ? data : ([data] as MotionTask[]);
        }

        // Fallback to empty array if we couldn't parse anything
        console.warn("[DEBUG] Returning empty array as couldn't parse tasks response");
        return [];
      } catch (error) {
        console.error("[DEBUG] Get tasks error:", error);
        if (error instanceof Error) {
          console.error("[DEBUG] Error name:", error.name);
          console.error("[DEBUG] Error message:", error.message);
          console.error("[DEBUG] Error stack:", error.stack);
        }
        throw error;
      }
    },

    async getTaskById(id: string): Promise<MotionTask> {
      const url = `${BASE_URL}/tasks/${id}?workspaceId=${preferences.workspaceId}`;
      logRequest("GET", url, headers);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const responseText = await logResponse(response);
        throw new Error(
          `Failed to get task: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`
        );
      }

      return response.json() as Promise<MotionTask>;
    },

    async updateTask(task: MotionTask): Promise<MotionTask> {
      console.log("[DEBUG] updateTask called with task:", JSON.stringify(task, null, 2));

      if (!task.id) {
        const error = new Error("Task ID is required for updating a task");
        console.error("[ERROR] Update task failed:", error);
        throw error;
      }

      const workspaceId = this.getWorkspaceId();
      if (!workspaceId) {
        const error = new Error("Workspace ID is missing. Please set up your Motion preferences");
        console.error("[ERROR] Update task failed:", error);
        throw error;
      }

      // Validate essential task properties
      const requiredProps = ["name"];
      for (const prop of requiredProps) {
        if (!task[prop as keyof MotionTask]) {
          const error = new Error(`Task ${prop} is required for updating a task`);
          console.error("[ERROR] Update task failed:", error);
          throw error;
        }
      }

      // Extract clean update payload (remove undefined values)
      const cleanPayload = Object.entries(task).reduce(
        (acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string | number | boolean | object | null>
      );

      // Ensure workspaceId is included in the payload
      cleanPayload.workspaceId = workspaceId;

      // Log exact character codes of IDs to debug encoding issues
      console.log(
        "[DEBUG] Task ID character codes:",
        [...task.id].map((c) => c.charCodeAt(0))
      );
      console.log(
        "[DEBUG] Workspace ID character codes:",
        [...workspaceId].map((c) => c.charCodeAt(0))
      );

      // *** IMPORTANT: The "0" and "O" characters can be confused, and there may be other encoding issues ***
      // Try a direct fetch via the Task List endpoint first, which should give us the correct task data with exact IDs
      try {
        console.log("[DEBUG] Fetching current task data to ensure correct IDs...");
        const tasksUrl = `${BASE_URL}/tasks?workspaceId=${workspaceId}`;
        const tasksResponse = await fetch(tasksUrl, {
          method: "GET",
          headers,
        });

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          console.log("[DEBUG] Successfully fetched tasks list");

          // Find the task in the list by comparing IDs (lenient matching)
          let exactTask;
          let matchMethod = "";

          if (Array.isArray(tasksData)) {
            // Try direct match first
            exactTask = tasksData.find((t) => t.id === task.id);
            if (exactTask) {
              matchMethod = "direct match";
            }

            // If no direct match, try case-insensitive match
            if (!exactTask) {
              const taskIdLower = task.id.toLowerCase();
              exactTask = tasksData.find((t) => t.id && t.id.toLowerCase() === taskIdLower);
              if (exactTask) {
                matchMethod = "case-insensitive match";
              }
            }

            // Last resort: try matching by name if ID doesn't match
            if (!exactTask && task.name) {
              exactTask = tasksData.find((t) => t.name === task.name);
              if (exactTask) {
                matchMethod = "name match";
              }
            }

            if (exactTask) {
              console.log(`[DEBUG] Found matching task using ${matchMethod}:`);
              console.log("[DEBUG] Original ID:", task.id);
              console.log("[DEBUG] Exact ID from API:", exactTask.id);

              // Use the exact IDs from the API for the update
              const exactTaskId = exactTask.id;
              const exactWorkspaceId = exactTask.workspaceId;

              // Update with the exact IDs from the API
              const updateUrl = `${BASE_URL}/tasks/${exactTaskId}?workspaceId=${exactWorkspaceId}`;
              console.log("[DEBUG] Using exact IDs for update URL:", updateUrl);

              // Update our payload with exact IDs
              cleanPayload.id = exactTaskId;
              cleanPayload.workspaceId = exactWorkspaceId;

              const response = await fetch(updateUrl, {
                method: "PUT",
                headers,
                body: JSON.stringify(cleanPayload),
              });

              if (response.ok) {
                const data = await response.json();
                console.log("[DEBUG] Task update successful with exact IDs");
                return data;
              } else {
                const responseText = await response.text();
                console.error(
                  `[ERROR] Failed to update task with exact IDs. Status: ${response.status}. Response:`,
                  responseText
                );
                // Continue to fallback approach
              }
            } else {
              console.log("[DEBUG] Could not find exact matching task in tasks list");
            }
          } else {
            console.log("[DEBUG] Tasks data is not an array, unexpected format:", typeof tasksData);
          }
        } else {
          console.log(
            `[DEBUG] Failed to fetch tasks list: ${tasksResponse.status} ${tasksResponse.statusText}`
          );
        }
      } catch (error) {
        console.error("[ERROR] Error fetching task data:", error);
        // Continue to fallback approach
      }

      // Fallback: Try multiple URL formats as we've done before
      console.log("[DEBUG] Using fallback approach with multiple URL formats");

      // Try different URL formats in sequence
      const urlFormats = [
        // Format 1: workspaces/{workspaceId}/tasks/{taskId}
        `${BASE_URL}/workspaces/${workspaceId}/tasks/${task.id}`,
        // Format 2: tasks/{taskId}?workspaceId={workspaceId}
        `${BASE_URL}/tasks/${task.id}?workspaceId=${workspaceId}`,
        // Format 3: tasks/{taskId}?workspace_id={workspaceId}
        `${BASE_URL}/tasks/${task.id}?workspace_id=${workspaceId}`,
      ];

      let lastError = null;

      // Try each URL format in sequence
      for (const url of urlFormats) {
        console.log("[DEBUG] Trying URL format:", url);

        try {
          const response = await fetch(url, {
            method: "PUT",
            headers,
            body: JSON.stringify(cleanPayload),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("[DEBUG] Task update successful with URL:", url);
            return data;
          } else {
            const responseText = await response.text();
            console.error(
              `[ERROR] Failed to update task with URL ${url}. Status: ${response.status}. Response:`,
              responseText
            );
            lastError = new Error(`API Error (${response.status}): ${responseText}`);
          }
        } catch (error) {
          console.error("[ERROR] Network error with URL:", url, error);
          lastError = error;
        }
      }

      // All URL formats failed
      console.error("[ERROR] All URL formats failed for task update");
      throw lastError || new Error("Failed to update task: All URL formats failed");
    },

    async deleteTask(id: string): Promise<void> {
      const url = `${BASE_URL}/tasks/${id}?workspaceId=${preferences.workspaceId}`;
      logRequest("DELETE", url, headers);

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const responseText = await logResponse(response);
        throw new Error(
          `Failed to delete task: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`
        );
      }
    },

    async getWorkspaces(): Promise<WorkspacesResponse> {
      console.log("[DEBUG] Attempting to get workspace information...");

      // Try different endpoints to see which one works
      const endpoints = [`${BASE_URL}/workspaces`, `${BASE_URL}/organizations`];

      for (const endpoint of endpoints) {
        try {
          console.log(`[DEBUG] Trying endpoint: ${endpoint}`);
          logRequest("GET", endpoint, headers);

          const response = await fetch(endpoint, {
            method: "GET",
            headers,
          });

          if (response.ok) {
            const rawData = await response.json();
            console.log(`[DEBUG] Raw response from ${endpoint}:`, JSON.stringify(rawData, null, 2));

            // Check if the response is already in the expected format
            if (
              rawData &&
              typeof rawData === "object" &&
              "workspaces" in rawData &&
              Array.isArray(rawData.workspaces)
            ) {
              console.log(
                `[DEBUG] Found standard format response with ${rawData.workspaces.length} workspaces`
              );
              return rawData as WorkspacesResponse;
            }

            // Check if the response is an array of workspaces
            if (Array.isArray(rawData)) {
              console.log(`[DEBUG] Found array format response with ${rawData.length} workspaces`);
              return { workspaces: rawData } as WorkspacesResponse;
            }

            // Check if the response is a different format but contains workspace information
            if (rawData && typeof rawData === "object") {
              // Look for arrays in the object that might contain workspaces
              for (const [key, value] of Object.entries(rawData)) {
                if (
                  Array.isArray(value) &&
                  value.length > 0 &&
                  value[0] &&
                  typeof value[0] === "object" &&
                  "id" in value[0]
                ) {
                  console.log(
                    `[DEBUG] Found workspaces in '${key}' property with ${value.length} workspaces`
                  );
                  return { workspaces: value } as WorkspacesResponse;
                }
              }
            }

            // If we couldn't parse it in a standard way, return the raw data wrapped
            console.log(
              "[DEBUG] Could not identify standard format, returning raw data wrapped in workspaces property"
            );
            return { workspaces: [rawData] } as WorkspacesResponse;
          } else {
            const responseText = await logResponse(response);
            console.log(
              `[DEBUG] Failed with endpoint ${endpoint}: ${response.statusText} - ${responseText}`
            );
          }
        } catch (error) {
          console.error(`[DEBUG] Error with endpoint ${endpoint}:`, error);
        }
      }

      // Return empty workspaces array instead of throwing an error
      console.log(
        "[DEBUG] Failed to get workspace information from any endpoint, returning empty workspace array"
      );
      return { workspaces: [] };
    },
  };
};
