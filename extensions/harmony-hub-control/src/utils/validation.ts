import { HarmonyError, ErrorCategory, RetryConfig, TimeoutConfig, ErrorSeverity } from "../types/errors";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, CommandRequest, HarmonyCommand } from "../types/harmony";
import { Logger } from "../services/logger";

/**
 * Type guard for checking if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard for checking if a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && value > 0;
}

/**
 * Type guard for checking if a value is a valid port number
 */
export function isValidPort(value: unknown): value is number {
  return isPositiveNumber(value) && value <= 65535;
}

/**
 * Type guard for checking if a value is a valid IP address
 */
export function isValidIpAddress(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(value)) return false;
  return value.split(".").every(num => {
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
export function validateHubConfig(hub: Partial<HarmonyHub>): asserts hub is HarmonyHub {
  if (!isNonEmptyString(hub.id)) {
    throw new HarmonyError(
      "Hub ID is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_ID"
    );
  }

  if (!isNonEmptyString(hub.name)) {
    throw new HarmonyError(
      "Hub name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_NAME"
    );
  }

  if (!isValidIpAddress(hub.ip)) {
    throw new HarmonyError(
      "Invalid hub IP address",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_IP"
    );
  }

  if (hub.port !== undefined && !isValidPort(hub.port)) {
    throw new HarmonyError(
      "Invalid hub port",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_HUB_PORT"
    );
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
      "INVALID_DEVICE_ID"
    );
  }

  if (!isNonEmptyString(device.name)) {
    throw new HarmonyError(
      "Device name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_DEVICE_NAME"
    );
  }

  if (!isNonEmptyString(device.type)) {
    throw new HarmonyError(
      "Device type is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_DEVICE_TYPE"
    );
  }

  if (!Array.isArray(device.commands)) {
    throw new HarmonyError(
      "Device commands must be an array",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMANDS_ARRAY"
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
        "INVALID_COMMAND_ID"
      );
    }

    if (!isNonEmptyString(command.name)) {
      throw new HarmonyError(
        `Invalid command name at index ${index}`,
        ErrorCategory.VALIDATION,
        undefined,
        undefined,
        false,
        "INVALID_COMMAND_NAME"
      );
    }

    if (!isNonEmptyString(command.deviceId)) {
      throw new HarmonyError(
        `Invalid device ID for command at index ${index}`,
        ErrorCategory.VALIDATION,
        undefined,
        undefined,
        false,
        "INVALID_COMMAND_DEVICE_ID"
      );
    }

    if (command.group && !isValidCommandGroup(command.group)) {
      throw new HarmonyError(
        `Invalid command group at index ${index}`,
        ErrorCategory.VALIDATION,
        undefined,
        undefined,
        false,
        "INVALID_COMMAND_GROUP"
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
      "INVALID_ACTIVITY_ID"
    );
  }

  if (!isNonEmptyString(activity.name)) {
    throw new HarmonyError(
      "Activity name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_ACTIVITY_NAME"
    );
  }

  if (!isNonEmptyString(activity.type)) {
    throw new HarmonyError(
      "Activity type is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_ACTIVITY_TYPE"
    );
  }

  if (typeof activity.isCurrent !== "boolean") {
    throw new HarmonyError(
      "Activity current status must be a boolean",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_ACTIVITY_STATUS"
    );
  }

  Logger.debug("Activity validation passed", { activity });
}

/**
 * Validate command request
 */
export function validateCommandRequest(request: Partial<CommandRequest>): asserts request is CommandRequest {
  if (!request) {
    throw new HarmonyError(
      "Command request is required",
      ErrorCategory.VALIDATION
    );
  }

  if (!request.command || !isNonEmptyString(request.command.deviceId)) {
    throw new HarmonyError(
      "Command request must include deviceId",
      ErrorCategory.VALIDATION
    );
  }

  if (!isNonEmptyString(request.command.name)) {
    throw new HarmonyError(
      "Command request must include command name",
      ErrorCategory.VALIDATION
    );
  }
}

/**
 * Validate retry configuration
 */
export function validateRetryConfig(config: Partial<RetryConfig>): asserts config is RetryConfig {
  if (!isPositiveNumber(config.maxAttempts)) {
    throw new HarmonyError(
      "Maximum retry attempts must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_RETRY_MAX_ATTEMPTS"
    );
  }

  if (!isPositiveNumber(config.baseDelay)) {
    throw new HarmonyError(
      "Base retry delay must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_RETRY_BASE_DELAY"
    );
  }

  if (!isPositiveNumber(config.maxDelay)) {
    throw new HarmonyError(
      "Maximum retry delay must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_RETRY_MAX_DELAY"
    );
  }

  if (typeof config.useExponentialBackoff !== "boolean") {
    throw new HarmonyError(
      "Use exponential backoff must be a boolean",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_RETRY_BACKOFF"
    );
  }

  if (config.maxRetryDuration !== undefined && !isPositiveNumber(config.maxRetryDuration)) {
    throw new HarmonyError(
      "Maximum retry duration must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_RETRY_DURATION"
    );
  }

  Logger.debug("Retry config validation passed", { config });
}

/**
 * Validate timeout configuration
 */
export function validateTimeoutConfig(config: Partial<TimeoutConfig>): asserts config is TimeoutConfig {
  if (!isPositiveNumber(config.connection)) {
    throw new HarmonyError(
      "Connection timeout must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_TIMEOUT_CONNECTION"
    );
  }

  if (!isPositiveNumber(config.message)) {
    throw new HarmonyError(
      "Message timeout must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_TIMEOUT_MESSAGE"
    );
  }

  if (!isPositiveNumber(config.activity)) {
    throw new HarmonyError(
      "Activity timeout must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_TIMEOUT_ACTIVITY"
    );
  }

  if (!isPositiveNumber(config.command)) {
    throw new HarmonyError(
      "Command timeout must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_TIMEOUT_COMMAND"
    );
  }

  if (!isPositiveNumber(config.discovery)) {
    throw new HarmonyError(
      "Discovery timeout must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_TIMEOUT_DISCOVERY"
    );
  }

  if (!isPositiveNumber(config.cache)) {
    throw new HarmonyError(
      "Cache timeout must be a positive number",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_TIMEOUT_CACHE"
    );
  }

  Logger.debug("Timeout config validation passed", { config });
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
      "INVALID_COMMAND_ID"
    );
  }

  if (!isNonEmptyString(command.name)) {
    throw new HarmonyError(
      "Command name is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_NAME"
    );
  }

  if (!isNonEmptyString(command.deviceId)) {
    throw new HarmonyError(
      "Device ID is required",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_DEVICE_ID"
    );
  }

  if (command.group && !isValidCommandGroup(command.group)) {
    throw new HarmonyError(
      "Invalid command group",
      ErrorCategory.VALIDATION,
      undefined,
      undefined,
      false,
      "INVALID_COMMAND_GROUP"
    );
  }

  Logger.debug("Command validation passed", { command });
}
