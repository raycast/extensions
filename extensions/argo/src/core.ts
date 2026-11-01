import { open } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { localUrl } from "./protocol.js";
import type { Answer, BridgeEvent, Interaction, Pairing, Session, Snapshot } from "./protocol.js";

export type ClientConfig = { url: string; token: string; bridgeId?: string };
export type Connection = "connecting" | "live" | "offline";

export function parseConfig(value: unknown): ClientConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid client configuration");
  const { url, token, bridgeId } = value as Partial<ClientConfig>;
  if (
    typeof url !== "string" ||
    typeof token !== "string" ||
    token.length < 32 ||
    token.length > 200 ||
    /\s/.test(token)
  ) {
    throw new Error("Client configuration must contain a loopback URL and a valid token");
  }
  if (bridgeId !== undefined && (typeof bridgeId !== "string" || !/^[a-f0-9]{64}$/.test(bridgeId)))
    throw new Error("Invalid bridge identity");
  return { url: localUrl(url).origin, token, ...(bridgeId ? { bridgeId } : {}) };
}

export async function readConfig(configPath?: string): Promise<ClientConfig> {
  const path = configPath?.trim() || "~/.argo/client.json";
  const expanded = path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
  if (!isAbsolute(expanded)) throw new Error("Configuration path must be absolute or start with ~/");
  try {
    const file = await open(expanded, "r");
    try {
      const info = await file.stat();
      if (
        !info.isFile() ||
        info.size > 16_384 ||
        (info.mode & 0o077) !== 0 ||
        (process.getuid && info.uid !== process.getuid())
      ) {
        throw new Error("Configuration must be a private file owned by the current user (chmod 600)");
      }
      return parseConfig(JSON.parse(await file.readFile("utf8")));
    } finally {
      await file.close();
    }
  } catch {
    // Never surface JSON parse errors: they can include part of the secret token.
    throw new Error(
      "Cannot read a valid private client configuration. Check the file path, private permissions (chmod 600), loopback URL, and token.",
    );
  }
}

// Keep basic Markdown formatting, but make all image/link/HTML syntax inert.
// Entities are not parsed again as Markdown; even reference images cannot fetch a URL.
export function safeMarkdown(text: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "!": "&#33;",
    "[": "&#91;",
    "]": "&#93;",
    "<": "&lt;",
    ">": "&gt;",
    ":": "&#58;",
    "\\": "&#92;",
  };
  return text.replace(/[&![\]<>:\\]/g, (char) => entities[char]!);
}

export function remotePrompt(name: string, url: string, code: string, adapter: "claude" | "codex" = "claude"): string {
  localUrl(url);
  if (!/^ARGO-[a-f0-9]{32}$/.test(code)) throw new Error("Invalid pairing code");
  if (adapter === "codex")
    return `Read https://github.com/MatrixA/argo/blob/v0.1.4/docs/connect-codex.md and follow it to connect THIS existing Codex session to Argo, not a subagent or a new model.
Bridge address reachable FROM THIS AGENT MACHINE: ${url}
Display name: ${JSON.stringify(name)}
One-time pairing code: ${code}
First verify this session supplies authoritative CODEX_THREAD_ID and the existing shared App Server supports app-server proxy. If unavailable, stop and report the exact missing prerequisite. Do not guess from history, restart Codex, start a new daemon/thread, use codex exec/resume, or change sandbox/approval policy to fake attachment.
Install pinned v0.1.4 with --agent codex. Claim the single-use code via stdin. Never read or print the resulting durable credential. Use the existing transport and this exact bridge address. Do not change SSH tunnels or global settings.
Run the installed connector with its private credential file and this exact loaded thread. Keep only this connector alive using the session's supported background execution. Report ready only after authenticated registration. Native populated-session rejoin is experimental; on failure report it without falling back to another session.`;
  return `Read https://github.com/MatrixA/argo/blob/v0.1.4/docs/connect.md and follow it to install Argo and bind THIS existing Claude session, not a subagent or a new model.
Bridge address reachable FROM THIS AGENT MACHINE: ${url}
Display name: ${JSON.stringify(name)}
One-time pairing code: ${code}
Keep the code out of command-line arguments and logs. Use the claim command through stdin. Do not read or print the resulting credential.
The supplied address is already reachable through the user's existing transport, or directly on the same machine. This overrides the old document's Mac/reverse-tunnel prerequisite: neither a remote machine nor SSH -R is required. Use this exact bridge address for install and claim.
Do not create or change SSH tunnels, bridge placement, global settings, or permission policies.
I understand this is a pull-mode handoff: waiting occupies this session's current turn, existing background processes continue, and tool approvals stay in the original terminal. After attaching, start the receive/reply loop here.`;
}

export class HubError extends Error {
  constructor(public status: number) {
    super(
      status === 401 || status === 403
        ? "Hub authentication failed. Check the private client configuration."
        : status === 404
          ? "This session or request is no longer available."
          : status === 409
            ? "Session changed or request expired. Refresh before trying again."
            : `Hub request failed (HTTP ${status}).`,
    );
  }
}

/** Standard SSE framing, including CRLF, comments, multiline data, and chunk boundaries. */
export async function consumeEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: BridgeEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  let eventId = "";
  function line(value: string) {
    if (value === "") {
      if (data.length) {
        const event = JSON.parse(data.join("\n")) as BridgeEvent;
        if (
          !Number.isSafeInteger(event.cursor) ||
          event.cursor < 0 ||
          String(event.cursor) !== eventId ||
          typeof event.bindingId !== "string" ||
          typeof event.type !== "string" ||
          typeof event.createdAt !== "number"
        ) {
          throw new Error("Invalid hub event");
        }
        onEvent(event);
      }
      data = [];
      return;
    }
    if (value.startsWith(":")) return;
    const colon = value.indexOf(":");
    const field = colon < 0 ? value : value.slice(0, colon);
    const content = colon < 0 ? "" : value.slice(colon + 1).replace(/^ /, "");
    if (field === "data") data.push(content);
    if (field === "id") eventId = content;
  }
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length + data.join("").length > 1_000_000) throw new Error("Hub event too large");
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, newline).replace(/\r$/, ""));
        buffer = buffer.slice(newline + 1);
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

// The reviewed parameters and authority epoch never change underneath an open review.
export function interactionIssue(
  snapshot: Snapshot,
  generation: string,
  reviewed: Interaction,
  now?: number,
): string | undefined {
  if (snapshot.session.generation !== generation || snapshot.session.revoked)
    return "Agent session changed. Return to the conversation and open the new request.";
  if (!snapshot.session.online || !["ready", "busy", "waiting"].includes(snapshot.session.status))
    return "Agent is offline or not ready. Reconnect before reviewing this request.";
  const fresh = snapshot.interactions.find((item) => item.requestId === reviewed.requestId);
  if (!fresh) return "This request is no longer available. Check the original Agent.";
  if (fresh.state === "submitted")
    return "Decision already submitted. Waiting for the original Agent; do not submit again.";
  if (fresh.state === "resolved") return "This request was already handled in the original Agent or another client.";
  if (fresh.state === "expired") return "This request expired. Ask the original Agent for a new request.";
  if (
    fresh.kind !== reviewed.kind ||
    fresh.title !== reviewed.title ||
    fresh.detail !== reviewed.detail ||
    fresh.expiresAt !== reviewed.expiresAt ||
    JSON.stringify(fresh.questions) !== JSON.stringify(reviewed.questions)
  )
    return "Request parameters changed. Return to the conversation and review the updated request.";
  if (now === undefined) return "Cannot verify bridge time. Refresh the connection before approving.";
  if (fresh.expiresAt <= now) return "This request expired. Ask the original Agent for a new request.";
  if (fresh.kind === "approval" ? !snapshot.session.capabilities.approvals : !snapshot.session.capabilities.questions)
    return "This Agent does not support this interaction. Use its original terminal.";
}

export class Hub {
  private controller = new AbortController();
  private clock?: { server: number; received: number };
  now(): number | undefined {
    return this.clock ? this.clock.server + performance.now() - this.clock.received : undefined;
  }
  constructor(private config: ClientConfig) {
    this.config = parseConfig(config);
  }
  close() {
    this.controller.abort();
  }

  private async fetch<T>(
    path: string,
    options: RequestInit,
    consume: (response: Response) => Promise<T>,
    timeout = 12_000,
  ): Promise<T> {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    this.controller.signal.addEventListener("abort", cancel, { once: true });
    if (this.controller.signal.aborted) controller.abort();
    const timer = setTimeout(cancel, timeout);
    try {
      const started = performance.now();
      const response = await fetch(new URL(path, this.config.url), {
        ...options,
        signal: controller.signal,
        redirect: "error",
        headers: { Authorization: `Bearer ${this.config.token}`, ...options.headers },
      });
      // Node's bridge already sends HTTP Date. Use its clock, not the Mac wall clock.
      const serverTime = Date.parse(response.headers.get("date") || "");
      const received = performance.now();
      this.clock = Number.isFinite(serverTime)
        ? { server: Math.max(serverTime + 1000 + received - started, this.now() ?? 0), received }
        : undefined;
      if (!response.ok) {
        await response.body?.cancel();
        throw new HubError(response.status);
      }
      return await consume(response);
    } finally {
      clearTimeout(timer);
      controller.abort();
      this.controller.signal.removeEventListener("abort", cancel);
    }
  }

  private json<T>(path: string): Promise<T> {
    return this.fetch(path, {}, (response) => response.json() as Promise<T>);
  }
  async sessions() {
    const result = await this.json<{ sessions: Session[]; cursor: number }>("/v1/sessions");
    if (!Array.isArray(result.sessions) || !Number.isSafeInteger(result.cursor) || result.cursor < 0)
      throw new Error("This endpoint did not return an Argo bridge response.");
    return result;
  }
  snapshot(bindingId: string, before?: number) {
    return this.json<Snapshot>(
      `/v1/sessions/${encodeURIComponent(bindingId)}${before === undefined ? "" : `?before=${before}`}`,
    );
  }
  async answerInteraction(bindingId: string, generation: string, reviewed: Interaction, answer: Answer): Promise<void> {
    const check = (snapshot: Snapshot) => interactionIssue(snapshot, generation, reviewed, this.now());
    const issue = check(await this.snapshot(bindingId));
    if (issue) {
      const error = new HubError(409);
      error.message = issue;
      throw error;
    }
    try {
      await this.mutate(bindingId, `/interactions/${encodeURIComponent(reviewed.requestId)}`, {
        generation,
        ...answer,
      });
    } catch (cause) {
      if (cause instanceof HubError && cause.status === 409) {
        let reason: string | undefined;
        try {
          reason = check(await this.snapshot(bindingId));
        } catch {
          /* No retry of an uncertain decision. */
        }
        cause.message =
          reason || "The Agent rejected this decision because the request changed. Refresh and review it again.";
      }
      throw cause;
    }
  }
  createPairing(name: string, adapter: "claude" | "codex" = "claude"): Promise<Pairing> {
    return this.fetch(
      "/v1/pairings",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, adapter }) },
      async (response) => {
        const result = (await response.json()) as Pairing;
        if (!/^ARGO-[a-f0-9]{32}$/.test(result.code) || !Number.isSafeInteger(result.expiresAt))
          throw new Error("Invalid pairing response");
        return result;
      },
    );
  }
  async cancelPairing(code: string): Promise<void> {
    await this.fetch(
      "/v1/pairings",
      { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) },
      async (response) => {
        await response.body?.cancel();
      },
    );
  }
  async mutate(bindingId: string, suffix: string, body?: object, method = "POST"): Promise<void> {
    await this.fetch(
      `/v1/sessions/${encodeURIComponent(bindingId)}${suffix}`,
      {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      },
      async (response) => {
        await response.body?.cancel();
      },
    );
  }

  async watch(
    cursor: number,
    signal: AbortSignal,
    onEvent: (event: BridgeEvent) => void,
    reset: () => Promise<number>,
    status: (connection: Connection) => void,
  ): Promise<void> {
    const stop = () => this.close();
    signal.addEventListener("abort", stop, { once: true });
    let reconnect = false;
    try {
      while (!signal.aborted) {
        status("connecting");
        try {
          // Event cursors acknowledge invalidations, not successful UI refreshes.
          if (reconnect) cursor = await reset();
          if (signal.aborted) break;
          reconnect = true;
          await this.fetch(
            `/v1/events?after=${cursor}`,
            { headers: { Accept: "text/event-stream" } },
            async (response) => {
              if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream"))
                throw new Error("Invalid event stream");
              status("live");
              await consumeEvents(response.body, (event) => {
                if (event.cursor <= cursor) return;
                cursor = event.cursor;
                onEvent(event);
              });
            },
            60_000,
          );
          if (!signal.aborted) status("offline");
        } catch (error) {
          if (signal.aborted) break;
          if (error instanceof HubError && error.status === 409) {
            try {
              cursor = await reset();
              reconnect = false;
              continue;
            } catch {
              /* Retry below; no stale cursor assumed valid. */
            }
          }
          status("offline");
        }
        if (!signal.aborted) {
          await new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer);
              signal.removeEventListener("abort", finish);
              resolve();
            };
            const timer = setTimeout(finish, 2_000);
            signal.addEventListener("abort", finish, { once: true });
            if (signal.aborted) finish();
          });
        }
      }
    } finally {
      signal.removeEventListener("abort", stop);
    }
  }
}
