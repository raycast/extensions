/**
 * Validation utilities for Harmony Hub types and data
 * @module
 */

import { debug } from "../services/logger";
import { HarmonyError } from "../types/core/errors";
import { ErrorCategory } from "../types/core/harmony";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../types/core/harmony";

/**
 * Type guard for checking if a value is a non-empty string
 * @param value - The value to check
 * @returns True if the value is a non-empty string, false otherwise
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard for checking if a value is a positive number
 * @param value - The value to check
 * @returns True if the value is a positive number, false otherwise
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && value > 0;
}

/**
 * Type guard for checking if a value is a valid port number
 * @param value - The value to check
 * @returns True if the value is a valid port number (1-65535), false otherwise
 */
export function isValidPort(value: unknown): value is number {
  return isPositiveNumber(value) && value <= 65535;
}

/**
 * Type guard for checking if a value is a valid IPv4 address
 * @param value - The value to check
 * @returns True if the value is a valid IPv4 address, false otherwise
 */
export function isValidIpAddress(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(value)) return false;
  return value.split(".").every((num) => {
    const n = parseInt(num, 10);
    return n >= 0 && n <= 255;
  });
}

/**
 * Type guard for checking if a value is a valid command group
 * @param value - The value to check
 * @returns True if the value is a valid command group, false otherwise
 */
export function isValidCommandGroup(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const validGroups = ["IRCommand", "HTTPCommand", "BluetoothCommand", "WifiCommand"];
  return validGroups.includes(value);
}

/**
 * Validate Harmony Hub configuration
 * Throws an error if the hub configuration is invalid
 * @param hub - The hub configuration to validate
 * @throws {HarmonyError} If any required fields are missing or invalid
 */
export function validateHubConfig(hub: Partial<HarmonyHub>): asserts hub is HarmonyHub {
  if (!isNonEmptyString(hub.id)) {
    throw new HarmonyError(
      "Hub ID is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_ID",
    );
  }

  if (!isNonEmptyString(hub.name)) {
    throw new HarmonyError(
      "Hub name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_NAME",
    );
  }

  if (!isValidIpAddress(hub.ip)) {
    throw new HarmonyError(
      "Invalid hub IP address",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_IP",
    );
  }

  if (hub.port !== undefined && !isValidPort(hub.port)) {
    throw new HarmonyError(
      "Invalid hub port",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_PORT",
    );
  }

  debug("Hub config validation passed", { hub });
}

/**
 * Validate Harmony device configuration
 * Throws an error if the device configuration is invalid
 * @param device - The device configuration to validate
 * @throws {HarmonyError} If any required fields are missing or invalid
 */
export function validateDevice(device: Partial<HarmonyDevice>): asserts device is HarmonyDevice {
  if (!isNonEmptyString(device.id)) {
    throw new HarmonyError(
      "Device ID is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_DEVICE_ID",
    );
  }

  if (!isNonEmptyString(device.name)) {
    throw new HarmonyError(
      "Device name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_DEVICE_NAME",
    );
  }

  if (!isNonEmptyString(device.type)) {
    throw new HarmonyError(
      "Device type is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_DEVICE_TYPE",
    );
  }

  if (!Array.isArray(device.commands)) {
    throw new HarmonyError(
      "Device commands must be an array",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMANDS_ARRAY",
    );
  }

  device.commands.forEach((command, index) => {
    if (!isNonEmptyString(command.id)) {
      throw new HarmonyError(
        `Invalid command ID at index ${index}`,
        ErrorCategory.VALIDATION,
        undefined,
        undefined,
        false,
        "INVALID_COMMAND_ID",
      );
    }

    if (!isNonEmptyString(command.name)) {
      throw new HarmonyError(
        `Invalid command name at index ${index}`,
        ErrorCategory.VALIDATION,
        undefined,
        undefined,
        false,
        "INVALID_COMMAND_NAME",
      );
    }

    if (!isNonEmptyString(command.deviceId)) {
      throw new HarmonyError(
        `Invalid device ID for command at index ${index}`,
        ErrorCategory.VALIDATION,
        undefined,
        undefined,
        false,
        "INVALID_COMMAND_DEVICE_ID",
      );
    }

    if (command.group && !isValidCommandGroup(command.group)) {
      throw new HarmonyError(
        `Invalid command group at index ${index}`,
        ErrorCategory.VALIDATION,
        undefined,
        undefined,
        false,
        "INVALID_COMMAND_GROUP",
      );
    }
  });

  debug("Device validation passed", { device });
}

/**
 * Validate Harmony activity configuration
 * Throws an error if the activity configuration is invalid
 * @param activity - The activity configuration to validate
 * @throws {HarmonyError} If any required fields are missing or invalid
 */
export function validateActivity(activity: Partial<HarmonyActivity>): asserts activity is HarmonyActivity {
  if (!isNonEmptyString(activity.id)) {
    throw new HarmonyError(
      "Activity ID is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_ACTIVITY_ID",
    );
  }

  if (!isNonEmptyString(activity.name)) {
    throw new HarmonyError(
      "Activity name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_ACTIVITY_NAME",
    );
  }

  if (!isNonEmptyString(activity.type)) {
    throw new HarmonyError(
      "Activity type is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_ACTIVITY_TYPE",
    );
  }

  if (typeof activity.isCurrent !== "boolean") {
    throw new HarmonyError(
      "Activity current status must be a boolean",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_ACTIVITY_STATUS",
    );
  }

  debug("Activity validation passed", { activity });
}

/**
 * Validate Harmony command configuration
 * Throws an error if the command configuration is invalid
 * @param command - The command configuration to validate
 * @throws {HarmonyError} If any required fields are missing or invalid
 */
export function validateCommand(command: Partial<HarmonyCommand>): asserts command is HarmonyCommand {
  if (!isNonEmptyString(command.id)) {
    throw new HarmonyError(
      "Command ID is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_ID",
    );
  }

  if (!isNonEmptyString(command.name)) {
    throw new HarmonyError(
      "Command name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_NAME",
    );
  }

  if (!isNonEmptyString(command.label)) {
    throw new HarmonyError(
      "Command label is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_LABEL",
    );
  }

  if (!isNonEmptyString(command.deviceId)) {
    throw new HarmonyError(
      "Command device ID is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_DEVICE_ID",
    );
  }

  if (command.group && !isValidCommandGroup(command.group)) {
    throw new HarmonyError(
      "Invalid command group",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_GROUP",
    );
  }

  debug("Command validation passed", { command });
}

/**
 * Validates a numeric preference value
 * @param value - The value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param name - Name of the preference for error messages
 * @throws {HarmonyError} If the value is invalid
 */
export function validateNumericPreference(
  value: unknown,
  min: number,
  max: number,
  name: string,
): asserts value is number {
  if (typeof value !== "number" || isNaN(value)) {
    throw new HarmonyError(
      `${name} must be a number`,
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_NUMERIC_PREFERENCE",
      { type: typeof value },
    );
  }

  if (value < min || value > max) {
    throw new HarmonyError(
      `${name} must be between ${min} and ${max}`,
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "NUMERIC_PREFERENCE_OUT_OF_RANGE",
      { min, max },
    );
  }

  debug(`Validated ${name}`, { value, min, max });
}

/**
 * Validates a string preference value
 * @param value - The value to validate
 * @param allowedValues - List of allowed values
 * @param name - Name of the preference for error messages
 * @throws {HarmonyError} If the value is invalid
 */
export function validateStringPreference(
  value: unknown,
  allowedValues: readonly string[],
  name: string,
): asserts value is string {
  if (typeof value !== "string") {
    throw new HarmonyError(
      `${name} must be a string`,
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_STRING_PREFERENCE",
      { type: typeof value },
    );
  }

  if (!allowedValues.includes(value)) {
    throw new HarmonyError(
      `${name} must be one of: ${allowedValues.join(", ")}`,
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "STRING_PREFERENCE_NOT_ALLOWED",
      { allowedValues },
    );
  }

  debug(`Validated ${name}`, { value, allowedValues });
}

/**
 * Validates a boolean preference value
 * @param value - The value to validate
 * @param name - Name of the preference for error messages
 * @throws {HarmonyError} If the value is invalid
 */
export function validateBooleanPreference(value: unknown, name: string): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new HarmonyError(
      `${name} must be a boolean`,
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_BOOLEAN_PREFERENCE",
      { type: typeof value },
    );
  }

  debug(`Validated ${name}`, { value });
}

/**
 * Validates the default view preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateDefaultView(value: unknown): asserts value is string {
  validateStringPreference(value, ["devices", "activities", "commands"], "Default view");
}

/**
 * Validates the command display mode preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateCommandDisplayMode(value: unknown): asserts value is string {
  validateStringPreference(value, ["list", "grid"], "Command display mode");
}

/**
 * Validates the command grid columns preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateCommandGridColumns(value: unknown): asserts value is number {
  validateNumericPreference(value, 2, 6, "Command grid columns");
}

/**
 * Validates the auto-connect preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateAutoConnect(value: unknown): asserts value is boolean {
  validateBooleanPreference(value, "Auto-connect");
}

/**
 * Validates the show toast notifications preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateShowToasts(value: unknown): asserts value is boolean {
  validateBooleanPreference(value, "Show toast notifications");
}

/**
 * Validates the discovery timeout preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateDiscoveryTimeout(value: unknown): asserts value is number {
  validateNumericPreference(value, 1000, 30000, "Discovery timeout");
}

/**
 * Validates the command execution timeout preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateCommandTimeout(value: unknown): asserts value is number {
  validateNumericPreference(value, 100, 5000, "Command execution timeout");
}

/**
 * Validates the activity change timeout preference
 * @param value - The value to validate
 * @throws {HarmonyError} If the value is invalid
 */
export function validateActivityTimeout(value: unknown): asserts value is number {
  validateNumericPreference(value, 1000, 30000, "Activity change timeout");
}
