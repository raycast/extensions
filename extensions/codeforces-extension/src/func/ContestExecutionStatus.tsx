import { Color } from "@raycast/api";

export function getStatusString(status: string) {
  switch (status) {
    case "BEFORE":
      return "Not Started Yet";
    case "CODING":
      return "In Progress";
    case "PENDING_SYSTEM_TEST":
      return "Pending System Test";
    case "SYSTEM_TEST":
      return "In System Test";
    case "FINISHED":
      return "Finished";
    default:
      return "Unknown Status";
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case "BEFORE":
      return Color.Blue;
    case "CODING":
      return Color.Magenta;
    case "PENDING_SYSTEM_TEST":
      return Color.Yellow;
    case "SYSTEM_TEST":
      return Color.Orange;
    case "FINISHED":
      return Color.Green;
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case "CF":
      return Color.Green;
    case "IOI":
      return Color.Magenta;
    case "ICPC":
      return Color.Yellow;
  }
}

export function secondsToDurationString(seconds: number) {
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];

  if (days > 0) {
    parts.push(`${days}D`);
  }

  if (hours > 0) {
    parts.push(`${hours}H`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}M`);
  }

  const remainingSeconds = seconds % 60;
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}S`);
  }

  return parts.join(" ");
}
