import { Icon } from "@raycast/api";
import { Schedule, ScheduleType, RaycastCommand } from "./types";
import { RAYCAST_DEEPLINK_PREFIX, EXTENSIONS_HOSTNAME, WEEKDAY_NAMES, VALIDATION_MESSAGES } from "./utils/constants";

const SCHEDULE_CONFIGS = {
  once: { icon: Icon.Clock, requiresDate: true },
  daily: { icon: Icon.Calendar, requiresDate: false },
  weekly: { icon: Icon.Calendar, requiresDate: false },
  monthly: { icon: Icon.Calendar, requiresDate: false },
} as const;

export interface FormValues {
  name: string;
  command: string;
  scheduleType: ScheduleType;
  date?: string;
  time: string;
  dayOfWeek?: string;
  dayOfMonth?: string;
  runInBackground?: boolean;
}

// Helper function for safe number parsing
const parseIntSafely = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
};

// Helper function for processing form values with better type safety
export function processFormValues(values: Record<string, unknown>): FormValues {
  return {
    name: String(values.name || ""),
    command: String(values.command || ""),
    scheduleType: values.scheduleType as ScheduleType,
    time: String(values.time || ""),
    date: values.date instanceof Date ? values.date.toISOString().split("T")[0] : String(values.date || ""),
    dayOfWeek: values.dayOfWeek ? String(values.dayOfWeek) : undefined,
    dayOfMonth: values.dayOfMonth ? String(values.dayOfMonth) : undefined,
    runInBackground: Boolean(values.runInBackground),
  };
}

const validateScheduleSpecificFields = (values: FormValues): string | null => {
  switch (values.scheduleType) {
    case "once":
      return values.date ? null : VALIDATION_MESSAGES.DATE_REQUIRED_ONCE;
    case "weekly":
      return values.dayOfWeek ? null : VALIDATION_MESSAGES.DAY_OF_WEEK_REQUIRED;
    case "monthly":
      return values.dayOfMonth ? null : VALIDATION_MESSAGES.DAY_OF_MONTH_REQUIRED;
    default:
      return null;
  }
};

export function validateFormValues(values: FormValues): string | null {
  const deeplinkError = validateRaycastDeeplink(values.command);
  if (deeplinkError) {
    return deeplinkError;
  }

  return validateScheduleSpecificFields(values);
}

export function buildScheduleFromValues(values: FormValues): Schedule {
  const schedule: Schedule = {
    type: values.scheduleType,
    time: values.time,
  };

  switch (values.scheduleType) {
    case "once":
      if (values.date) {
        schedule.date = values.date;
      }
      break;
    case "weekly": {
      const dayOfWeek = parseIntSafely(values.dayOfWeek);
      if (dayOfWeek !== undefined) {
        schedule.dayOfWeek = dayOfWeek;
      }
      break;
    }
    case "monthly": {
      const dayOfMonth = parseIntSafely(values.dayOfMonth);
      if (dayOfMonth !== undefined) {
        schedule.dayOfMonth = dayOfMonth;
      }
      break;
    }
  }

  return schedule;
}

export function getScheduleDescription(schedule: Schedule): string {
  const { type, time } = schedule;

  switch (type) {
    case "once": {
      const formattedDate = schedule.date ? new Date(schedule.date).toLocaleDateString() : schedule.date;
      return `once on ${formattedDate} at ${time}`;
    }
    case "daily":
      return `daily at ${time}`;
    case "weekly": {
      const dayName = WEEKDAY_NAMES[schedule.dayOfWeek || 0];
      return `weekly on ${dayName} at ${time}`;
    }
    case "monthly":
      return `monthly on day ${schedule.dayOfMonth} at ${time}`;
    default:
      return "with the specified schedule";
  }
}

export function getScheduleIcon(scheduleType: Schedule["type"]): Icon {
  return SCHEDULE_CONFIGS[scheduleType]?.icon ?? Icon.Clock;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Parsed command interface for internal use
export interface ParsedRaycastCommand {
  ownerOrAuthorName?: string;
  extensionName?: string;
  name: string;
  isExtensionsFormat: boolean;
}

const getPathParts = (pathname: string): string[] => {
  return pathname.split("/").filter((part) => part !== "");
};

const parseExtensionFormat = (pathParts: string[]): ParsedRaycastCommand | null => {
  if (pathParts.length >= 3) {
    return {
      ownerOrAuthorName: pathParts[0],
      extensionName: pathParts[1],
      name: pathParts[2],
      isExtensionsFormat: true,
    };
  }
  return null;
};

const parseRaycastOwnedFormat = (hostname: string, pathParts: string[]): ParsedRaycastCommand | null => {
  if (hostname && pathParts.length >= 1) {
    return {
      extensionName: hostname,
      name: pathParts.length >= 2 ? pathParts[1] : pathParts[0],
      isExtensionsFormat: false,
    };
  }
  return null;
};

// Parse a Raycast deeplink into command components
export function parseRaycastDeeplink(deeplink: string): ParsedRaycastCommand | null {
  try {
    const trimmedLink = deeplink.trim();

    if (!trimmedLink.startsWith(RAYCAST_DEEPLINK_PREFIX)) {
      return null;
    }

    const url = new URL(trimmedLink);
    const pathParts = getPathParts(url.pathname);

    if (url.hostname === EXTENSIONS_HOSTNAME) {
      return parseExtensionFormat(pathParts);
    } else {
      return parseRaycastOwnedFormat(url.hostname, pathParts);
    }
  } catch (error) {
    console.error("Error parsing Raycast deeplink:", error);
    return null;
  }
}

// Validate a Raycast deeplink string
export function validateRaycastDeeplink(deeplink: string): string | null {
  if (!deeplink.trim()) {
    return VALIDATION_MESSAGES.DEEPLINK_REQUIRED;
  }

  const command = parseRaycastDeeplink(deeplink);
  if (!command) {
    return VALIDATION_MESSAGES.INVALID_DEEPLINK_FORMAT;
  }

  return null;
}

// Generate a display name for a command
export function getCommandDisplayName(command: RaycastCommand): string {
  const parsed = parseRaycastDeeplink(command.deeplink);
  if (!parsed) {
    return command.deeplink;
  }

  return `${parsed.extensionName} > ${parsed.name}`;
}
