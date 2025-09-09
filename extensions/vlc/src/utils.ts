import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VLC_REMOTE_URL } from "./constants";

interface VLCRequestOptions {
  command: string;
  parameters?: Record<string, string | number>;
  maxRetries?: number;
}

interface VLCError extends Error {
  code?: string;
  status?: number;
}

export async function makeVLCRequest({
  command,
  parameters = {},
  maxRetries = 2,
}: VLCRequestOptions): Promise<Response> {
  const { vlc_password } = getPreferenceValues();
  const auth = Buffer.from(`:${vlc_password}`).toString("base64");

  const params = new URLSearchParams({ command, ...parameters });
  const url = `${VLC_REMOTE_URL}?${params.toString()}`;

  let lastError: VLCError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return response;
      }

      const error: VLCError = new Error(`VLC request failed`);
      error.status = response.status;

      if (response.status === 401) {
        error.message = "Invalid VLC password. Check your VLC HTTP interface settings.";
        error.code = "AUTH_ERROR";
        throw error;
      } else if (response.status === 404) {
        error.message =
          "VLC HTTP interface not available. Ensure VLC is running with HTTP interface enabled on port 8080.";
        error.code = "NOT_FOUND";
        throw error;
      } else if (response.status >= 500) {
        error.message = "VLC server error. The media player may be experiencing issues.";
        error.code = "SERVER_ERROR";
      } else {
        error.message = `VLC request failed with status ${response.status}`;
        error.code = "REQUEST_ERROR";
      }

      lastError = error;

      if (attempt < maxRetries && (response.status >= 500 || response.status === 408)) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      throw error;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const vlcError: VLCError = new Error(
          "Cannot connect to VLC. Ensure VLC is running with HTTP interface enabled on port 8080.",
        );
        vlcError.code = "CONNECTION_ERROR";
        lastError = vlcError;

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        throw vlcError;
      }

      if (error instanceof Error && error.name === "TimeoutError") {
        const timeoutError: VLCError = new Error("Request to VLC timed out. The media player may be unresponsive.");
        timeoutError.code = "TIMEOUT_ERROR";
        lastError = timeoutError;

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        throw timeoutError;
      }

      throw error;
    }
  }

  throw lastError || new Error("Maximum retries exceeded");
}

export async function handleVLCError(error: unknown, action: string): Promise<void> {
  const vlcError = error as VLCError;

  const title = `Failed to ${action}`;

  await showFailureToast(vlcError, {
    title,
    message: vlcError.message || "An unknown error occurred",
  });
}
