import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";

export function checkConfiguration() {
  const { oktaDomain, clientId } = getPreferenceValues<{ oktaDomain?: string; clientId?: string }>();

  if (!oktaDomain || !clientId) {
    const missing = [];
    if (!oktaDomain) missing.push("Okta Domain");
    if (!clientId) missing.push("Client ID");

    const message = `Missing configuration: ${missing.join(", ")}. Please configure the extension.`;

    showToast({
      style: Toast.Style.Failure,
      title: "Configuration Required",
      message: message,
      primaryAction: {
        title: "Open Preferences",
        onAction: openExtensionPreferences,
      },
    });

    throw new Error(message);
  }
}
