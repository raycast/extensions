import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";

export async function sendCommand(
  query: string,
  successMessage: string,
): Promise<void> {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const url = `${baseUrl.replace(/\/+$/, "")}/?${query}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`kuandoHUB responded with HTTP ${response.status}`);
    }
    await showHUD(successMessage);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not reach kuandoHUB",
      message:
        error instanceof Error &&
        error.message.startsWith("kuandoHUB responded")
          ? error.message
          : "Enable the HTTP Server in kuandoHUB → Advanced Settings, and the HTTP entry in Platform Priorities",
    });
  }
}
