import { Response } from "node-fetch";

export interface ErrorWithStatus extends Error {
  status: number;
}

/**
 * Centralized function to check the HTTP response.
 * Throws errors with clear messages for common error codes.
 * @param response The response object to check.
 */
export async function checkResponseError(response: Response): Promise<void> {
  if (response.ok) return;

  let errorMessage = `API request failed: [${response.status}] ${response.statusText}`;
  try {
    const errorText = await response.text();
    if (errorText) {
      errorMessage += ` ${errorText}`;
    }
  } catch {
    // ignore errors during error text parsing
  }

  const errorMessages: Record<number, string> = {
    403: "Operation not permitted.",
    404: "Object not found.",
    410: "Object has been deleted.",
    429: "Rate Limit Exceeded: Please try again later.",
  };

  const error = new Error(errorMessages[response.status] || errorMessage) as ErrorWithStatus;
  error.status = response.status;
  throw error;
}
