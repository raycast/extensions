import { showToast, Toast } from "@raycast/api";

/**
 * Webhook integration for water logging
 */

interface WebhookPayload {
  timestamp: string;
  amount: number;
  note?: string;
  totalToday: number;
  goal: number;
  percentage: number;
}

/**
 * Send water log data to a webhook URL
 */
export async function sendToWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
): Promise<boolean> {
  if (!webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Webhook error:", response.status, errorText);
      await showToast({
        style: Toast.Style.Failure,
        title: "Webhook Sync Failed",
        message: `Error ${response.status}: ${errorText.substring(0, 50)}`,
      });
      return false;
    }

    console.log("Webhook sent successfully");
    return true;
  } catch (error) {
    console.error("Webhook failed:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Webhook Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}
