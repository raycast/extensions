/**
 * SonarQube status checking utilities
 */

import * as http from "http";

/**
 * Check if SonarQube server is running by making an HTTP request to its status endpoint.
 *
 * This enhanced version provides sophisticated status detection with the following features:
 * 1. Configurable timeouts for different server states
 * 2. Automatic retry with exponential backoff
 * 3. Detailed status reporting option
 * 4. Intelligent error classification (down, starting, timeout, etc.)
 *
 * @param options Configuration options
 * @param options.retries Number of retries if request fails (default: 2)
 * @param options.timeout Timeout in milliseconds (default: 3000)
 * @param options.detailed Whether to return detailed status info or simple boolean
 * @returns If detailed=false: boolean indicating if SonarQube is running
 *          If detailed=true: an object with running (boolean), status (string), and details (string) properties
 */
export async function isSonarQubeRunning(options?: {
  retries?: number;
  timeout?: number;
  detailed?: boolean;
}): Promise<boolean | { running: boolean; status: string; details?: string }> {
  const maxRetries = options?.retries ?? 2;
  const initialTimeout = options?.timeout ?? 3000;
  const detailed = options?.detailed ?? false;

  let attemptCount = 0;
  let lastError = "";

  // Try making the request, potentially multiple times
  while (attemptCount <= maxRetries) {
    attemptCount++;

    // For retry attempts, increase timeout to give more time
    const timeoutForThisAttempt = initialTimeout * Math.min(attemptCount, 3);

    try {
      const response = await checkSonarQubeStatus(timeoutForThisAttempt);

      // Process the response
      if (response.status.toLowerCase() === "up") {
        // SonarQube is up and running normally
        return detailed ? { running: true, status: "running", details: "SonarQube is running normally" } : true;
      } else if (response.status.toLowerCase() === "starting") {
        // SonarQube is starting up
        return detailed ? { running: false, status: "starting", details: "SonarQube is still starting up" } : false;
      } else {
        // Some other status we don't recognize
        return detailed
          ? {
              running: false,
              status: "unknown_success_response",
              details: `SonarQube returned status: ${response.status}`,
            }
          : false;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      // If this was the last attempt, break to proceed to final handling
      if (attemptCount > maxRetries) {
        break;
      }
      // Exponential backoff before next retry
      const delay = Math.min(500 * Math.pow(2, attemptCount - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  } // End of while loop

  // If we get here, all attempts failed. 'lastError' holds the error from the last attempt.

  if (detailed) {
    const originalLastErrorString = String(lastError);
    const lowerLastError = originalLastErrorString.toLowerCase();

    // Direct check for the exact string, case-insensitive
    const isExactTimeoutString =
      originalLastErrorString === "Request timed out" || lowerLastError === "request timed out";
    // Regex check (current method)
    const regexFindsTimeout = /timeout/i.test(originalLastErrorString);

    // Combine checks: prefer exact match, fall back to regex
    const combinedIncludesTimeout = isExactTimeoutString || regexFindsTimeout;

    if (originalLastErrorString.includes("ECONNREFUSED")) {
      return { running: false, status: "down", details: "SonarQube server is not running" };
    } else if (combinedIncludesTimeout) {
      return { running: false, status: "timeout", details: "SonarQube server is not responding (may be starting)" };
    } else {
      // This is the branch that's unexpectedly being hit for timeouts
      return {
        running: false,
        status: "error",
        details: `Error checking SonarQube: ${lastError || "Unknown error"}`,
      };
    }
  } else {
    // Not detailed, return simple boolean
    // All attempts failed, so SonarQube is not considered running.
    return false;
  }
}

/**
 * Helper function to check SonarQube status with a specific timeout
 * @private
 */
export async function checkSonarQubeStatus(timeoutMs: number): Promise<{ status: string }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 9000,
      path: "/api/system/status",
      method: "GET",
      timeout: timeoutMs,
    };

    const req = http.get(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          try {
            // Try to parse response as JSON to get actual status
            const statusInfo = JSON.parse(data);
            resolve(statusInfo);
          } catch (e) {
            // If we can't parse it but got a 2xx status, assume it's running
            resolve({ status: "up" });
          }
        } else if (res.statusCode === 503) {
          // Service unavailable often means the server is starting
          resolve({ status: "starting" });
        } else {
          reject(new Error(`Unexpected status code: ${res.statusCode}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}
