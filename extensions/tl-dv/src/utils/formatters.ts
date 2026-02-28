import { Recording } from "../types";

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

export function getMeetingIcon(meetingType: string): string {
  switch (meetingType) {
    case "zoom":
      return "🎥";
    case "google_meet":
      return "📹";
    case "teams":
      return "💼";
    default:
      return "📝";
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case "ready":
      return "✅";
    case "processing":
      return "⏳";
    case "failed":
      return "❌";
    default:
      return "❓";
  }
}

export function getRecordingSubtitle(recording: Recording): string {
  const parts: string[] = [];

  parts.push(formatDate(recording.createdAt));
  parts.push(formatDuration(recording.duration));

  if (recording.participants.length > 0) {
    const participantCount = recording.participants.length;
    parts.push(`${participantCount} participant${participantCount !== 1 ? "s" : ""}`);
  }

  if (recording.tags.length > 0) {
    parts.push(`${recording.tags.length} tag${recording.tags.length !== 1 ? "s" : ""}`);
  }

  return parts.join(" • ");
}

export function getRecordingAccessories(recording: Recording) {
  const accessories = [];

  accessories.push({
    text: formatDuration(recording.duration),
    tooltip: "Duration",
  });

  accessories.push({
    text: getMeetingIcon(recording.meetingType),
    tooltip: recording.meetingType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  });

  if (recording.status === "processing") {
    accessories.push({
      text: getStatusIcon(recording.status),
      tooltip: "Processing",
    });
  }

  if (recording.transcript) {
    accessories.push({
      text: "📝",
      tooltip: "Has transcript",
    });
  }

  if (recording.summary) {
    accessories.push({
      text: "📋",
      tooltip: "Has summary",
    });
  }

  if (recording.highlights && recording.highlights.length > 0) {
    accessories.push({
      text: `✨ ${recording.highlights.length}`,
      tooltip: `${recording.highlights.length} highlight${recording.highlights.length !== 1 ? "s" : ""}`,
    });
  }

  accessories.push({
    date: new Date(recording.createdAt),
    tooltip: new Date(recording.createdAt).toLocaleString(),
  });

  return accessories;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}
