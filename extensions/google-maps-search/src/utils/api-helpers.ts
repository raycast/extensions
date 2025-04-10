import { showFailureToast } from "@raycast/utils";
import { openExtensionPreferences } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
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
    console.error(`${errorTitle}: ${error}`);
    await showFailureToast({
      title: errorTitle,
      message: errorMessage,
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
