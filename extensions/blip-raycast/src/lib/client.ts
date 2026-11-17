/**
 * Talks to Blip's local engine. Two calls exist:
 *   GetState(last_rcvd?) → whole app state (long-polls until it changes when last_rcvd is set)
 *   Dispatch(Any event)  → performs an action
 */
import { createConnection } from "node:net";
import { DrpcError, unaryCall } from "./drpc";
import { isMac, isWindows, launchBlipInBackground, resolveEndpoint } from "./endpoint";
import { EXPECTED_STATE_VERSION, decode, encode, encodeEvent } from "./schema";
import type { BlipState } from "./types";

export class BlipNotRunningError extends Error {
  constructor(message = "Blip isn't running, and it couldn't be started.") {
    super(message);
    this.name = "BlipNotRunningError";
  }
}

export class BlipIncompatibleError extends Error {
  constructor(detail: string) {
    super(
      `This version of Blip changed its internal interface (${detail}). Update the Blip extension, or report it so it can be updated.`,
    );
    this.name = "BlipIncompatibleError";
  }
}

export interface StateSnapshot {
  id: string;
  state: BlipState;
}

const CALL_TIMEOUT_MS = 5000;

function isConnectionError(error: unknown) {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOENT" || code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EPIPE";
}

function asIncompatible(error: unknown): Error {
  if (error instanceof DrpcError && /proto:|unknown method|not found/i.test(error.message)) {
    return new BlipIncompatibleError(error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

export class BlipClient {
  constructor(private readonly endpointOverride?: string) {}

  private connect = () => {
    const path = resolveEndpoint(this.endpointOverride);
    if (!path) throw new BlipNotRunningError("Blip isn't supported on this platform.");
    return createConnection({ path });
  };

  private async call(method: string, request: Uint8Array, timeoutMs: number, signal?: AbortSignal) {
    try {
      return await unaryCall(this.connect, method, request, { timeoutMs, signal });
    } catch (error) {
      if (!isConnectionError(error)) throw asIncompatible(error);
    }
    // Blip isn't listening: start it in the background and retry for a few seconds.
    if (!isMac && !isWindows) throw new BlipNotRunningError();
    try {
      await launchBlipInBackground();
    } catch {
      throw new BlipNotRunningError("Blip isn't running and couldn't be started. Is Blip installed?");
    }
    const deadline = Date.now() + 15000;
    let lastError: unknown;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        return await unaryCall(this.connect, method, request, { timeoutMs, signal });
      } catch (error) {
        lastError = error;
        if (!isConnectionError(error)) throw asIncompatible(error);
      }
    }
    throw new BlipNotRunningError(
      `Blip was started but didn't respond. ${lastError instanceof Error ? lastError.message : ""}`.trim(),
    );
  }

  /**
   * Returns the current state. With `lastId`, waits until the state differs from that snapshot
   * (or `timeoutMs` passes, in which case it throws a timeout DrpcError).
   */
  async getState(options: { lastId?: string; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<StateSnapshot> {
    const request = encode("rpc.StateRequest", options.lastId ? { last_rcvd: options.lastId } : {});
    const bytes = await this.call(
      "/rpc.Service/GetState",
      request,
      options.timeoutMs ?? CALL_TIMEOUT_MS,
      options.signal,
    );
    const response = decode<{ id: string; state: Buffer }>("rpc.BinaryStateResponse", bytes);
    const state = decode<BlipState>("frontend.State", response.state);
    if (state.version !== EXPECTED_STATE_VERSION) {
      throw new BlipIncompatibleError(`state version ${state.version}, expected ${EXPECTED_STATE_VERSION}`);
    }
    if (!state.auth?.user_id) {
      throw new Error("You're not signed in to Blip. Open Blip and sign in first.");
    }
    return { id: response.id, state };
  }

  async dispatch(eventName: string, payload: Record<string, unknown> = {}): Promise<void> {
    await this.call(
      "/rpc.Service/Dispatch",
      encode("rpc.DispatchRequest", { event: encodeEvent(eventName, payload) }),
      CALL_TIMEOUT_MS,
    );
  }
}

let shared: BlipClient | undefined;
export function getClient(): BlipClient {
  shared ??= new BlipClient();
  return shared;
}
