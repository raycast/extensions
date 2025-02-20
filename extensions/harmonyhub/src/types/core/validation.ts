/**
 * Validation utilities for Harmony Hub types
 * @module
 */

import { HarmonyError, ErrorSeverity } from "./errors";
import { ErrorCategory } from "./harmony";
import type { HarmonyHub, HarmonyDevice, HarmonyCommand, HarmonyActivity, LoadingState } from "./harmony";

/**
 * Validates a string field
 * @param value The value to validate
 * @param fieldName The name of the field
 * @throws {HarmonyError} If the value is invalid
 */
function validateString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HarmonyError(`Invalid ${fieldName}: must be a non-empty string`, ErrorCategory.DATA);
  }
}

/**
 * Validates a number field
 * @param value The value to validate
 * @param fieldName The name of the field
 * @throws {HarmonyError} If the value is invalid
 */
function validateNumber(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || isNaN(value)) {
    throw new HarmonyError(`Invalid ${fieldName}: must be a number`, ErrorCategory.DATA);
  }
}

/**
 * Validates an array field
 * @param value The value to validate
 * @param fieldName The name of the field
 * @param itemValidator Function to validate each item in the array
 * @throws {HarmonyError} If the value is invalid
 */
function validateArray(value: unknown, fieldName: string, itemValidator: (item: unknown) => void): void {
  if (!Array.isArray(value)) {
    throw new HarmonyError(`Invalid ${fieldName}: must be an array`, ErrorCategory.DATA);
  }
  value.forEach((item, index) => {
    try {
      itemValidator(item);
    } catch (error) {
      throw new HarmonyError(`Invalid item at index ${index} in ${fieldName}`, ErrorCategory.DATA);
    }
  });
}

/**
 * Validates a HarmonyHub object
 * @param hub The hub to validate
 * @throws {HarmonyError} If the hub is invalid
 */
export function validateHub(hub: unknown): asserts hub is HarmonyHub {
  if (!hub || typeof hub !== "object") {
    throw new HarmonyError("Invalid hub: must be an object", ErrorCategory.DATA);
  }

  validateString((hub as HarmonyHub).id, "hub.id");
  validateString((hub as HarmonyHub).name, "hub.name");
  validateString((hub as HarmonyHub).ip, "hub.ip");
}

/**
 * Validates a HarmonyCommand object
 * @param command The command to validate
 * @throws {HarmonyError} If the command is invalid
 */
export function validateCommand(command: unknown): asserts command is HarmonyCommand {
  if (!command || typeof command !== "object") {
    throw new HarmonyError("Invalid command: must be an object", ErrorCategory.DATA);
  }

  validateString((command as HarmonyCommand).id, "command.id");
  validateString((command as HarmonyCommand).name, "command.name");
  validateString((command as HarmonyCommand).label, "command.label");
  validateString((command as HarmonyCommand).deviceId, "command.deviceId");
}

/**
 * Validates a HarmonyDevice object
 * @param device The device to validate
 * @throws {HarmonyError} If the device is invalid
 */
export function validateDevice(device: unknown): asserts device is HarmonyDevice {
  if (!device || typeof device !== "object") {
    throw new HarmonyError("Invalid device: must be an object", ErrorCategory.DATA);
  }

  validateString((device as HarmonyDevice).id, "device.id");
  validateString((device as HarmonyDevice).name, "device.name");
  validateString((device as HarmonyDevice).type, "device.type");
  validateArray((device as HarmonyDevice).commands, "device.commands", validateCommand);
}

/**
 * Validates a HarmonyActivity object
 * @param activity The activity to validate
 * @throws {HarmonyError} If the activity is invalid
 */
export function validateActivity(activity: unknown): asserts activity is HarmonyActivity {
  if (!activity || typeof activity !== "object") {
    throw new HarmonyError("Invalid activity: must be an object", ErrorCategory.DATA);
  }

  validateString((activity as HarmonyActivity).id, "activity.id");
  validateString((activity as HarmonyActivity).name, "activity.name");
  validateString((activity as HarmonyActivity).type, "activity.type");

  if (typeof (activity as HarmonyActivity).isCurrent !== "boolean") {
    throw new HarmonyError("Invalid activity.isCurrent: must be a boolean", ErrorCategory.DATA);
  }
}

/**
 * Validates a LoadingState object
 * @param state The loading state to validate
 * @throws {HarmonyError} If the loading state is invalid
 */
export function validateLoadingState(state: unknown): asserts state is LoadingState {
  if (!state || typeof state !== "object") {
    throw new HarmonyError("Invalid loading state: must be an object", ErrorCategory.DATA);
  }

  validateString((state as LoadingState).stage, "loadingState.stage");
  validateNumber((state as LoadingState).progress, "loadingState.progress");
  validateString((state as LoadingState).message, "loadingState.message");

  const progress = (state as LoadingState).progress;
  if (progress < 0 || progress > 1) {
    throw new HarmonyError("Invalid loadingState.progress: must be between 0 and 1", ErrorCategory.DATA);
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  message: string;
  severity: ErrorSeverity;
}

export interface ValidationContext {
  errors: ValidationError[];
}

export interface Validator {
  validate(context: ValidationContext): void;
}
