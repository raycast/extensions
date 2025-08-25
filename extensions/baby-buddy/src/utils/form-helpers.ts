/**
 * DEPRECATED: This file exists for backwards compatibility
 * These functions have been moved to specialized utilities
 * Import directly from utils/index.ts (or specific utility files) for new code
 */

// Import the needed functions from their new homes
import {
  findChildByName,
  getContentsDescription,
  getTimerName,
  normalizeContents,
  normalizeMethod,
  normalizeType,
  prepareDiaperUpdateData,
  prepareFeedingUpdateData,
  prepareSleepUpdateData,
  prepareTimerUpdateData,
} from "./api-helpers";
import { calculateDuration, formatTimeToISO, validateTimeRange } from "./date-helpers";
import { formatErrorMessage } from "./formatters";
import { isValidDiaperType, showInvalidTimeRangeError, validateDiaperForm } from "./validators";

// Re-export them all
export {
  calculateDuration,
  findChildByName,
  formatErrorMessage,
  formatTimeToISO,
  getContentsDescription,
  getTimerName,
  isValidDiaperType,
  normalizeContents,
  normalizeMethod,
  normalizeType,
  prepareDiaperUpdateData,
  prepareFeedingUpdateData,
  prepareSleepUpdateData,
  prepareTimerUpdateData,
  showInvalidTimeRangeError,
  validateDiaperForm,
  validateTimeRange,
};

// Handle the remaining functions that haven't been moved yet
// These will need to be refactored or moved in a future update

/**
 * Create feeding data for API submission
 */
export function createFeedingData(params: {
  childId: number;
  startTime?: string;
  endTime?: string;
  type: string;
  method: string;
  amount?: string;
  notes?: string;
}) {
  // Just pass through to the new utility function
  return prepareFeedingUpdateData(params);
}

/**
 * Create sleep data for API submission
 */
export function createSleepData(params: {
  childId: number;
  startTime?: string;
  endTime?: string;
  isNap?: boolean;
  notes?: string;
}) {
  // Just pass through to the new utility function
  return prepareSleepUpdateData(params);
}

/**
 * Create diaper data for API submission
 */
export function formatDiaperData(params: {
  childId: number;
  time: Date;
  isWet: boolean;
  isSolid: boolean;
  color: string;
  amount: string;
  notes: string;
}) {
  return prepareDiaperUpdateData({
    childId: params.childId,
    time: params.time.toISOString(),
    wet: params.isWet,
    solid: params.isSolid,
    color: params.color,
    amount: params.amount,
    notes: params.notes,
  });
}

/**
 * Format diaper data from contents string
 */
export function formatDiaperDataFromContents(params: {
  childId: number;
  time: string;
  contents: string;
  color: string;
  amount: string;
  notes: string;
}) {
  const { wet, solid } = normalizeContents(params.contents);

  return formatDiaperData({
    childId: params.childId,
    time: new Date(params.time),
    isWet: wet,
    isSolid: solid,
    color: params.color,
    amount: params.amount,
    notes: params.notes,
  });
}

/**
 * Create timer data for API submission
 */
export function createTimerData(params: { childId: number; name: string; startTime?: Date }) {
  return {
    child: params.childId,
    name: params.name,
    start: params.startTime ? params.startTime.toISOString() : new Date().toISOString(),
    active: true,
  };
}
