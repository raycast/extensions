import { GoogleAuth } from "google-auth-library";
import { getPreferenceValues } from "@raycast/api";
import { GCPPreferences } from "./types";

// Cache auth per project to support multiple GCP accounts/projects
const authCache = new Map<string, GoogleAuth>();
// Cache project ID to avoid multiple API calls
let cachedProjectId: string | null = null;

export async function getGoogleAuth(): Promise<GoogleAuth> {
  try {
    const preferences = getPreferenceValues<GCPPreferences>();

    // Create a cache key based on project and service account to support multiple configs
    const cacheKey = `${preferences.projectId || "default"}-${preferences.serviceAccountPath || "adc"}`;

    if (authCache.has(cacheKey)) {
      return authCache.get(cacheKey)!;
    }

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

    const auth = new GoogleAuth(authOptions);
    authCache.set(cacheKey, auth);
    return auth;
  } catch (error) {
    throw new Error(`Failed to initialize Google Auth: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getProjectId(): Promise<string> {
  try {
    // Return cached project ID if available
    if (cachedProjectId) {
      return cachedProjectId;
    }

    const preferences = getPreferenceValues<GCPPreferences>();

    // If explicitly set in preferences, use that
    if (preferences.projectId && preferences.projectId.trim()) {
      cachedProjectId = preferences.projectId;
      return cachedProjectId;
    }

    // Try to get from ADC
    try {
      const auth = await getGoogleAuth();
      const adcProjectId = await auth.getProjectId();
      if (adcProjectId) {
        cachedProjectId = adcProjectId;
        return cachedProjectId;
      }
    } catch {
      // ADC couldn't detect project ID
    }

    // Fallback to environment variables
    const envProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    if (envProject) {
      cachedProjectId = envProject;
      return cachedProjectId;
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
  try {
    if (!selfLink || typeof selfLink !== "string") {
      return "unknown";
    }
    const match = selfLink.match(/zones\/([^/]+)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

export function getRegionFromSelfLink(selfLink: string): string {
  try {
    if (!selfLink || typeof selfLink !== "string") {
      return "unknown";
    }
    const match = selfLink.match(/regions\/([^/]+)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

export function getMachineTypeFromSelfLink(machineTypeUrl: string): string {
  try {
    if (!machineTypeUrl || typeof machineTypeUrl !== "string") {
      return "unknown";
    }
    const parts = machineTypeUrl.split("/");
    return parts[parts.length - 1] || "unknown";
  } catch {
    return "unknown";
  }
}

export function formatBytes(bytes: number): string {
  try {
    if (bytes === 0) return "0 B";
    if (bytes < 0 || !Number.isFinite(bytes)) return "Invalid size";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i >= sizes.length) return "Size too large";
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  } catch {
    return "Invalid size";
  }
}

export function getStatusIcon(status: string): string {
  try {
    if (!status || typeof status !== "string") {
      return "⚪";
    }
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
  } catch {
    return "⚪";
  }
}
