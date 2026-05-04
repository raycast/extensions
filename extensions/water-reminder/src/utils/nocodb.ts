import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { formatLocalDateKey } from "./storage";

export async function addNocoDBLog(amount: number) {
  const preferences = getPreferenceValues<Preferences>();
  const { nocodbApiToken, nocodbBaseUrl, nocodbTableId } = preferences;

  if (!nocodbApiToken || !nocodbBaseUrl || !nocodbTableId) {
    console.log("NocoDB credentials not configured");
    return;
  }

  try {
    const baseUrl = nocodbBaseUrl.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/${nocodbTableId}/records`, {
      method: "POST",
      headers: {
        "xc-token": nocodbApiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Title: "Water Log",
        Amount: amount,
        Date: `${formatLocalDateKey(new Date())}T00:00:00.000Z`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NocoDB sync failed:", response.status, errorText);
      await showToast({
        style: Toast.Style.Failure,
        title: "NocoDB Sync Failed",
        message: `Error ${response.status}: ${errorText.substring(0, 50)}`,
      });
      return;
    }

    console.log("Successfully synced to NocoDB");
  } catch (error) {
    console.error("NocoDB error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "NocoDB Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
