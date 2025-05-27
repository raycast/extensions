import { GoogleAuth } from "google-auth-library";
import { getPreferenceValues } from "@raycast/api";
import { GCPPreferences } from "./types";

let auth: GoogleAuth | null = null;

export async function getGoogleAuth(): Promise<GoogleAuth> {
  if (auth) {
    return auth;
  }

  const preferences = getPreferenceValues<GCPPreferences>();

  const authOptions: {
    scopes: string[];
    projectId?: string;
    keyFile?: string;
  } = {
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/compute",
      "https://www.googleapis.com/auth/cloud-platform.read-only",
    ],
  };

  // Only set project ID if explicitly provided
  if (preferences.projectId && preferences.projectId.trim()) {
    authOptions.projectId = preferences.projectId;
  }

  if (preferences.serviceAccountPath && preferences.serviceAccountPath.trim()) {
    authOptions.keyFile = preferences.serviceAccountPath;
  }

  auth = new GoogleAuth(authOptions);
  return auth;
}

export async function getProjectId(): Promise<string> {
  try {
    const preferences = getPreferenceValues<GCPPreferences>();

    // If explicitly set in preferences, use that
    if (preferences.projectId && preferences.projectId.trim()) {
      return preferences.projectId;
    }

    // Try to get from ADC
    try {
      const auth = await getGoogleAuth();
      const adcProjectId = await auth.getProjectId();
      if (adcProjectId) {
        return adcProjectId;
      }
    } catch {
      // ADC couldn't detect project ID
    }

    // Fallback to environment variables
    const envProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    if (envProject) {
      return envProject;
    }

    throw new Error("No project ID found. Please set it in preferences or configure ADC.");
  } catch (error) {
    throw new Error(`Failed to determine project ID: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return "Unknown";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
  } catch {
    return "Invalid Date";
  }
}

export function getZoneFromSelfLink(selfLink: string): string {
  const match = selfLink.match(/zones\/([^/]+)/);
  return match ? match[1] : "unknown";
}

export function getRegionFromSelfLink(selfLink: string): string {
  const match = selfLink.match(/regions\/([^/]+)/);
  return match ? match[1] : "unknown";
}

export function getMachineTypeFromSelfLink(machineTypeUrl: string): string {
  const parts = machineTypeUrl.split("/");
  return parts[parts.length - 1];
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "Invalid size";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getStatusIcon(status: string): string {
  switch (status.toUpperCase()) {
    case "RUNNING":
    case "READY":
    case "ACTIVE":
      return "🟢";
    case "STOPPED":
    case "TERMINATED":
    case "INACTIVE":
      return "🔴";
    case "STOPPING":
    case "TERMINATING":
    case "STARTING":
    case "NOT_READY":
      return "🟡";
    default:
      return "⚪";
  }
}
