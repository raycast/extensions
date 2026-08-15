/**
 * Converts raw GCP/gcloud errors into user-friendly messages with actionable hints.
 */
export function friendlyErrorMessage(
  error: unknown,
  fallbackTitle = "Operation Failed",
): { title: string; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (
    lower.includes("not authorized") ||
    lower.includes("not authenticated") ||
    lower.includes("login required") ||
    lower.includes("unauthenticated")
  ) {
    return {
      title: "Authentication Required",
      message: "Re-authenticate via the Settings & Configuration command",
    };
  }

  if (lower.includes("permission denied") || lower.includes("permission_denied") || lower.includes("403")) {
    return {
      title: "Permission Denied",
      message: "Check your IAM role on this project",
    };
  }

  if (lower.includes("already exists") || lower.includes("already_exists") || lower.includes("conflict")) {
    return {
      title: "Already Exists",
      message: "A resource with that name already exists — choose a different name",
    };
  }

  if (lower.includes("not found") || lower.includes("does not exist") || lower.includes("404")) {
    return {
      title: "Resource Not Found",
      message: "Verify the resource exists and you have access",
    };
  }

  if (lower.includes("quota") || lower.includes("resource_exhausted") || lower.includes("429")) {
    return {
      title: "Quota Exceeded",
      message: "Check your GCP quotas in the Cloud Console",
    };
  }

  if (
    lower.includes("timed out") ||
    lower.includes("deadline_exceeded") ||
    lower.includes("timeout") ||
    lower.includes("etimedout")
  ) {
    return {
      title: "Request Timed Out",
      message: "Try again or check your internet connection",
    };
  }

  if (
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("network")
  ) {
    return {
      title: "Network Error",
      message: "Check your internet connection",
    };
  }

  return {
    title: fallbackTitle,
    message: raw,
  };
}
