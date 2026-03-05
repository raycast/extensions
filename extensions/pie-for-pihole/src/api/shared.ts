// Pi-hole v6 uses HTTPS with a self-signed certificate by default.
// All requests target the user's local Pi-hole, so this is safe.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export class PiholeConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiholeConnectionError";
  }
}

export async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new PiholeConnectionError("Request timed out. Check your Pi-hole URL.");
    }
    throw new PiholeConnectionError("Failed to connect to Pi-hole. Check your URL and network.");
  } finally {
    clearTimeout(timeout);
  }
}
