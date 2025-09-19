/**
 * Utility functions for preparing and transforming API data
 */

import { Child, DiaperEntry, FeedingEntry, SleepEntry } from "../api";
import { TIMER_TYPES } from "./constants";
import { calculateDuration, formatTimeToISO } from "./date-helpers";

/**
 * Find a child by name in an array of children
 */
export function findChildByName(children: Child[], childName: string): Child | undefined {
  // First try exact match
  let child = children.find((c) => `${c.first_name} ${c.last_name}`.toLowerCase() === childName.toLowerCase());

  // If no exact match, try by first name only
  if (!child) {
    child = children.find((c) => c.first_name.toLowerCase() === childName.toLowerCase());
  }

  // If still no match, try contains
  if (!child) {
    child = children.find((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(childName.toLowerCase()));
  }

  return child;
}

/**
 * Normalize feeding type values to match Baby Buddy API expectations
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
 * Normalize diaper contents description to wet/solid values
 */
export function normalizeContents(contents: string): { wet: boolean; solid: boolean } {
  contents = contents.toLowerCase();
  const wet = contents.includes("wet") || contents.includes("urine") || contents.includes("pee");
  const solid = contents.includes("solid") || contents.includes("poop") || contents.includes("bm");

  return { wet, solid };
}

/**
 * Get a description of diaper contents
 */
export function getContentsDescription(contents: { wet: boolean; solid: boolean }): string {
  if (contents.wet && contents.solid) {
    return "wet and solid";
  } else if (contents.wet) {
    return "wet";
  } else if (contents.solid) {
    return "solid";
  } else {
    return "unknown";
  }
}

/**
 * Prepare diaper update data for API request
 */
export function prepareDiaperUpdateData(params: {
  childId: number;
  time?: string;
  wet?: boolean;
  solid?: boolean;
  color?: string;
  amount?: string | number;
  notes?: string;
}): Partial<DiaperEntry> & { child: number } {
  const { childId, time, wet, solid, color, amount, notes } = params;

  const updateData: Partial<DiaperEntry> & { child: number } = { child: childId };

  if (time !== undefined) updateData.time = formatTimeToISO(time) || time;
  if (wet !== undefined) updateData.wet = wet;
  if (solid !== undefined) updateData.solid = solid;

  // Only include color if solid is true
  if (solid && color !== undefined) updateData.color = color;

  // Convert amount to number if it's a string
  if (amount !== undefined) {
    updateData.amount = typeof amount === "string" ? parseFloat(amount) || null : amount;
  }

  if (notes !== undefined) updateData.notes = notes;

  return updateData;
}

/**
 * Prepare feeding update data for API request
 */
export function prepareFeedingUpdateData(params: {
  childId?: number;
  startTime?: string;
  endTime?: string;
  type?: string;
  method?: string;
  amount?: string | number;
  notes?: string;
}): Partial<FeedingEntry> {
  const { childId, startTime, endTime, type, method, amount, notes } = params;

  const updateData: Partial<FeedingEntry> = {};

  if (childId !== undefined) updateData.child = childId;
  if (startTime !== undefined) updateData.start = formatTimeToISO(startTime) || startTime;
  if (endTime !== undefined) updateData.end = formatTimeToISO(endTime) || endTime;

  // Calculate duration if both start and end times are provided
  if (startTime && endTime) {
    updateData.duration = calculateDuration(updateData.start as string, updateData.end as string);
  }

  if (type !== undefined) updateData.type = normalizeType(type);
  if (method !== undefined) updateData.method = normalizeMethod(method);

  // Convert amount to number if it's a string
  if (amount !== undefined) {
    updateData.amount = typeof amount === "string" ? parseFloat(amount) || null : amount;
  }

  if (notes !== undefined) updateData.notes = notes;

  return updateData;
}

/**
 * Prepare sleep update data for API request
 */
export function prepareSleepUpdateData(params: {
  childId?: number;
  startTime?: string;
  endTime?: string;
  isNap?: boolean;
  notes?: string;
}): Partial<SleepEntry> {
  const { childId, startTime, endTime, isNap, notes } = params;

  const updateData: Partial<SleepEntry> = {};

  if (childId !== undefined) updateData.child = childId;
  if (startTime !== undefined) updateData.start = formatTimeToISO(startTime) || startTime;
  if (endTime !== undefined) updateData.end = formatTimeToISO(endTime) || endTime;

  // Calculate duration if both start and end times are provided
  if (startTime && endTime) {
    updateData.duration = calculateDuration(
      formatTimeToISO(startTime) || startTime,
      formatTimeToISO(endTime) || endTime,
    );
  }

  if (isNap !== undefined) updateData.nap = isNap;
  if (notes !== undefined) updateData.notes = notes;

  return updateData;
}

/**
 * Prepare timer update data for API request
 */
export function prepareTimerUpdateData(params: { timerName?: string; startTime?: string; endTime?: string }): {
  name?: string;
  start?: string;
  end?: string;
} {
  const { timerName, startTime, endTime } = params;

  const updateData: { name?: string; start?: string; end?: string } = {};

  if (timerName !== undefined) updateData.name = timerName;
  if (startTime !== undefined) updateData.start = formatTimeToISO(startTime) || startTime;
  if (endTime !== undefined) updateData.end = formatTimeToISO(endTime) || endTime;

  return updateData;
}

/**
 * Get a timer name based on type and optional custom name
 */
export function getTimerName(timerType: string, customName: string): string {
  if (customName && customName.trim()) {
    return customName.trim();
  }

  // Find the timer type in the constants
  const timerTypeObj = TIMER_TYPES.find((t) => t.id === timerType);

  if (timerTypeObj) {
    return timerTypeObj.name;
  }

  return "Timer";
}
