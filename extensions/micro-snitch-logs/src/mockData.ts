import { LogEntry } from "./types";
import { MONTH_NAMES } from "./constants";

export function generateMockLogs(): LogEntry[] {
  const now = new Date();
  const mockLogs: LogEntry[] = [];

  // Generate logs with various timestamps (last 24 hours)
  const events = [
    {
      message: "Audio Device connected: Built-in Microphone",
      eventType: "connected" as const,
      deviceType: "Audio" as const,
      deviceName: "Built-in Microphone",
      hoursAgo: 0.5,
    },
    {
      message: "Video Device found: FaceTime HD Camera",
      eventType: "found" as const,
      deviceType: "Video" as const,
      deviceName: "FaceTime HD Camera",
      hoursAgo: 1,
    },
    {
      message: "Audio Device became active: Built-in Microphone",
      eventType: "active" as const,
      deviceType: "Audio" as const,
      deviceName: "Built-in Microphone",
      hoursAgo: 2,
    },
    {
      message: "Video Device became active: FaceTime HD Camera",
      eventType: "active" as const,
      deviceType: "Video" as const,
      deviceName: "FaceTime HD Camera",
      hoursAgo: 3,
    },
    {
      message: "Audio Device disconnected: Built-in Microphone",
      eventType: "disconnected" as const,
      deviceType: "Audio" as const,
      deviceName: "Built-in Microphone",
      hoursAgo: 4,
    },
    {
      message: "Audio Device became inactive: Built-in Microphone",
      eventType: "inactive" as const,
      deviceType: "Audio" as const,
      deviceName: "Built-in Microphone",
      hoursAgo: 5,
    },
    {
      message: "Micro Snitch launched",
      eventType: "launched" as const,
      deviceType: "System" as const,
      deviceName: "Micro Snitch",
      hoursAgo: 6,
    },
    {
      message: "Activity log enabled",
      eventType: "enabled" as const,
      deviceType: "System" as const,
      deviceName: "Activity Log",
      hoursAgo: 7,
    },
    {
      message: "Video Device became inactive: FaceTime HD Camera",
      eventType: "inactive" as const,
      deviceType: "Video" as const,
      deviceName: "FaceTime HD Camera",
      hoursAgo: 8,
    },
    {
      message: "Audio Device connected: AirPods Pro",
      eventType: "connected" as const,
      deviceType: "Audio" as const,
      deviceName: "AirPods Pro",
      hoursAgo: 12,
    },
    {
      message: "Audio Device disconnected: AirPods Pro",
      eventType: "disconnected" as const,
      deviceType: "Audio" as const,
      deviceName: "AirPods Pro",
      hoursAgo: 18,
    },
    {
      message: "Video Device found: External Webcam",
      eventType: "found" as const,
      deviceType: "Video" as const,
      deviceName: "External Webcam",
      hoursAgo: 24,
    },
  ];

  events.forEach((event) => {
    const timestamp = new Date(now.getTime() - event.hoursAgo * 60 * 60 * 1000);
    const dateString = formatTimestamp(timestamp);

    const entry: LogEntry = {
      timestamp,
      dateString,
      eventType: event.eventType,
      deviceType: event.deviceType,
      deviceName: event.deviceName,
      message: event.message,
      rawLine: `${dateString}: ${event.message}`,
    };

    mockLogs.push(entry);
  });

  // Reverse to show oldest first, newest last
  return mockLogs.reverse();
}

function formatTimestamp(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${day} ${month} ${year} at ${hours}:${minutes}:${seconds}`;
}
