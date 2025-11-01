export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getError(error: unknown) {
  const message = getErrorMessage(error);
  console.log("Error:", message);
  return message;
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);

  // Check for common Spotify errors and provide helpful messages
  if (message.includes("NO_ACTIVE_DEVICE") || message.includes("Player command failed")) {
    return "No active Spotify device found. Please open Spotify on any device and start playing music.";
  }

  if (message.includes("PREMIUM_REQUIRED") || message.includes("Premium required")) {
    return "This feature requires Spotify Premium. Please upgrade your account to use playback controls.";
  }

  if (message.includes("Unauthorized") || message.includes("401")) {
    return "Authentication expired. Please try again to re-authenticate with Spotify.";
  }

  if (message.includes("403") || message.includes("Forbidden")) {
    return "Access denied. Please check your Spotify permissions.";
  }

  if (message.includes("429") || message.includes("Rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (message.includes("Network") || message.includes("fetch failed")) {
    return "Network error. Please check your internet connection.";
  }

  if (message.includes("Not found") || message.includes("404")) {
    return "The requested resource was not found on Spotify.";
  }

  // Return the original message if no specific case matches
  return message;
}
