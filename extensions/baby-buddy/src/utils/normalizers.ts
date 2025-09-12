/**
 * Utility functions for normalizing values for Baby Buddy API
 */

import { Child } from "../api";

/**
 * Normalizes feeding type values to match Baby Buddy API expectations
 * Valid types: breast milk, formula, fortified breast milk, solid food
 */
export function normalizeType(type: string): string {
  type = type.toLowerCase();

  // Valid types in Baby Buddy: breast milk, formula, fortified breast milk, solid food
  if (type.includes("breast") && type.includes("milk")) {
    return "breast milk";
  } else if (type.includes("formula")) {
    return "formula";
  } else if (type.includes("fortified")) {
    return "fortified breast milk";
  } else if (type.includes("solid")) {
    return "solid food";
  }

  // Default to breast milk if no match
  return "breast milk";
}

/**
 * Normalizes feeding method values to match Baby Buddy API expectations
 * Valid methods: bottle, left breast, right breast, both breasts
 */
export function normalizeMethod(method: string): string {
  method = method.toLowerCase();

  // Valid methods in Baby Buddy: bottle, left breast, right breast, both breasts
  if (method.includes("bottle")) {
    return "bottle";
  } else if (method.includes("self")) {
    return "self fed";
  } else if (method.includes("left")) {
    return "left breast";
  } else if (method.includes("right")) {
    return "right breast";
  } else if (method.includes("both")) {
    return "both breasts";
  } else if (method.includes("breast")) {
    // If just "breast" is specified, default to "both breasts"
    return "both breasts";
  }

  // Default to bottle if no match
  return "bottle";
}

/**
 * Formats a time string to ISO format
 * Handles HH:MM:SS format and ISO format
 */
export function formatTimeToISO(timeString?: string): string | undefined {
  if (!timeString) return undefined;

  if (timeString.includes("T") && timeString.includes("-")) {
    // Already in ISO format
    return timeString;
  } else if (timeString.includes(":")) {
    // HH:MM:SS or HH:MM format
    const today = new Date();
    const [hours, minutes, seconds = "00"] = timeString.split(":").map((part) => part.trim());

    today.setHours(parseInt(hours, 10));
    today.setMinutes(parseInt(minutes, 10));
    today.setSeconds(parseInt(seconds, 10));
    today.setMilliseconds(0);

    return today.toISOString();
  }

  return undefined;
}

/**
 * Calculates duration between two dates in HH:MM:SS format
 */
export function calculateDuration(startTime?: string, endTime?: string): string | undefined {
  if (!startTime || !endTime) return undefined;

  try {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const durationMs = endDate.getTime() - startDate.getTime();

    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    return `${durationHours.toString().padStart(2, "0")}:${durationMinutes.toString().padStart(2, "0")}:${durationSeconds.toString().padStart(2, "0")}`;
  } catch {
    return undefined;
  }
}

/**
 * Finds a child by name with flexible matching
 * @param children - List of children to search
 * @param childName - Name to match (can be first name, last name, or full name)
 */
export function findChildByName(children: Child[], childName: string): Child | undefined {
  return children.find(
    (c) =>
      c.first_name.toLowerCase() === childName.toLowerCase() ||
      c.first_name.toLowerCase().includes(childName.toLowerCase()) ||
      `${c.first_name} ${c.last_name}`.toLowerCase() === childName.toLowerCase() ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(childName.toLowerCase()),
  );
}

/**
 * Normalizes diaper contents values
 * @param contents - Description of the diaper contents (wet, solid, both)
 * @returns Object with wet and solid boolean properties
 */
export function normalizeContents(contents: string): { wet: boolean; solid: boolean } {
  contents = contents.toLowerCase();

  if (contents.includes("both")) {
    return { wet: true, solid: true };
  } else if (contents.includes("wet")) {
    return { wet: true, solid: false };
  } else if (contents.includes("solid") || contents.includes("poop") || contents.includes("bm")) {
    return { wet: false, solid: true };
  }

  // Default to wet if no match
  return { wet: true, solid: false };
}

/**
 * Gets a human-readable description of diaper contents
 * @param contents - Object with wet and solid boolean properties
 * @returns String description of the contents
 */
export function getContentsDescription(contents: { wet: boolean; solid: boolean }): string {
  if (contents.wet && contents.solid) {
    return "wet and solid";
  } else if (contents.wet) {
    return "wet";
  } else if (contents.solid) {
    return "solid";
  }
  return "unknown";
}
