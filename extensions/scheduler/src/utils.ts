import { Icon } from "@raycast/api";
import { Schedule, ScheduleType, RaycastCommand, ScheduledCommand, FormValues } from "./types";
import { RAYCAST_DEEPLINK_PREFIX, EXTENSIONS_HOSTNAME, WEEKDAY_NAMES } from "./utils/constants";
import { toLocalYMD } from "./utils/dateTime";
import cronstrue from "cronstrue";

const SCHEDULE_CONFIGS = {
  once: { icon: Icon.Clock, requiresDate: true },
  "15mins": { icon: Icon.Repeat, requiresDate: false },
  "30mins": { icon: Icon.Repeat, requiresDate: false },
  hourly: { icon: Icon.Repeat, requiresDate: false },
  daily: { icon: Icon.Calendar, requiresDate: false },
  weekly: { icon: Icon.Calendar, requiresDate: false },
  monthly: { icon: Icon.Calendar, requiresDate: false },
  cron: { icon: Icon.Code, requiresDate: false },
} as const;

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
    date: values.date instanceof Date ? toLocalYMD(values.date) : String(values.date || ""),
    dayOfWeek: values.dayOfWeek ? String(values.dayOfWeek) : undefined,
    dayOfMonth: values.dayOfMonth ? String(values.dayOfMonth) : undefined,
    cronExpression: values.cronExpression ? String(values.cronExpression) : undefined,
    runInBackground: Boolean(values.runInBackground),
    runIfMissed: Boolean(values.runIfMissed),
  };
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
    case "cron":
      if (values.cronExpression) {
        schedule.cronExpression = values.cronExpression;
      }
      break;
  }

  return schedule;
}

// Generate a display name for a command
export function getCommandDisplayName(command: RaycastCommand): string {
  const parsed = parseRaycastDeeplink(command.deeplink);
  if (!parsed) {
    return command.deeplink;
  }

  return `${parsed.extensionName}${parsed.name ? " > " + parsed.name : ""}`;
}

export function getScheduleDescription(schedule: Schedule): string {
  const { type, time } = schedule;

  switch (type) {
    case "once": {
      const formattedDate = schedule.date ? new Date(schedule.date).toLocaleDateString() : schedule.date;
      return `once on ${formattedDate} at ${time}`;
    }
    case "15mins":
      return "every 15 minutes";
    case "30mins":
      return "every 30 minutes";
    case "hourly":
      return "every hour";
    case "daily":
      return `daily at ${time}`;
    case "weekly": {
      const dayName = WEEKDAY_NAMES[schedule.dayOfWeek || 0];
      return `weekly on ${dayName} at ${time}`;
    }
    case "monthly":
      return `monthly on day ${schedule.dayOfMonth} at ${time}`;
    case "cron": {
      const readableCronExpression = cronstrue.toString(schedule.cronExpression || "", { use24HourTimeFormat: true });
      return readableCronExpression;
    }
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
  if (hostname) {
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

// Create a RaycastCommand object
export function createRaycastCommand(deeplink: string, runInBackground?: boolean): RaycastCommand {
  return {
    deeplink,
    type: runInBackground ? "background" : "user-initiated",
    arguments: null,
  };
}

// Create a ScheduledCommand object from form values
export function createSavedSchedule(
  values: FormValues,
  raycastCommand: RaycastCommand,
  existingCommand?: ScheduledCommand,
): ScheduledCommand {
  const schedule = buildScheduleFromValues(values);
  const commandName = values.name.trim() || getCommandDisplayName(raycastCommand);

  if (existingCommand) {
    return {
      ...existingCommand,
      name: commandName,
      command: raycastCommand,
      schedule,
      enabled: true, // Always enable when saving through the form
      updatedAt: new Date().toISOString(),
      runIfMissed: values.runIfMissed,
    };
  }

  return {
    id: generateId(),
    name: commandName,
    command: raycastCommand,
    schedule,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runIfMissed: values.runIfMissed,
  };
}
