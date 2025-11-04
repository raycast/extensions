// Utility functions for formatting dates and display text

import { Task } from "../api/types";

/**
 * Parse a YYYY-MM-DD date string as a local date (not UTC)
 * This prevents timezone offset issues where "2025-10-29" would be parsed as UTC
 * and display as the previous day in negative UTC offset timezones
 */
function parseDateAsLocal(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date string for display
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return "";

  try {
    // Parse as local date to avoid timezone issues
    const date = parseDateAsLocal(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time parts for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else if (date.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    // Format as "Mon, Jan 1"
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dateString?: string): boolean {
  if (!dateString) return false;

  try {
    // Parse as local date to avoid timezone issues
    const date = parseDateAsLocal(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date.getTime() < today.getTime();
  } catch {
    return false;
  }
}

/**
 * Check if a date is today
 */
export function isToday(dateString?: string): boolean {
  if (!dateString) return false;

  try {
    // Parse as local date to avoid timezone issues
    const date = parseDateAsLocal(dateString);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date.getTime() === today.getTime();
  } catch {
    return false;
  }
}

/**
 * Format priority for display with emoji
 */
export function formatPriority(priority?: string): string {
  if (!priority) return "";

  const p = priority.toLowerCase();
  if (p === "high" || p === "urgent") return "🔴 High";
  if (p === "medium" || p === "normal") return "🟡 Medium";
  if (p === "low") return "🟢 Low";

  return priority;
}

/**
 * Get priority sort value
 */
export function getPrioritySortValue(priority?: string): number {
  if (!priority) return 3;

  const p = priority.toLowerCase();
  if (p === "high" || p === "urgent") return 0;
  if (p === "medium" || p === "normal") return 1;
  if (p === "low") return 2;

  return 3;
}

/**
 * Format tags for display
 */
export function formatTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return "";
  return tags.map((tag) => `#${tag}`).join(" ");
}

/**
 * Format projects for display
 */
export function formatProjects(projects?: string[]): string {
  if (!projects || projects.length === 0) return "";
  // Remove [[ ]] brackets from project names
  return projects.map((project) => project.replace(/\[\[|\]\]/g, "")).join(", ");
}

/**
 * Get task subtitle with metadata
 */
export function getTaskSubtitle(task: Task): string {
  const parts: string[] = [];

  if (task.due) {
    const dueText = formatDate(task.due);
    if (isOverdue(task.due)) {
      parts.push(`⚠️ ${dueText}`);
    } else {
      parts.push(`📅 ${dueText}`);
    }
  }

  if (task.priority) {
    parts.push(formatPriority(task.priority));
  }

  if (task.projects && task.projects.length > 0) {
    parts.push(`📁 ${formatProjects(task.projects)}`);
  }

  if (task.tags && task.tags.length > 0) {
    parts.push(formatTags(task.tags));
  }

  return parts.join(" • ");
}

/**
 * Format time remaining for pomodoro
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Extract task ID from task (use id field if available, fallback to path)
 */
export function getTaskId(task: Task): string {
  return task.id || task.path;
}
