import { getPreferenceValues, openExtensionPreferences, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const API_BASE_URL = "https://connect.mailerlite.com/api";

const { mailerliteApiKey } = getPreferenceValues<Preferences>();
export const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${mailerliteApiKey}`,
  "Content-Type": "application/json",
};

export const handleError = async (error: Error, toastTitle: string) => {
  let title = toastTitle;
  let message = `HTTP error! status: ${error.message}`;
  let primaryAction: Toast.ActionOptions | undefined = undefined;

  if (error.message.includes("401")) {
    title = "Invalid API Key";
    message = "Please check your MailerLite API key in preferences.";
    primaryAction = {
      title: "Open Extension Preferences",
      onAction: openExtensionPreferences,
    };
  }

  await showFailureToast(message, { title, primaryAction });
};
