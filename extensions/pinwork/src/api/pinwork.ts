/**
 * Pinwork API Bridge
 *
 * Provides communication with the Pinwork macOS app using:
 * - AppleScript for read operations (fast, direct data access)
 * - URL scheme for write operations (ensures proper UI feedback)
 */

import { getApplications, open, showToast, Toast } from "@raycast/api";
import { runPinworkScript, escapeAppleScriptString } from "./applescript";
import {
  parseTasksOutput,
  parseProjectsOutput,
  parseTagsOutput,
} from "./parsers";
import type {
  Task,
  Project,
  Tag,
  DeferTarget,
  SearchScope,
  QuickAddParams,
  RescheduleParams,
} from "./types";

// MARK: - Constants

export const PINWORK_BUNDLE_ID = "tech.adapting.pinwork";
const PINWORK_PROCESS_NAME = "Pinwork";
const URL_SCHEME = "pinwork://";

// MARK: - Types

export interface PinworkAvailability {
  installed: boolean;
  running: boolean;
}

export interface ReadOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function getPinworkAvailability(): Promise<PinworkAvailability> {
  const [apps, registered, running] = await Promise.all([
    getApplications(),
    isPinworkRegistered(),
    isPinworkRunning(),
  ]);
  const installed =
    apps.some((app) => app.bundleId === PINWORK_BUNDLE_ID) ||
    registered ||
    running;
  return { installed, running };
}

async function isPinworkRegistered(options?: ReadOptions): Promise<boolean> {
  const escapedBundleId = escapeAppleScriptString(PINWORK_BUNDLE_ID);
  const script = `
    try
      set resolvedBundleId to id of application "Pinwork"
      return resolvedBundleId is "${escapedBundleId}"
    on error
      return false
    end try
  `;

  const result = await runPinworkScript(script, options);
  return result.trim().toLowerCase() === "true";
}

async function isPinworkRunning(options?: ReadOptions): Promise<boolean> {
  const escapedName = escapeAppleScriptString(PINWORK_PROCESS_NAME);
  const escapedBundleId = escapeAppleScriptString(PINWORK_BUNDLE_ID);
  const script = `
    tell application "System Events"
      set runningByName to (name of processes) contains "${escapedName}"
      set runningByBundle to (bundle identifier of application processes) contains "${escapedBundleId}"
      set isRunning to (runningByName or runningByBundle)
    end tell
    return isRunning
  `;

  const result = await runPinworkScript(script, options);
  return result.trim().toLowerCase() === "true";
}

// MARK: - Read Operations (AppleScript)

/**
 * Fetches today's tasks from Pinwork.
 */
export async function getTodayTasks(
  options: ReadOptions = {},
): Promise<Task[]> {
  const script = `
    tell application "Pinwork"
      today tasks data
    end tell
  `;

  const result = await runPinworkScript(script, options);
  return parseTasksOutput(result);
}

/**
 * Fetches inbox tasks from Pinwork.
 */
export async function getInboxTasks(
  options: ReadOptions = {},
): Promise<Task[]> {
  const script = `
    tell application "Pinwork"
      inbox tasks data
    end tell
  `;

  const result = await runPinworkScript(script, options);
  return parseTasksOutput(result);
}

/**
 * Fetches all tasks from Pinwork.
 */
export async function getAllTasks(options: ReadOptions = {}): Promise<Task[]> {
  const script = `
    tell application "Pinwork"
      all tasks data
    end tell
  `;

  const result = await runPinworkScript(script, {
    ...options,
    timeoutMs: options.timeoutMs ?? 30_000,
  });
  return parseTasksOutput(result);
}

/**
 * Searches tasks by query string.
 */
export async function searchTasks(
  query: string,
  scope: SearchScope = "all",
  options: ReadOptions = {},
): Promise<Task[]> {
  const escapedQuery = escapeAppleScriptString(query);
  const escapedScope = escapeAppleScriptString(scope);
  const script = `
    tell application "Pinwork"
      search tasks data "${escapedQuery}" in "${escapedScope}"
    end tell
  `;

  const result = await runPinworkScript(script, options);
  return parseTasksOutput(result);
}

/**
 * Fetches all projects from Pinwork.
 */
export async function getProjects(
  options: ReadOptions = {},
): Promise<Project[]> {
  const script = `
    tell application "Pinwork"
      projects data
    end tell
  `;

  const result = await runPinworkScript(script, options);
  return parseProjectsOutput(result);
}

/**
 * Fetches all tags from Pinwork.
 */
export async function getTags(options: ReadOptions = {}): Promise<Tag[]> {
  const script = `
    tell application "Pinwork"
      tags data
    end tell
  `;

  const result = await runPinworkScript(script, options);
  return parseTagsOutput(result);
}

/**
 * Gets the count of today's tasks (for menu bar).
 */
export async function getTodayTaskCount(
  options: ReadOptions = {},
): Promise<number> {
  const script = `
    tell application "Pinwork"
      return count of (today tasks)
    end tell
  `;

  const result = await runPinworkScript(script, options);
  return parseInt(result, 10) || 0;
}

// MARK: - Write Operations (URL Scheme)

async function showRequestToast(message: string): Promise<void> {
  await showToast({
    style: Toast.Style.Success,
    title: "Sent to Pinwork",
    message,
  });
}

/**
 * Completes a task.
 */
export async function completeTask(taskId: string): Promise<void> {
  const url = `${URL_SCHEME}complete/${encodeURIComponent(taskId)}`;
  await open(url);
  await showRequestToast("Request: complete task");
}

/**
 * Uncompletes a task.
 */
export async function uncompleteTask(taskId: string): Promise<void> {
  const url = `${URL_SCHEME}uncomplete/${encodeURIComponent(taskId)}`;
  await open(url);
  await showRequestToast("Request: reopen task");
}

/**
 * Defers a task to a later date.
 */
export async function deferTask(
  taskId: string,
  target: DeferTarget,
): Promise<void> {
  const url = `${URL_SCHEME}defer/${encodeURIComponent(taskId)}?to=${encodeURIComponent(target)}`;
  await open(url);
  await showRequestToast(`Request: defer to ${target}`);
}

/**
 * Defers a task to a specific date.
 */
export async function deferTaskToDate(
  taskId: string,
  date: Date,
): Promise<void> {
  const isoDate = date.toISOString().split("T")[0];
  const url = `${URL_SCHEME}defer/${encodeURIComponent(taskId)}?until=${encodeURIComponent(isoDate)}`;
  await open(url);
  await showRequestToast("Request: defer to date");
}

/**
 * Reschedules a task to a new date/time.
 */
export async function rescheduleTask(
  taskId: string,
  params: RescheduleParams,
): Promise<void> {
  let url = `${URL_SCHEME}reschedule/${encodeURIComponent(taskId)}?date=${encodeURIComponent(params.date)}`;
  if (params.time) {
    url += `&time=${encodeURIComponent(params.time)}`;
  }
  await open(url);
  await showRequestToast("Request: reschedule task");
}

/**
 * Archives a task.
 */
export async function archiveTask(taskId: string): Promise<void> {
  const url = `${URL_SCHEME}archive/${encodeURIComponent(taskId)}`;
  await open(url);
  await showRequestToast("Request: archive task");
}

/**
 * Deletes a task.
 */
export async function deleteTask(taskId: string): Promise<void> {
  const url = `${URL_SCHEME}delete/${encodeURIComponent(taskId)}`;
  await open(url);
  await showRequestToast("Request: delete task");
}

/**
 * Quick adds a task using natural language.
 */
export async function quickAddTask(params: QuickAddParams): Promise<void> {
  const encodedText = encodeURIComponent(params.text);
  const url = `${URL_SCHEME}quickadd?text=${encodedText}`;
  await open(url);
  await showRequestToast("Request: add task");
}

/**
 * Opens Pinwork to a specific view.
 */
export async function openView(
  view: "today" | "inbox" | "next" | "later" | "someday" | "add",
): Promise<void> {
  const url = `${URL_SCHEME}${view}`;
  await open(url);
}

/**
 * Opens a specific task in Pinwork.
 */
export async function openTask(taskId: string): Promise<void> {
  const url = `${URL_SCHEME}task/${encodeURIComponent(taskId)}`;
  await open(url);
}

/**
 * Opens a specific project in Pinwork.
 */
export async function openProject(projectId: string): Promise<void> {
  const url = `${URL_SCHEME}project/${encodeURIComponent(projectId)}`;
  await open(url);
}
