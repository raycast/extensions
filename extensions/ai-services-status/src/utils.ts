import { StatusResponse } from "./types";

// Format ISO date string to human-readable form
export function formatDate(dateString: string): string {
  if (!dateString || dateString === "Unknown") {
    return "Unknown";
  }

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }

    // Format to local date and time string
    // Example output: "2023-04-15 14:30:45" or according to user's locale settings
    const formattedDate = date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Calculate how long ago
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    } else if (diffMins < 10080) {
      // 7 days
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }

    return formattedDate;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

// Extract status information from JSON
export function extractStatusFromJson(jsonData: StatusResponse) {
  let overallStatus = "Unknown";
  let updatedAt = "Unknown";

  if (jsonData?.status?.description) {
    overallStatus = jsonData.status.description;
  }
  if (jsonData?.page?.updated_at) {
    updatedAt = formatDate(jsonData.page.updated_at);
  }

  return { overallStatus, updatedAt };
}

// Standardize status descriptions
export function determineOverallStatus(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes("operational")) {
    return "Operational";
  } else if (lower.includes("maintenance")) {
    return "Under Maintenance";
  } else if (lower.includes("degraded") || lower.includes("partial")) {
    return "Degraded Performance";
  } else if (lower.includes("outage") || lower.includes("major") || lower.includes("down")) {
    return "Major Outage";
  }
  return status;
}

// Get status icon
export function getStatusIcon(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes("operational")) {
    return "✅";
  } else if (lower.includes("maintenance")) {
    return "🔧";
  } else if (lower.includes("degraded")) {
    return "⚠️";
  } else if (lower.includes("outage")) {
    return "❌";
  }
  return "❓";
}
