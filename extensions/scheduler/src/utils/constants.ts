export const STORAGE_KEYS = {
  SCHEDULED_COMMANDS: "scheduledCommands",
  EXECUTION_LOGS: "executionLogs",
  COMMAND_PERMISSIONS: "command_permissions",
} as const;

export const EXECUTION = {
  WINDOW_MS: 60000, // 1 minute
  MAX_LOGS: 100,
} as const;

export const RAYCAST_DEEPLINK_PREFIX = "raycast://";
export const EXTENSIONS_HOSTNAME = "extensions";

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const ERROR_MESSAGES = {
  DEEPLINK_INVALID: "Invalid Raycast deeplink format",
  EXT_COMMAND_INCOMPLETE: "Incomplete extension command data",
} as const;
