import { LaunchProps, showToast, Toast, Clipboard } from "@raycast/api";
import { parse } from "date-fns";
import {
  zonedTimeToUtc,
  utcToZonedTime,
  format as formatTz,
} from "date-fns-tz";

interface Arguments {
  time: string;
  fromTimezone: string;
  toTimezone: string;
}

// Common timezone aliases
const timezoneAliases: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  GMT: "Europe/London",
  BST: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  JST: "Asia/Tokyo",
  IST: "Asia/Kolkata",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
};

function normalizeTimezone(tz: string): string {
  const upperTz = tz.toUpperCase();
  return timezoneAliases[upperTz] || tz;
}

export default function QuickConvert(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { time, fromTimezone, toTimezone } = props.arguments;

  try {
    // Normalize timezones
    const normalizedFromTz = normalizeTimezone(fromTimezone);
    const normalizedToTz = normalizeTimezone(toTimezone);

    // Parse the time input
    let parsedTime: Date | null = null;
    const today = new Date();
    const trimmedTime = time.trim();

    // Handle single or double digit hours with optional AM/PM (e.g., "10", "10 AM", "10 PM")
    if (/^\d{1,2}(\s*(AM|PM|am|pm))?$/.test(trimmedTime)) {
      const match = trimmedTime.match(/^(\d{1,2})(\s*(AM|PM|am|pm))?$/);
      if (match) {
        const hour = parseInt(match[1], 10);
        const period = match[3]?.toUpperCase();

        if (hour >= 1 && hour <= 12) {
          parsedTime = new Date(today);
          if (period === "PM" && hour !== 12) {
            parsedTime.setHours(hour + 12, 0, 0, 0);
          } else if (period === "AM" && hour === 12) {
            parsedTime.setHours(0, 0, 0, 0);
          } else if (period === "AM" || period === "PM") {
            parsedTime.setHours(hour, 0, 0, 0);
          } else {
            // No AM/PM specified, assume AM for 1-12
            parsedTime.setHours(hour, 0, 0, 0);
          }
        } else if (hour >= 0 && hour <= 23 && !period) {
          // 24-hour format without AM/PM
          parsedTime = new Date(today);
          parsedTime.setHours(hour, 0, 0, 0);
        }
      }
    } else {
      // Try various time formats
      const timeFormats = [
        "HH:mm",
        "h:mm a",
        "H:mm",
        "h a",
        "H",
        "HH:mm:ss",
        "h:mm:ss a",
      ];

      for (const timeFormat of timeFormats) {
        try {
          parsedTime = parse(trimmedTime, timeFormat, today);
          break;
        } catch {
          continue;
        }
      }
    }

    if (!parsedTime) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid time format",
        message:
          "Please use formats like '1', '10 AM', '10 PM', '14', '2:30 PM', or '14:30'",
      });
      return;
    }

    // Convert timezone
    const utcTime = zonedTimeToUtc(parsedTime, normalizedFromTz);
    const convertedTime = utcToZonedTime(utcTime, normalizedToTz);

    const result = formatTz(convertedTime, "h:mm a (zzz)", {
      timeZone: normalizedToTz,
    });

    // Copy to clipboard and show toast notification
    Clipboard.copy(result);
    showToast({
      style: Toast.Style.Success,
      title: "Conversion Complete",
      message: `${time} ${fromTimezone} → ${result}`,
      primaryAction: {
        title: "Copied to Clipboard",
        onAction: () => {}, // No action needed, just shows it's copied
      },
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
