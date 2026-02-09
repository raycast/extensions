/**
 * Timesheet API for live tracking functionality
 */

import { getAuthenticatedClient } from "./auth";
import { Project, Task, TimerState, CachedData } from "./types";
import { getStorage } from "./storage";

// Cache configuration
const TIMER_CACHE_KEY = "odoo_timer_cache";
const TIMER_CACHE_TTL = 30 * 1000; // 30 seconds

async function cacheTimerState(state: TimerState): Promise<void> {
  const cached: CachedData<TimerState> = { data: state, timestamp: Date.now() };
  await getStorage().setItem(TIMER_CACHE_KEY, JSON.stringify(cached));
}

async function getCachedTimerState(): Promise<TimerState | null> {
  const raw = await getStorage().getItem(TIMER_CACHE_KEY);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as CachedData<TimerState>;
    if (Date.now() - cached.timestamp < TIMER_CACHE_TTL) {
      return cached.data;
    }
    return null;
  } catch {
    return null;
  }
}

async function clearTimerCache(): Promise<void> {
  await getStorage().removeItem(TIMER_CACHE_KEY);
}

/**
 * Start a new timer
 */
export async function startTimer(): Promise<{ timerId: number; startTime: string }> {
  const client = await getAuthenticatedClient();

  console.log("[Timesheet] Calling action_start_new_timesheet_timer");

  try {
    // Call the action method exactly as Odoo UI does: args=[{}]
    const result = await client.callKw<number | { id: number } | false | null>(
      "account.analytic.line",
      "action_start_new_timesheet_timer",
      [{}], // Empty object (not empty list!)
    );

    console.log("[Timesheet] Timer action result:", JSON.stringify(result));
    console.log("[Timesheet] Result type:", typeof result);

    // If false or null is returned, the action succeeded but didn't return the ID
    // Use get_running_timer to fetch the newly created timer
    if (result === false || result === null) {
      console.log("[Timesheet] Action returned false/null, calling get_running_timer");

      const timerResult = await client.callKw<{
        id?: number;
        start?: number;
        project_id?: number;
        task_id?: number;
        description?: string;
        step_timer?: number;
      }>("account.analytic.line", "get_running_timer", []);

      console.log("[Timesheet] get_running_timer result:", JSON.stringify(timerResult));

      if (!timerResult || !timerResult.id) {
        throw new Error("Timer action succeeded but no running timer found. Please try again.");
      }

      // Convert start time from elapsed minutes to ISO timestamp
      const startTime = new Date(Date.now() - (timerResult.start || 0) * 60000).toISOString();

      // Initialize timer state
      const timerState: TimerState = {
        timerId: timerResult.id,
        projectId: timerResult.project_id || null,
        projectName: null,
        taskId: timerResult.task_id || null,
        taskName: null,
        description: timerResult.description || null,
        startTime,
      };

      await cacheTimerState(timerState);

      return { timerId: timerResult.id, startTime };
    }

    // Extract timer ID from result
    console.log("[Timesheet] Extracting timer ID from result:", result);

    if (!result) {
      throw new Error("Failed to start timer: action returned invalid result");
    }

    const timerId = typeof result === "number" ? result : result.id;
    const startTime = new Date().toISOString();

    console.log("[Timesheet] Extracted timerId:", timerId);

    // Initialize timer state
    const timerState: TimerState = {
      timerId,
      projectId: null,
      projectName: null,
      taskId: null,
      taskName: null,
      description: null,
      startTime,
    };

    await cacheTimerState(timerState);

    return { timerId, startTime };
  } catch (error) {
    console.error("[Timesheet] Error in startTimer:", error);
    if (error instanceof Error) {
      console.error("[Timesheet] Error message:", error.message);
      console.error("[Timesheet] Error stack:", error.stack);
    }
    throw error;
  }
}

/**
 * Update timer with project, task, and/or description (deprecated - use assignTimerDetails instead)
 */
export async function updateTimer(
  timerId: number,
  projectId?: number,
  taskId?: number,
  description?: string,
): Promise<void> {
  const client = await getAuthenticatedClient();

  const values: Record<string, unknown> = {};

  if (projectId !== undefined) {
    values.project_id = projectId;
  }

  if (taskId !== undefined) {
    values.task_id = taskId;
  }

  if (description !== undefined) {
    values.name = description;
  }

  // Update the analytic line
  await client.callKw("account.analytic.line", "write", [[timerId], values]);

  // Update cached state
  const cachedState = await getCachedTimerState();
  if (cachedState && cachedState.timerId === timerId) {
    if (projectId !== undefined) {
      cachedState.projectId = projectId;
      // Fetch project name
      const projects = await getProjects();
      const project = projects.find((p) => p.id === projectId);
      cachedState.projectName = project?.name || null;
    }

    if (taskId !== undefined) {
      cachedState.taskId = taskId;
      // Fetch task name
      if (cachedState.projectId) {
        const tasks = await getTasks(cachedState.projectId);
        const task = tasks.find((t) => t.id === taskId);
        cachedState.taskName = task?.name || null;
      }
    }

    if (description !== undefined) {
      cachedState.description = description;
    }

    await cacheTimerState(cachedState);
  }
}

/**
 * Start a new timer with project, task, and description
 * Simplest approach: create and write directly
 */
export async function startTimerWithDetails(
  projectId: number,
  taskId: number,
  description?: string,
): Promise<{ timerId: number; startTime: string }> {
  const client = await getAuthenticatedClient();

  console.log(
    "[Timesheet] Starting timer with details - projectId:",
    projectId,
    "taskId:",
    taskId,
    "description:",
    description,
  );

  // Step 1: Create a timer record with project and task
  console.log("[Timesheet] Step 1: Creating timer record with project and task");

  const values: Record<string, unknown> = {
    project_id: projectId,
    task_id: taskId,
  };

  if (description) {
    values.name = description;
  }

  const timerId = await client.callKw<number>("account.analytic.line", "create", [values]);

  console.log("[Timesheet] Created timer record with ID:", timerId);

  // Step 2: Start the timer using action_timer_start (this sets timer_start to now)
  console.log("[Timesheet] Step 2: Starting the timer with action_timer_start");
  await client.callKw("account.analytic.line", "action_timer_start", [[timerId]]);

  console.log("[Timesheet] Step 4: Reading actual timer_start field from database");

  // Step 4: Read the actual timer_start field from the database (this is the real timestamp)
  const timerDetails = await client.callKw<Array<{ timer_start: string }>>("account.analytic.line", "read", [
    [timerId],
    ["timer_start"],
  ]);

  if (!timerDetails || timerDetails.length === 0) {
    throw new Error("Failed to read timer details");
  }

  const startTime = timerDetails[0].timer_start;
  console.log("[Timesheet] Timer started successfully. Actual start time from DB:", startTime);

  // Cache the timer state
  const timerState: TimerState = {
    timerId,
    projectId,
    projectName: null,
    taskId,
    taskName: null,
    description: description || null,
    startTime,
  };

  // Fetch project and task names
  const projects = await getProjects();
  const project = projects.find((p) => p.id === projectId);
  timerState.projectName = project?.name || null;

  const tasks = await getTasks(projectId);
  const task = tasks.find((t) => t.id === taskId);
  timerState.taskName = task?.name || null;

  await cacheTimerState(timerState);

  return { timerId, startTime };
}

/**
 * Assign project, task, and description to timer using onchange and web_save
 * This matches the Odoo web UI behavior
 */
export async function assignTimerDetails(
  timerId: number,
  projectId: number,
  taskId: number,
  description?: string,
): Promise<void> {
  const client = await getAuthenticatedClient();

  console.log(
    "[Timesheet] Starting assignTimerDetails - timerId:",
    timerId,
    "projectId:",
    projectId,
    "taskId:",
    taskId,
  );

  // Step 1: onchange call for project_id
  await client.callKw("account.analytic.line", "onchange", [
    [], // Empty list for new records
    {
      name: false,
      project_id: projectId,
      task_id: false,
      timer_start: false,
      unit_amount: 0,
    },
    ["project_id"],
    {
      name: {},
      project_id: {
        fields: { display_name: {} },
      },
      task_id: {
        fields: { display_name: {} },
      },
      timer_start: {},
      unit_amount: {},
    },
  ]);

  console.log("[Timesheet] Completed onchange for project_id");

  // Step 2: onchange call for task_id
  await client.callKw("account.analytic.line", "onchange", [
    [timerId], // Timer ID for existing records
    { task_id: taskId },
    ["task_id"],
    {
      name: {},
      project_id: {
        fields: { display_name: {} },
      },
      task_id: {
        fields: { display_name: {} },
      },
      timer_start: {},
      unit_amount: {},
    },
  ]);

  console.log("[Timesheet] Completed onchange for task_id");

  // Step 3: web_save to persist task_id and description
  const saveData: Record<string, unknown> = {
    task_id: taskId,
  };

  if (description) {
    saveData.name = description;
  }

  await client.callKw("account.analytic.line", "web_save", [[timerId], saveData], {
    specification: {},
  });

  console.log("[Timesheet] Completed web_save");

  // Update cache with new values
  const cachedState = await getCachedTimerState();
  if (cachedState && cachedState.timerId === timerId) {
    cachedState.projectId = projectId;
    cachedState.taskId = taskId;
    cachedState.description = description || null;

    // Fetch project and task names
    const projects = await getProjects();
    const project = projects.find((p) => p.id === projectId);
    cachedState.projectName = project?.name || null;

    const tasks = await getTasks(projectId);
    const task = tasks.find((t) => t.id === taskId);
    cachedState.taskName = task?.name || null;

    await cacheTimerState(cachedState);
  }

  console.log("[Timesheet] Completed assignTimerDetails successfully");
}

/**
 * Stop the active timer
 */
export async function stopTimer(timerId: number): Promise<{ duration: number }> {
  const client = await getAuthenticatedClient();

  // Stop the timer with save=true parameter
  await client.callKw("account.analytic.line", "action_timer_stop", [timerId, true]);

  // Clear cached timer state
  await clearTimerCache();

  // Fetch the final duration
  const lines = await client.callKw<{ unit_amount: number }[]>("account.analytic.line", "read", [
    [timerId],
    ["unit_amount"],
  ]);

  const duration = lines && lines.length > 0 ? lines[0].unit_amount * 3600 : 0;

  return { duration };
}

/**
 * Cancel the active timer without saving
 */
export async function cancelTimer(timerId: number): Promise<void> {
  const client = await getAuthenticatedClient();

  // Unlink (delete) the timer without saving
  await client.callKw("account.analytic.line", "action_timer_unlink", [timerId]);

  // Clear cached timer state
  await clearTimerCache();
}

/**
 * Get list of projects
 */
export async function getProjects(search = ""): Promise<Project[]> {
  const client = await getAuthenticatedClient();

  const result = await client.callKw<[number, string][]>(
    "project.project",
    "name_search",
    [search], // name_search expects the search term as the first positional argument
    {
      limit: 50,
    },
  );

  return result.map(([id, name]) => ({ id, name }));
}

/**
 * Get list of tasks for a project
 */
export async function getTasks(projectId: number, search = ""): Promise<Task[]> {
  const client = await getAuthenticatedClient();

  const result = await client.callKw<[number, string][]>(
    "project.task",
    "name_search",
    [search], // name_search expects the search term as the first positional argument
    {
      args: [["project_id", "=", projectId]], // domain filter passed in kwargs
      limit: 50,
    },
  );

  return result.map(([id, name]) => ({ id, name }));
}

/**
 * Create a new task in a project
 */
export async function createTask(projectId: number, name: string): Promise<Task> {
  const client = await getAuthenticatedClient();

  const result = await client.callKw<[number, string]>("project.task", "name_create", [name], {
    context: {
      default_project_id: projectId,
    },
  });

  return { id: result[0], name: result[1] };
}

/**
 * Get server time for synchronization
 */
export async function getServerTime(): Promise<string> {
  const client = await getAuthenticatedClient();

  try {
    const result = await client.callKw<string>("timer.timer", "get_server_time", []);
    return result;
  } catch {
    // If this fails, just return current time
    return new Date().toISOString();
  }
}

/**
 * Get current running timer using get_running_timer endpoint
 */
export async function getRunningTimer(useCache = true): Promise<TimerState | null> {
  // Try cache first
  if (useCache) {
    const cached = await getCachedTimerState();
    if (cached) {
      return cached;
    }
  }

  const client = await getAuthenticatedClient();

  console.log("[Timesheet] Calling get_running_timer");

  try {
    const result = await client.callKw<{
      id?: number;
      start?: number;
      project_id?: number;
      task_id?: number;
      description?: string;
      step_timer?: number;
    }>("account.analytic.line", "get_running_timer", []);

    // Check if timer is running (has 'id' field)
    if (!result || !result.id) {
      await clearTimerCache();
      return null;
    }

    const timerId = result.id;

    // Read the actual timer_start field from database (this is the real timestamp)
    const timerDetails = await client.callKw<Array<{ timer_start: string }>>("account.analytic.line", "read", [
      [timerId],
      ["timer_start"],
    ]);

    if (!timerDetails || timerDetails.length === 0) {
      console.error("[Timesheet] Failed to read timer_start field");
      await clearTimerCache();
      return null;
    }

    const startTime = timerDetails[0].timer_start;
    console.log("[Timesheet] Timer start time from DB:", startTime);

    // Parse and cache timer state
    const timerState: TimerState = {
      timerId,
      projectId: result.project_id || null,
      projectName: null, // Will be fetched separately if needed
      taskId: result.task_id || null,
      taskName: null, // Will be fetched separately if needed
      description: result.description || null,
      startTime,
    };

    // Fetch project and task names if IDs are present
    if (timerState.projectId) {
      const projects = await getProjects();
      const project = projects.find((p) => p.id === timerState.projectId);
      timerState.projectName = project?.name || null;
    }

    if (timerState.taskId && timerState.projectId) {
      const tasks = await getTasks(timerState.projectId);
      const task = tasks.find((t) => t.id === timerState.taskId);
      timerState.taskName = task?.name || null;
    }

    await cacheTimerState(timerState);

    return timerState;
  } catch (error) {
    console.error("[Timesheet] Error fetching running timer:", error);
    // If this fails, return null (no active timer)
    return null;
  }
}

/**
 * Get current timer state (deprecated - use getRunningTimer instead)
 */
export async function getTimerState(useCache = true): Promise<TimerState | null> {
  return getRunningTimer(useCache);
}

/**
 * Check if there's an active timer
 */
export async function hasActiveTimer(): Promise<boolean> {
  const state = await getTimerState();
  return state !== null;
}
