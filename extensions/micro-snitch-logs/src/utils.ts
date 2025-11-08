import { Icon, Color } from "@raycast/api";
import { LogEntry } from "./types";

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function getIcon(entry: LogEntry): Icon {
  if (entry.deviceType === "Audio") return Icon.Microphone;
  if (entry.deviceType === "Video") return Icon.Camera;
  if (entry.deviceType === "System") return Icon.Gear;
  return Icon.QuestionMark;
}

export function getColor(entry: LogEntry): Color {
  if (entry.eventType === "connected") return Color.Blue;
  if (entry.eventType === "disconnected") return Color.Orange;
  if (entry.eventType === "active") return Color.Green;
  if (entry.eventType === "inactive") return Color.Red;
  if (entry.eventType === "launched") return Color.Green;
  return Color.SecondaryText;
}

export function getEventDescription(entry: LogEntry): string {
  const deviceName = entry.message.match(/: (.+)$/)?.[1] || entry.message;

  switch (entry.eventType) {
    case "connected":
      return `🔌 Connected: ${deviceName}`;
    case "disconnected":
      return `❌ Disconnected: ${deviceName}`;
    case "active":
      return `🟢 Activated: ${deviceName}`;
    case "inactive":
      return `🔴 Deactivated: ${deviceName}`;
    case "launched":
      return `🚀 ${entry.message}`;
    default:
      return `📋 ${entry.message}`;
  }
}
