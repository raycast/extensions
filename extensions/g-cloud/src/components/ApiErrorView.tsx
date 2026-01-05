/**
 * API Error View Component
 * Shows a user-friendly error screen with an "Enable API" action for API-not-enabled errors
 */

import { List, ActionPanel, Action, Icon, Color, open } from "@raycast/api";

// Map of API services to their human-readable names and enable URLs
const API_INFO: Record<string, { name: string; service: string }> = {
  cloudbuild: { name: "Cloud Build", service: "cloudbuild.googleapis.com" },
  cloudfunctions: { name: "Cloud Functions", service: "cloudfunctions.googleapis.com" },
  run: { name: "Cloud Run", service: "run.googleapis.com" },
  compute: { name: "Compute Engine", service: "compute.googleapis.com" },
  storage: { name: "Cloud Storage", service: "storage.googleapis.com" },
  secretmanager: { name: "Secret Manager", service: "secretmanager.googleapis.com" },
  logging: { name: "Cloud Logging", service: "logging.googleapis.com" },
  iam: { name: "IAM", service: "iam.googleapis.com" },
  container: { name: "Kubernetes Engine", service: "container.googleapis.com" },
  serviceusage: { name: "Service Usage", service: "serviceusage.googleapis.com" },
  cloudresourcemanager: { name: "Cloud Resource Manager", service: "cloudresourcemanager.googleapis.com" },
};

interface ApiErrorViewProps {
  error: string;
  projectId?: string;
  apiName?: string;
  onRetry?: () => void;
  title?: string;
}

/**
 * Check if an error message indicates an API-not-enabled error
 */
function isApiNotEnabledError(message: string): boolean {
  return (
    message.includes("Access Not Configured") ||
    message.includes("has not been used in project") ||
    message.includes("is disabled") ||
    message.includes("API has not been enabled") ||
    message.includes("PERMISSION_DENIED") ||
    message.includes("Enable it by visiting")
  );
}

/**
 * Extract the API enable URL from an error message if present
 */
function extractApiUrl(errorMessage: string): string | null {
  const urlMatch = errorMessage.match(
    /https:\/\/console\.developers\.google\.com\/apis\/api\/[^\s"']+|https:\/\/console\.cloud\.google\.com\/apis\/[^\s"']+/,
  );
  return urlMatch ? urlMatch[0] : null;
}

/**
 * Extract project ID from error message
 */
function extractProjectId(errorMessage: string): string | null {
  // Match "project bionic-path-457112-u6" or "project 1234567890"
  const projectMatch = errorMessage.match(/project\s+([a-z0-9-]+)/i);
  return projectMatch ? projectMatch[1] : null;
}

/**
 * Build the API enable URL
 */
function buildApiEnableUrl(projectId: string, apiService: string): string {
  return `https://console.developers.google.com/apis/api/${apiService}/overview?project=${projectId}`;
}

/**
 * Get a clean, user-friendly error message
 */
function getCleanErrorMessage(error: string, apiName?: string): string {
  if (isApiNotEnabledError(error)) {
    const apiInfo = apiName ? API_INFO[apiName] : null;
    const apiDisplayName = apiInfo?.name || "Required API";
    return `${apiDisplayName} is not enabled for this project`;
  }

  // For other errors, trim and clean up
  let cleaned = error
    .replace(/^Error:\s*/i, "")
    .replace(/Permission denied:\s*/i, "")
    .replace(/https:\/\/[^\s]+/g, "") // Remove URLs from message
    .replace(/\s+/g, " ")
    .trim();

  // Truncate if too long
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 100) + "...";
  }

  return cleaned || "An unexpected error occurred";
}

/**
 * Reusable API Error View component
 * Shows a friendly error message with "Enable API" action for API errors
 */
export function ApiErrorView({ error, projectId, apiName, onRetry, title }: ApiErrorViewProps) {
  const isApiError = isApiNotEnabledError(error);
  const cleanMessage = getCleanErrorMessage(error, apiName);

  // Get the enable URL
  let enableUrl = extractApiUrl(error);
  if (!enableUrl && isApiError) {
    const extractedProjectId = projectId || extractProjectId(error);
    const apiInfo = apiName ? API_INFO[apiName] : null;
    if (extractedProjectId && apiInfo) {
      enableUrl = buildApiEnableUrl(extractedProjectId, apiInfo.service);
    }
  }

  const apiInfo = apiName ? API_INFO[apiName] : null;
  const errorTitle = title || (isApiError ? `${apiInfo?.name || "API"} Not Enabled` : "Something went wrong");

  return (
    <List.EmptyView
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      title={errorTitle}
      description={cleanMessage}
      actions={
        <ActionPanel>
          {isApiError && enableUrl && <Action title="Enable API" icon={Icon.Globe} onAction={() => open(enableUrl!)} />}
          {onRetry && (
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

/**
 * Hook-friendly error state type
 */
export interface ApiError {
  message: string;
  isApiError: boolean;
  enableUrl?: string;
}

/**
 * Parse an error into a structured ApiError object
 */
export function parseApiError(error: unknown, projectId?: string, apiName?: string): ApiError {
  const message = error instanceof Error ? error.message : String(error);
  const isApiError = isApiNotEnabledError(message);

  let enableUrl = extractApiUrl(message);
  if (!enableUrl && isApiError) {
    const extractedProjectId = projectId || extractProjectId(message);
    const apiInfo = apiName ? API_INFO[apiName] : null;
    if (extractedProjectId && apiInfo) {
      enableUrl = buildApiEnableUrl(extractedProjectId, apiInfo.service);
    }
  }

  return {
    message: getCleanErrorMessage(message, apiName),
    isApiError,
    enableUrl: enableUrl || undefined,
  };
}
