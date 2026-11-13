import { Command, Failure, SavedState, StateStore, colourHex, validCommand } from "./luxafor-state";

export const REQUEST_TIMEOUT_MS = 10_000;
export const RECOVERY = "Check your User ID, Luxafor app and Webhook mode, device connection and internet access.";
export type Result = { ok: true; persisted: boolean } | { ok: false; reason: Failure; uncertain: boolean };
export type Transport = (url: string, init: RequestInit) => Promise<Pick<Response, "status" | "json">>;
export type RequestGuard = (onLost: () => void) => Promise<() => Promise<void>>;
export class BusyError extends Error {}
export type Config = { userId: string; apiEndpoint: string };

export function resultMessage(result: Result): string {
  if (result.ok)
    return result.persisted
      ? "Request accepted by API; physical state unknown."
      : "API accepted the request, but history could not be saved. Check the light before resending.";
  if (result.reason === "busy")
    return "Another request is in progress. Wait, then refresh history; nothing was queued.";
  if (result.reason === "storage") return "History is unavailable. No request was sent. Try reopening the command.";
  if (result.reason === "configuration")
    return "Check your User ID and API endpoint in extension preferences. No request was sent.";
  const cause = {
    http: "HTTP error",
    application: "API reported an error",
    response: "Unexpected API response",
    timeout: "Request timed out",
    network: "Network failure",
    cancelled: "Request canceled",
  }[result.reason];
  return `${cause}. ${result.uncertain ? "Delivery is uncertain; check the light before resending. " : ""}${RECOVERY}`;
}

// The vendor documents HTTP 200 and JSON, but no field-level success/error schema.
// Reject explicit error indicators defensively; never display or persist response bodies.
export function classifyResponse(status: number, body: unknown): "accepted" | "http" | "application" | "response" {
  if (status !== 200) return "http";
  if (!body || typeof body !== "object" || Array.isArray(body)) return "response";
  const data = body as Record<string, unknown>;
  const hasError = (value: unknown) =>
    value != null && value !== false && value !== "" && (!Array.isArray(value) || value.length > 0);
  if (
    data.success === false ||
    hasError(data.error) ||
    hasError(data.errors) ||
    ["error", "failed", "failure"].includes(String(data.status).toLowerCase())
  )
    return "application";
  return "accepted";
}

export class LuxaforService {
  private active = false;
  constructor(
    private readonly config: Config,
    private readonly store: StateStore,
    private readonly transport: Transport,
    private readonly guard: RequestGuard,
    private readonly now = Date.now,
  ) {
    this.config = { userId: config.userId, apiEndpoint: config.apiEndpoint };
  }

  // Read-only: safe on command launch, menu refresh, and after any request.
  read(): Promise<SavedState> {
    return this.store.read();
  }

  async send(command: Command, signal?: AbortSignal): Promise<Result> {
    if (!validCommand(command) || !this.config.userId.trim() || !["com", "co.uk"].includes(this.config.apiEndpoint))
      return { ok: false, reason: "configuration", uncertain: false };
    command = { kind: command.kind, colour: command.colour };
    if (signal?.aborted) return { ok: false, reason: "cancelled", uncertain: false };
    if (this.active) return { ok: false, reason: "busy", uncertain: false };
    this.active = true;
    const controller = new AbortController();
    let release: (() => Promise<void>) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let sent = false;
    let state: SavedState | undefined;
    let accepted = false;
    let lost = false;
    let deadline = Infinity;
    const checkDeadline = () => {
      if (this.now() >= deadline) {
        timedOut = true;
        controller.abort();
      }
      if (controller.signal.aborted) throw new Error("aborted");
    };
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      release = await this.guard(() => {
        lost = true;
        abort();
      });
      const startedAt = this.now();
      deadline = startedAt + REQUEST_TIMEOUT_MS;
      timer = setTimeout(() => {
        timedOut = true;
        abort();
      }, REQUEST_TIMEOUT_MS);
      state = await this.store.read();
      checkDeadline();
      state = { ...state, attempt: { command, startedAt, outcome: "pending" } };
      await this.store.write(state); // If persistence fails, do not send a side effect.
      checkDeadline();
      const aborted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
      const fields =
        command.colour === "off" ||
        !["red", "green", "blue", "white", "yellow", "cyan", "magenta"].includes(command.colour)
          ? { color: "custom", custom_color: colourHex(command.colour) }
          : { color: command.colour };
      sent = true;
      const response = await Promise.race([
        this.transport(
          `https://api.luxafor.${this.config.apiEndpoint}/webhook/v1/actions/${command.kind === "blink" ? "blink" : "solid_color"}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            redirect: "error",
            body: JSON.stringify({ userId: this.config.userId.trim(), actionFields: fields }),
            signal: controller.signal,
          },
        ),
        aborted,
      ]);
      let outcome: ReturnType<typeof classifyResponse> = "http";
      if (response.status === 200) {
        try {
          outcome = classifyResponse(response.status, await Promise.race([response.json(), aborted]));
        } catch {
          if (controller.signal.aborted) throw new Error("aborted");
          outcome = "response";
        }
      }
      checkDeadline();
      const finishedAt = this.now();
      accepted = outcome === "accepted";
      const result: Result = accepted
        ? { ok: true, persisted: true }
        : { ok: false, reason: outcome as Failure, uncertain: outcome !== "application" };
      const next: SavedState = {
        ...state,
        attempt: {
          command,
          startedAt,
          finishedAt,
          outcome: accepted ? "accepted" : outcome === "application" ? "failed" : "uncertain",
          ...(accepted ? {} : { reason: outcome as Failure }),
        },
      };
      if (accepted) {
        next.accepted = { command, acceptedAt: finishedAt };
        if (command.kind === "solid")
          next.recent = [...new Set([colourHex(command.colour), ...state.recent])].slice(0, 5);
      }
      await this.store.write(next);
      return result;
    } catch (error) {
      if (accepted) return { ok: true, persisted: false };
      const reason: Failure =
        error instanceof BusyError
          ? "busy"
          : timedOut
            ? "timeout"
            : controller.signal.aborted
              ? "cancelled"
              : !sent
                ? "storage"
                : "network";
      if (sent && state?.attempt && !lost && this.now() < deadline + REQUEST_TIMEOUT_MS) {
        try {
          await this.store.write({
            ...state,
            attempt: { ...state.attempt, finishedAt: this.now(), outcome: "uncertain", reason },
          });
        } catch {
          /* The pending record remains uncertain after interruption; never manufacture acceptance. */
        }
      }
      return { ok: false, reason, uncertain: sent };
    } finally {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      try {
        await release?.();
      } catch {
        /* A lost lease must never remove another command's lock. */
      }
      this.active = false;
    }
  }

  async clearRecent(forgetLegacy = false): Promise<void> {
    let lost = false;
    const release = await this.guard(() => {
      lost = true;
    });
    const deadline = this.now() + REQUEST_TIMEOUT_MS;
    try {
      const state = await this.store.read();
      if (lost || this.now() >= deadline) throw new Error("History update interrupted");
      await this.store.write(forgetLegacy ? { ...state, legacyColour: undefined } : { ...state, recent: [] });
    } finally {
      await release();
    }
  }
}

export async function confirmRedTest(
  confirm: () => Promise<boolean>,
  send: () => Promise<Result>,
): Promise<Result | undefined> {
  if (!(await confirm())) return undefined;
  return send();
}
