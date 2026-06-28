import { showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { AppError } from "../types";
import { validatePreferences } from "./validatePreferences";

const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Creates a preferences validation error.
 * @param preferences - user preferences to validate
 * @returns AppError object if validation fails, null otherwise
 */
export function createPreferencesError(preferences: Preferences): AppError | null {
  const { valid, errors } = validatePreferences(preferences);

  if (!valid) {
    return {
      type: "preferences-validation",
      message: "Invalid extension preferences",
      details: errors,
      instanceUrl: preferences.instance,
    };
  }

  return null;
}

/**
 * Creates a network error based on the original error and context.
 * @param error - original error object
 * @param instanceUrl - Nightscout instance URL
 * @param hasToken - whether the request has an access token
 * @returns AppError object
 */
export function createNetworkError(error: Error, instanceUrl: string, hasToken?: boolean): AppError {
  const message = error.message.toLowerCase();

  // check for invalid URL first
  if (!isValidUrl(instanceUrl)) {
    return {
      type: "invalid-url",
      message: "Invalid Nightscout URL",
      instanceUrl,
    };
  }

  // check for specific HTTP status codes
  if (message.includes("404") || message.includes("not found")) {
    return {
      type: "not-found",
      message: "Nightscout API endpoint not found",
      instanceUrl,
    };
  }

  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  ) {
    return {
      type: "unauthorized",
      message: hasToken ? "Access token invalid or insufficient permissions" : "Access token required",
      instanceUrl,
      hasToken,
    };
  }

  if (message.includes("429") || message.includes("rate limit") || message.includes("too many requests")) {
    return {
      type: "rate-limit",
      message: "Rate limit exceeded",
      instanceUrl,
    };
  }

  return {
    type: "connection",
    message: error.message || "Unknown connection error",
    instanceUrl,
  };
}

/**
 * Creates a data validation error for invalid glucose data format.
 * @param instanceUrl - Nightscout instance URL
 * @returns AppError object
 */
export function createDataValidationError(instanceUrl: string): AppError {
  return {
    type: "data-validation",
    message: "Invalid glucose data format received",
    instanceUrl,
  };
}

/**
 * Handles AppError by showing appropriate toast messages.
 * @param error - AppError object to handle
 * @param dataTypeName - name of the data type for context (e.g., "treatments", "glucose data")
 */
export async function handleAppError(error: AppError, dataTypeName: string): Promise<void> {
  switch (error.type) {
    case "invalid-url":
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Check your Nightscout URL in preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: openExtensionPreferences,
        },
      });
      break;

    case "not-found":
      await showToast({
        style: Toast.Style.Failure,
        title: "API Not Found",
        message: `Nightscout ${dataTypeName} API endpoints not accessible`,
      });
      break;

    case "unauthorized":
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Error",
        message: "Check your access token in preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: openExtensionPreferences,
        },
      });
      break;

    case "rate-limit":
      await showToast({
        style: Toast.Style.Failure,
        title: "Rate Limited",
        message: "Too many requests, please wait",
      });
      break;

    case "preferences-validation":
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Preferences",
        message: error.details ? error.details.join(", ") : "Check your extension preferences",
        primaryAction: {
          title: "Open Preferences",
          onAction: openExtensionPreferences,
        },
      });
      break;

    case "data-validation":
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Data",
        message: `Invalid ${dataTypeName} format received from Nightscout`,
      });
      break;

    default:
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: `Unable to connect to Nightscout ${dataTypeName}`,
      });
  }
}
