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

export const VALIDATION_MESSAGES = {
  DEEPLINK_REQUIRED: "Command deeplink is required",
  INVALID_DEEPLINK_FORMAT:
    "Invalid Raycast deeplink format. Expected format: raycast://extension/command or raycast://extensions/owner/extension/command",
  DATE_REQUIRED_ONCE: "Date is required for one-time schedules",
  DAY_OF_WEEK_REQUIRED: "Day of week is required for weekly schedules",
  DAY_OF_MONTH_REQUIRED: "Day of month is required for monthly schedules",
} as const;
