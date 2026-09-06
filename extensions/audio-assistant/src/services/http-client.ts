/** Music Assistant's HTTP /api returns the raw result, unlike WebSocket result envelopes. */
export type HttpErrorCode =
  | "authentication"
  | "permission"
  | "setup"
  | "invalid-request"
  | "server"
  | "timeout"
  | "connection"
  | "invalid-response";

export class MusicAssistantHttpError extends Error {
  constructor(
    public readonly code: HttpErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "MusicAssistantHttpError";
  }
}

export function normalizeServerUrl(input: string): string {
  const url = new URL(input.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("Use an HTTP(S) server URL without credentials, query parameters, or fragments.");
  return url.toString().replace(/\/+$/, "");
}
export class HttpCommandClient {
  private readonly endpoint: string;
  constructor(
    serverUrl: string,
    private readonly token: string,
    private readonly request: typeof fetch = fetch,
  ) {
    this.endpoint = `${normalizeServerUrl(serverUrl)}/api`;
    if (!token.trim()) throw new Error("Set a Music Assistant access token in extension preferences.");
  }
  async command(command: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<unknown> {
    let response: Response;
    try {
      response = await this.request(this.endpoint, {
        method: "POST",
        redirect: "error",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ command, args, message_id: crypto.randomUUID() }),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new MusicAssistantHttpError(
          "timeout",
          "Music Assistant timed out. Refresh server state before retrying a playback or queue action.",
        );
      }
      // Mutation may have reached the server. Never automatically replay it after timeout.
      throw new MusicAssistantHttpError(
        "connection",
        "Music Assistant did not respond. Check the server URL and connection; refresh before retrying.",
      );
    }
    if (response.status === 401)
      throw new MusicAssistantHttpError(
        "authentication",
        "Music Assistant rejected the access token. Update extension preferences.",
        401,
      );
    if (response.status === 403)
      throw new MusicAssistantHttpError("permission", "Your Music Assistant account cannot perform this action.", 403);
    if (response.status === 503)
      throw new MusicAssistantHttpError("setup", "Finish Music Assistant server setup before connecting.", 503);
    if (response.status === 400)
      throw new MusicAssistantHttpError(
        "invalid-request",
        "This Music Assistant server does not support the requested command or arguments.",
        400,
      );
    if (!response.ok)
      throw new MusicAssistantHttpError(
        "server",
        `Music Assistant request failed (HTTP ${response.status}).`,
        response.status,
      );
    try {
      return await response.json();
    } catch {
      throw new MusicAssistantHttpError("invalid-response", "Music Assistant returned an invalid response.");
    }
  }
}
