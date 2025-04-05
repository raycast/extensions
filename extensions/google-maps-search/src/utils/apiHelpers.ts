// External library imports
import { showFailureToast } from "@raycast/utils";
import { openExtensionPreferences, getPreferenceValues } from "@raycast/api";

// Internal type exports
import { Preferences } from "../types";

/**
 * Validates that an API key exists and shows an error toast if not
 * @returns True if API key exists, false otherwise
 */
export async function validateApiKey(): Promise<boolean> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.googlePlacesApiKey) {
    await showFailureToast({
      title: "API Key Missing",
      message: "Please set your Google Places API key in preferences",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return false;
  }

  return true;
}

/**
 * Executes an API request with standardized error handling
 * @param requestFn Function that performs the actual API request
 * @param errorTitle Title for error toast
 * @param errorMessage Message for error toast
 * @returns The result of the API request or null if an error occurred
 */
export async function executeApiRequest<T>(
  requestFn: () => Promise<T>,
  errorTitle: string,
  errorMessage: string
): Promise<T | null> {
  try {
    // Validate API key before making request
    if (!(await validateApiKey())) {
      return null;
    }

    return await requestFn();
  } catch (error) {
    // Get detailed error information
    const errorDetails =
      error instanceof Error
        ? error.message + (error.stack ? `\nStack: ${error.stack.split("\n")[1]?.trim()}` : "")
        : String(error);

    console.error(`${errorTitle}: ${errorDetails}`);

    await showFailureToast({
      title: errorTitle,
      message: `${errorMessage}${error instanceof Error ? `\nDetails: ${error.message}` : ""}`,
    });
    return null;
  }
}

/**
 * Validates a Google API response status
 * @param status The status from the Google API response
 * @param errorTitle Title for error toast if status is not OK
 * @returns True if status is OK, false otherwise
 */
export async function validateGoogleApiStatus(status: string, errorTitle: string): Promise<boolean> {
  if (status !== "OK") {
    await showFailureToast({
      title: errorTitle,
      message: `API returned status: ${status}`,
    });
    return false;
  }
  return true;
}
