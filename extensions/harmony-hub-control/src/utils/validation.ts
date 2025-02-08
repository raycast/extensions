import { Logger } from "../services/logger";
import { ErrorCategory, HarmonyError } from "../types/errors";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand, CommandRequest } from "../types/harmony";
import { RetryConfig, TimeoutConfig } from "../types/preferences";

/**
 * Type guard for checking if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Checks if a value is a positive number
 */
function isPositiveNumber(value: number): boolean {
  return typeof value === "number" && !isNaN(value) && value > 0;
}

/**
 * Checks if a value is a valid port number
 */
function isValidPort(value: number): boolean {
  return isPositiveNumber(value) && value <= 65535;
}

/**
 * Type guard for checking if a value is a valid IP address
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
 */
export function isValidCommandGroup(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const validGroups = ["IRCommand", "HTTPCommand", "BluetoothCommand", "WifiCommand"];
  return validGroups.includes(value);
}

/**
 * Validate Harmony Hub configuration
 */
export function validateHubConfig(hub: HarmonyHub): void {
  if (!hub.ip) {
    throw new HarmonyError("Hub IP address is required", ErrorCategory.CONNECTION);
  }

  const port = typeof hub.port === "number" ? hub.port : parseInt(hub.port as string, 10);
  if (hub.port !== undefined && !isValidPort(port)) {
    throw new HarmonyError(`Invalid port number: ${hub.port}`, ErrorCategory.CONNECTION);
  }

  Logger.debug("Hub config validation passed", { hub });
}

/**
 * Validate Harmony device configuration
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

  device.commands.forEach((command: HarmonyCommand, index: number) => {
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

  Logger.debug("Device validation passed", { device });
}

/**
 * Validate Harmony activity configuration
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

  Logger.debug("Activity validation passed", { activity });
}

/**
 * Validate command request
 */
export function validateCommandRequest(request: Partial<CommandRequest>): asserts request is CommandRequest {
  if (!request) {
    throw new HarmonyError("Command request is required", ErrorCategory.VALIDATION);
  }

  if (!request.command || !isNonEmptyString(request.command.deviceId)) {
    throw new HarmonyError("Command request must include deviceId", ErrorCategory.VALIDATION);
  }

  if (!isNonEmptyString(request.command.name)) {
    throw new HarmonyError("Command request must include command name", ErrorCategory.VALIDATION);
  }
}

/**
 * Validates a retry configuration object
 */
export function validateRetryConfig(config: RetryConfig): void {
  if (!isPositiveNumber(config.maxAttempts)) {
    throw new HarmonyError("maxAttempts must be a positive number", ErrorCategory.VALIDATION);
  }

  if (!isPositiveNumber(config.baseDelay)) {
    throw new HarmonyError("baseDelay must be a positive number", ErrorCategory.VALIDATION);
  }

  if (!isPositiveNumber(config.maxDelay)) {
    throw new HarmonyError("maxDelay must be a positive number", ErrorCategory.VALIDATION);
  }

  if (typeof config.useExponentialBackoff !== "boolean") {
    throw new HarmonyError("useExponentialBackoff must be a boolean", ErrorCategory.VALIDATION);
  }

  if (config.maxRetryDuration !== undefined && !isPositiveNumber(config.maxRetryDuration)) {
    throw new HarmonyError("maxRetryDuration must be a positive number", ErrorCategory.VALIDATION);
  }
}

/**
 * Validates a timeout configuration object
 */
export function validateTimeoutConfig(config: TimeoutConfig): void {
  if (!isPositiveNumber(config.connection)) {
    throw new HarmonyError("connection timeout must be a positive number", ErrorCategory.VALIDATION);
  }

  if (!isPositiveNumber(config.message)) {
    throw new HarmonyError("message timeout must be a positive number", ErrorCategory.VALIDATION);
  }

  if (!isPositiveNumber(config.activity)) {
    throw new HarmonyError("activity timeout must be a positive number", ErrorCategory.VALIDATION);
  }

  if (!isPositiveNumber(config.command)) {
    throw new HarmonyError("command timeout must be a positive number", ErrorCategory.VALIDATION);
  }

  if (!isPositiveNumber(config.discovery)) {
    throw new HarmonyError("discovery timeout must be a positive number", ErrorCategory.VALIDATION);
  }

  if (!isPositiveNumber(config.cache)) {
    throw new HarmonyError("cache timeout must be a positive number", ErrorCategory.VALIDATION);
  }
}

/**
 * Validate Harmony command
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

  if (!isNonEmptyString(command.deviceId)) {
    throw new HarmonyError(
      "Device ID is required",
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

  Logger.debug("Command validation passed", { command });
}
