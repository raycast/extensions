import { LogEntry } from "./types";
import { readFileSync } from "fs";
import { MONTH_NAMES, TIMESTAMP_REGEX, AUDIO_DEVICE_REGEX, VIDEO_DEVICE_REGEX } from "./constants";

export function parseLogFile(filePath: string): LogEntry[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  const entries: LogEntry[] = lines
    .map((line) => parseLogLine(line))
    .filter((entry): entry is LogEntry => entry !== null);

  // Reverse to show oldest first, newest last
  return entries.reverse();
}

function parseLogLine(line: string): LogEntry | null {
  const cleanLine = line.trim();
  const timestampMatch = cleanLine.match(TIMESTAMP_REGEX);
  if (!timestampMatch) {
    return null;
  }

  const [, timestampStr, message] = timestampMatch;
  const timestamp = parseTimestamp(timestampStr);
  if (!timestamp) {
    return null;
  }

  return {
    timestamp,
    dateString: timestampStr,
    eventType: determineEventType(message),
    deviceType: determineDeviceType(message),
    deviceName: extractDeviceName(message),
    message,
    rawLine: line,
  };
}

function parseTimestamp(timestampStr: string): Date | null {
  try {
    const [datePart, timePart] = timestampStr.split(" at ");
    const [day, month, year] = datePart.split(" ");
    const [hours, minutes, seconds] = timePart.split(":");

    const monthIndex = MONTH_NAMES.indexOf(month as (typeof MONTH_NAMES)[number]);
    if (monthIndex === -1) {
      return null;
    }

    return new Date(
      parseInt(year, 10),
      monthIndex,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      parseInt(seconds, 10),
    );
  } catch {
    return null;
  }
}

function determineEventType(message: string): LogEntry["eventType"] {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("launched")) return "launched";
  if (lowerMessage.includes("connected")) return "connected";
  if (lowerMessage.includes("disconnected")) return "disconnected";
  if (lowerMessage.includes("became active")) return "active";
  if (lowerMessage.includes("became inactive")) return "inactive";
  if (lowerMessage.includes("found")) return "found";
  if (lowerMessage.includes("enabled")) return "enabled";

  return "launched"; // default
}

function determineDeviceType(message: string): LogEntry["deviceType"] {
  if (message.includes("Audio Device")) return "Audio";
  if (message.includes("Video Device")) return "Video";
  if (message.includes("Micro Snitch") || message.includes("Activity log")) return "System";

  return "Unknown";
}

function extractDeviceName(message: string): string {
  const audioMatch = message.match(AUDIO_DEVICE_REGEX);
  if (audioMatch) {
    return audioMatch[1];
  }

  const videoMatch = message.match(VIDEO_DEVICE_REGEX);
  if (videoMatch) {
    return videoMatch[1];
  }

  if (message.includes("Micro Snitch launched")) {
    return "Micro Snitch";
  }

  if (message.includes("Activity log enabled")) {
    return "Activity Log";
  }

  return message;
}
