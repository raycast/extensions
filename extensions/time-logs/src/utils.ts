// utils.ts

import { TimeEntry, Project } from "./models";
import { parse } from "date-fns";
import { randomUUID } from "crypto";

// Generate a unique ID
export function generateId(): string {
  return randomUUID();
}

// Format a date to a readable string
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format time (hours:minutes)
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calculate duration between two dates in minutes
export function calculateDuration(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
}

// Round duration to the nearest interval (in minutes)
// Always rounds up to at least one interval for any active timer that has been stopped
export function roundDuration(minutes: number, roundingInterval: number): number {
  // Convert to a number to ensure we're working with a number
  const interval = Number(roundingInterval);

  // Handle edge cases
  if (minutes <= 0) return 0;
  if (isNaN(interval) || interval <= 0) return minutes;

  // If duration is less than one interval, round up to one interval
  if (minutes < interval) {
    return interval;
  }

  // For longer durations, round up to the next interval
  // Use ceiling instead of round to always round up
  return Math.ceil(minutes / interval) * interval;
}

// Format duration in hours and minutes
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  // Format as HH:MM
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Get month name from date
export function getMonthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Group entries by month
export function groupEntriesByMonth(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  const grouped: Record<string, TimeEntry[]> = {};

  entries.forEach((entry) => {
    const startDate = entry.startTime;
    const monthYear = getMonthName(startDate);

    if (!grouped[monthYear]) {
      grouped[monthYear] = [];
    }

    grouped[monthYear].push(entry);
  });

  return grouped;
}

// Group entries by project
export function groupEntriesByProject(
  entries: TimeEntry[],
  projectsMap: Record<string, Project>,
): Record<string, TimeEntry[]> {
  const grouped: Record<string, TimeEntry[]> = {};
  const noProjectKey = "Unassigned";

  // Initialize with "Unassigned" group first so it appears at the top
  grouped[noProjectKey] = [];

  entries.forEach((entry) => {
    if (!entry.projectId) {
      grouped[noProjectKey].push(entry);
      return;
    }

    const project = projectsMap[entry.projectId];
    const projectName = project ? project.name : "Unknown Project";

    if (!grouped[projectName]) {
      grouped[projectName] = [];
    }

    grouped[projectName].push(entry);
  });

  // Remove "Unassigned" group if it's empty
  if (grouped[noProjectKey].length === 0) {
    delete grouped[noProjectKey];
  }

  return grouped;
}

// Format seconds to HH:MM:SS for timer display
export function formatTimerDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs].map((v) => v.toString().padStart(2, "0")).join(":");
}

// Calculate total hours per month from time entries
export function calculateMonthlyHoursSummary(entries: TimeEntry[]): { label: string; minutes: number }[] {
  const monthSummary: Record<string, number> = {};

  // Process each entry and accumulate minutes by month
  entries.forEach((entry) => {
    if (entry.startTime && entry.endTime && !entry.isActive) {
      const startDate = entry.startTime;
      const endDate = entry.endTime;
      const monthYear = getMonthName(startDate);
      const durationMinutes = calculateDuration(startDate, endDate);

      if (!monthSummary[monthYear]) {
        monthSummary[monthYear] = 0;
      }

      monthSummary[monthYear] += durationMinutes;
    }
  });

  // Convert to array and sort by most recent month first
  return Object.entries(monthSummary)
    .map(([label, minutes]) => ({ label, minutes }))
    .sort((a, b) => {
      // Parse "Month Year" format using date-fns
      const dateA = parse(a.label, "MMMM yyyy", new Date());
      const dateB = parse(b.label, "MMMM yyyy", new Date());
      return dateB.getTime() - dateA.getTime();
    });
}
