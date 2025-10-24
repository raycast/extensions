import { LogEntry } from "./types";
import { readFileSync } from "fs";

export function parseLogFile(filePath: string): LogEntry[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    const entries: LogEntry[] = lines
      .map((line) => parseLogLine(line))
      .filter(Boolean) as LogEntry[];

    // Reverse to show oldest first, newest last
    return entries.reverse();
  } catch (error) {
    console.error("Error reading log file:", error);
    return [];
  }
}

function parseLogLine(line: string): LogEntry | null {
  // Remove line number prefix if present (e.g., "1→" or "    23→")
  const cleanLine = line.replace(/^\s*\d+→/, "");

  // Parse timestamp (e.g., "2 Jun 2025 at 09:28:54: ")
  const timestampMatch = cleanLine.match(
    /^(\d+ \w+ \d+ at \d+:\d+:\d+): (.+)$/
  );
  if (!timestampMatch) {
    return null;
  }

  const [, timestampStr, message] = timestampMatch;
  const timestamp = parseTimestamp(timestampStr);

  if (!timestamp) {
    return null;
  }

  const entry: LogEntry = {
    timestamp,
    dateString: timestampStr,
    eventType: determineEventType(message),
    deviceType: determineDeviceType(message),
    deviceName: extractDeviceName(message),
    message,
    rawLine: line,
  };

  return entry;
}

function parseTimestamp(timestampStr: string): Date | null {
  try {
    // Convert "2 Jun 2025 at 09:28:54" to a Date
    const [datePart, timePart] = timestampStr.split(" at ");
    const [day, month, year] = datePart.split(" ");
    const [hours, minutes, seconds] = timePart.split(":");

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = monthNames.indexOf(month);

    if (monthIndex === -1) {
      return null;
    }

    return new Date(
      parseInt(year),
      monthIndex,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  } catch (error) {
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
  if (message.includes("Micro Snitch") || message.includes("Activity log"))
    return "System";

  return "Unknown";
}

function extractDeviceName(message: string): string {
  // Extract device name after "Audio Device" or "Video Device"
  const audioMatch = message.match(/Audio Device [^:]*: (.+)$/);
  if (audioMatch) {
    return audioMatch[1];
  }

  const videoMatch = message.match(/Video Device [^:]*: (.+)$/);
  if (videoMatch) {
    return videoMatch[1];
  }

  // For system messages, extract relevant info
  if (message.includes("Micro Snitch launched")) {
    return "Micro Snitch";
  }

  if (message.includes("Activity log enabled")) {
    return "Activity Log";
  }

  return message;
}
