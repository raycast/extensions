import { REQUEST_CARD_WEBHOOK_URL } from "../constants";
import type { RequestCardPayload, RequestCardResult } from "../types";

/**
 * Sends a missing-card request to the Google Apps Script webhook.
 *
 * @param payload - Request card payload with word and context
 * @returns Result with success status or error message
 */
export async function submitRequestCard(payload: RequestCardPayload): Promise<RequestCardResult> {
  try {
    const response = await fetch(REQUEST_CARD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Request card webhook returned ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    const webhookErrorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: webhookErrorMessage };
  }
}
