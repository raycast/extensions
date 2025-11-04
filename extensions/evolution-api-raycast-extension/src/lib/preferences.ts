import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";

type Preferences = {
  baseUrl: string;
  apiKey: string;
};

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function validatePreferences(): { isValid: boolean; error?: string } {
  try {
    const prefs = getPreferences();

    if (!prefs.baseUrl || prefs.baseUrl.trim() === "") {
      return {
        isValid: false,
        error: "Evolution API Base URL is not configured",
      };
    }

    if (!prefs.apiKey || prefs.apiKey.trim() === "") {
      return {
        isValid: false,
        error: "API Key is not configured",
      };
    }

    // Validate URL format
    try {
      new URL(prefs.baseUrl);
    } catch {
      return {
        isValid: false,
        error: "Invalid Base URL format. Please provide a valid URL (e.g., http://localhost:8080)",
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: "Failed to load preferences",
    };
  }
}

export async function checkPreferencesOrPrompt(): Promise<boolean> {
  const validation = validatePreferences();

  if (!validation.isValid) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Configuration Required",
      message: validation.error,
      primaryAction: {
        title: "Open Settings",
        onAction: () => openExtensionPreferences(),
      },
    });
    return false;
  }

  return true;
}
