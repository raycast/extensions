import { GhosthandError, isRecord, problemError } from "./errors";
import { readEvents } from "./sse";
import { readTaskResponse } from "./tasks";
import { parseJSON, readBody, SocketTransport } from "./transport";
import type { Lease, Schemas, QuickAction, TaskUpdate } from "./types";
import { actionResult, leaseResponse, phoneOverview, screenText } from "./validation";

export function validateTypedText(text: string): string | undefined {
  if (!text.length) return "Enter text to type.";
  // Newlines press Enter and tabs change focus, even when `enter` is false.
  if (/[^\x20-\x7e]/.test(text))
    return "Use printable US-ASCII only. Newlines, tabs, and other control characters can submit or change focus.";
}

export class GhosthandClient {
  constructor(private readonly transport = new SocketTransport()) {}

  async phones(signal?: AbortSignal) {
    return phoneOverview(await this.transport.json("/v1/phones", { signal }));
  }

  async preview(phoneId: string, signal?: AbortSignal) {
    const response = await this.transport.request(`/v1/phones/${encodeURIComponent(phoneId)}/preview?width=600`, {
      signal,
      accept: "image/jpeg",
    });
    if (!response.headers["content-type"]?.includes("image/jpeg")) {
      response.destroy();
      throw new GhosthandError("invalid-response", "Ghosthand did not return a JPEG preview.");
    }
    const data = await readBody(response);
    if (data.length < 3 || data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) {
      throw new GhosthandError("invalid-response", "Ghosthand returned an invalid preview image.");
    }
    return data;
  }

  async acquire(device: string, reason: string): Promise<Lease> {
    const body: Schemas["AcquireLeaseRequest"] = {
      device,
      reason,
      label: "Raycast Ghosthand",
      idleTimeoutSeconds: 600,
      force: false,
    };
    // Drain acquisition even after cancellation so a newly returned ID can be released.
    return leaseResponse(await this.transport.json("/v1/leases", { method: "POST", body }));
  }

  async release(leaseId: string): Promise<void> {
    try {
      await this.transport.json(`/v1/leases/${encodeURIComponent(leaseId)}`, { method: "DELETE", timeoutMs: 30_000 });
    } catch (error) {
      if (!(error instanceof GhosthandError && error.code === "lease-invalid")) throw error;
    }
  }

  async text(lease: string, signal?: AbortSignal) {
    return screenText(await this.transport.json(`/v1/leases/${encodeURIComponent(lease)}/text`, { signal }));
  }

  async task(
    lease: string,
    prompt: string,
    streaming: boolean,
    signal: AbortSignal,
    onUpdate: (update: TaskUpdate) => void,
  ) {
    const body: Schemas["TaskRequest"] = { prompt };
    const response = await this.transport.request(`/v1/leases/${encodeURIComponent(lease)}/task`, {
      method: "POST",
      body,
      signal,
      accept: streaming ? "text/event-stream" : "application/json",
      timeoutMs: 30 * 60_000,
    });
    // Accept JSON returned to a streaming request, but never re-POST a possibly executed task.
    return readTaskResponse(response, onUpdate);
  }

  async input(lease: string, action: QuickAction, signal?: AbortSignal) {
    const base = `/v1/leases/${encodeURIComponent(lease)}`;
    let path: string;
    let body:
      | Schemas["KeyRequest"]
      | Schemas["ScrollRequest"]
      | Schemas["MuteRequest"]
      | Schemas["TypeRequest"]
      | Schemas["TapRequest"]
      | undefined;
    switch (action.kind) {
      case "home":
      case "enter":
        path = "/key";
        body = { key: action.kind };
        break;
      case "lock":
        path = "/lock";
        break;
      case "scroll":
        path = "/scroll";
        body = { direction: action.direction, ticks: 5 };
        break;
      case "mute":
        path = "/mute";
        body = { muted: action.muted };
        break;
      case "type": {
        const error = validateTypedText(action.text);
        if (error) throw new GhosthandError("invalid-request", error);
        path = "/type";
        body = { text: action.text, enter: false };
        break;
      }
      case "tap":
        if (!action.text.trim()) throw new GhosthandError("invalid-request", "Enter a visible text label.");
        path = "/tap";
        body = { text: action.text };
        break;
    }
    const response = await this.transport.request(base + path, {
      method: "POST",
      body,
      signal,
      accept: "text/event-stream",
      timeoutMs: 330_000,
    });
    if (!response.headers["content-type"]?.includes("text/event-stream")) {
      const result = parseJSON<unknown>(await readBody(response));
      if (isRecord(result) && typeof result.code === "string") throw problemError(result);
      return actionResult(result);
    }
    try {
      for await (const event of readEvents(response)) {
        if (event.event === "log") continue;
        const value = parseJSON<unknown>(Buffer.from(event.data));
        if (event.event === "error") throw problemError(value);
        if (event.event === "result") return actionResult(value);
      }
      throw new GhosthandError(
        "connection-lost",
        "The action stream ended without a result. Inspect the screen before retrying.",
      );
    } finally {
      response.destroy();
    }
  }
}

export const client = new GhosthandClient();
