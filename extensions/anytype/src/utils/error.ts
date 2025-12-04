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
  } catch (e) {
    // ignore errors during error text parsing
  }

  let error: ErrorWithStatus = new Error(errorMessage) as ErrorWithStatus;
  switch (response.status) {
    case 403:
      error = new Error("Operation not permitted.") as ErrorWithStatus;
      error.status = 403;
      break;
    case 404:
      error = new Error("Object not found.") as ErrorWithStatus;
      error.status = 404;
      break;
    case 410:
      error = new Error("Object has been deleted.") as ErrorWithStatus;
      error.status = 410;
      break;
    case 429:
      error = new Error("Rate Limit Exceeded: Please try again later.") as ErrorWithStatus;
      error.status = 429;
      break;
    default:
      error.status = response.status;
  }
  throw error;
}
