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
      console.error("Webhook error:", response.status, await response.text());
      return false;
    }

    console.log("Webhook sent successfully");
    return true;
  } catch (error) {
    console.error("Webhook failed:", error);
    return false;
  }
}
