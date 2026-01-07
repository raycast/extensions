import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  nocodbApiToken?: string;
  nocodbTableId?: string;
}

const NOCODB_BASE_URL = "https://nocodb.naai.studio/api/v2/tables";

export async function addNocoDBLog(amount: number) {
  const preferences = getPreferenceValues<Preferences>();
  const { nocodbApiToken, nocodbTableId } = preferences;

  if (!nocodbApiToken || !nocodbTableId) {
    console.log("NocoDB credentials not configured");
    return;
  }

  try {
    const response = await fetch(
      `${NOCODB_BASE_URL}/${nocodbTableId}/records`,
      {
        method: "POST",
        headers: {
          "xc-token": nocodbApiToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Title: "Water Log",
          Amount: amount,
          Date: new Date().toISOString(),
        }),
      },
    );

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
