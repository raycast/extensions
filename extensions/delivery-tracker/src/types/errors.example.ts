/**
 * Example usage of error types in carrier implementations
 *
 * This file demonstrates how carrier update functions should throw
 * categorized errors for better user guidance.
 */

import { Delivery } from "./delivery";
import { Package } from "./package";
import { NetworkError, AuthenticationError, RateLimitError, InvalidTrackingError, CarrierAPIError } from "./errors";

/**
 * Example carrier implementation with proper error handling
 */
export async function exampleCarrierUpdate(delivery: Delivery): Promise<Package[]> {
  try {
    const response = await fetch(`https://api.carrier.com/track/${delivery.trackingNumber}`, {
      headers: {
        Authorization: `Bearer ${process.env.CARRIER_API_KEY}`,
      },
    });

    // Handle different HTTP status codes
    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError("Invalid API credentials");
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RateLimitError("Rate limit exceeded", retryAfter ? parseInt(retryAfter, 10) : undefined);
    }

    if (response.status === 404) {
      throw new InvalidTrackingError("Tracking number not found", delivery.trackingNumber);
    }

    if (!response.ok) {
      throw new CarrierAPIError(`API error: ${response.statusText}`, response.status);
    }

    // Parse response and process packages...
    await response.json();
    return [];
  } catch (error) {
    // Network errors (fetch failures)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError("Failed to connect to carrier API", error);
    }

    // Re-throw our custom errors
    if (
      error instanceof NetworkError ||
      error instanceof AuthenticationError ||
      error instanceof RateLimitError ||
      error instanceof InvalidTrackingError ||
      error instanceof CarrierAPIError
    ) {
      throw error;
    }

    // Unknown errors will be categorized by the tracking service
    throw error;
  }
}
