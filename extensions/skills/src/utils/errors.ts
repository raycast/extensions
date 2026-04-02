/**
 * Extract a user-friendly error message from an unknown error value.
 * Translates common CLI and network error codes into actionable messages.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("ENOENT")) {
      return "Skills CLI not found. Install it with: npm install -g skills";
    }
    if (error.message.includes("EACCES")) {
      return "Permission denied. Check file permissions for the skills directory.";
    }
    if (error.message.includes("ETIMEDOUT") || error.message.includes("ECONNREFUSED")) {
      return "Network error. Check your internet connection and try again.";
    }
    return error.message;
  }
  return String(error);
}
