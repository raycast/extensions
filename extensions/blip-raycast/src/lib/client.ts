/**
 * Talks to Blip's local engine. Two calls exist:
 *   GetState(last_rcvd?) → whole app state (long-polls until it changes when last_rcvd is set)
 *   Dispatch(Any event)  → performs an action
 */
import { createConnection } from "node:net";
import { DrpcError, unaryCall } from "./drpc";
import { isMac, isWindows, launchBlipInBackground, resolveEndpoint } from "./endpoint";
import { windowsIsListening, windowsUnaryCall } from "./windows-transport";
import { EXPECTED_STATE_VERSION, decode, encode, encodeEvent } from "./schema";
import type { BlipState } from "./types";

export class BlipNotRunningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlipNotRunningError";
  }
}

export class BlipNotInstalledError extends Error {
  constructor() {
    super("Install Blip, sign in, then try again.");
    this.name = "BlipNotInstalledError";
  }
}

export class BlipNotSignedInError extends Error {
  constructor() {
    super("Open Blip and sign in.");
    this.name = "BlipNotSignedInError";
  }
}

export class BlipIncompatibleError extends Error {
  constructor(detail: string) {
    super(`Blip was updated and this extension needs an update too (${detail}).`);
    this.name = "BlipIncompatibleError";
  }
}

export interface StateSnapshot {
  id: string;
  state: BlipState;
}

const CALL_TIMEOUT_MS = 5000;

/** Nothing was sent: Blip isn't listening. Safe to start Blip and retry, even for Dispatch. */
function isNotListening(error: unknown) {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOENT" || code === "ECONNREFUSED";
}

function asIncompatible(error: unknown): Error {
  if (error instanceof DrpcError && /unknown rpc|unknown method|proto:/i.test(error.message)) {
    return new BlipIncompatibleError(error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** A message fit for people: protocol-level failures become "Blip isn't responding". */
export function userMessage(error: unknown): string {
  if (error instanceof DrpcError) return "Blip isn't responding. Try again in a moment, or quit and reopen Blip.";
  return error instanceof Error ? error.message : String(error);
}

/** A few words for a HUD, where long messages get cut off. */
export function shortReason(error: unknown): string {
  if (error instanceof BlipNotInstalledError) return "Blip isn't installed";
  if (error instanceof BlipNotSignedInError) return "sign in to Blip";
  if (error instanceof BlipNotRunningError) return "Blip isn't running";
  if (error instanceof BlipIncompatibleError) return "this Blip version isn't supported yet";
  if (error instanceof DrpcError) return "Blip isn't responding";
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Not found:")) return "file not found";
  return message.length > 60 ? `${message.slice(0, 59)}…` : message;
}

let launchListener: (() => void) | undefined;

/**
 * Lets a view say "Starting Blip…" while the client starts Blip in the background.
 * Returns a function that restores the previous listener, so nested views don't clobber each other.
 */
export function setLaunchListener(listener: (() => void) | undefined) {
  const previous = launchListener;
  launchListener = listener;
  return () => {
    launchListener = previous;
  };
}

const LAUNCH_WAIT_MS = 15000;
const LAUNCH_POLL_MS = 500;

export class BlipClient {
  /** Once Blip has answered, it is never started again by this client: quitting Blip is respected. */
  private connectedOnce = false;
  /**
   * The one automatic launch, shared by concurrent calls. If it fails, later calls rethrow its error
   * instead of launching again (no relaunch loop). If the user opens Blip themselves, the plain
   * connection succeeds before this is consulted, so the extension recovers on its own.
   */
  private launching?: Promise<void>;

  constructor(
    private readonly options: {
      /** Socket path to use instead of Blip's (for tests). */
      endpoint?: string;
      /** How to start Blip (replaceable for tests). */
      launch?: () => Promise<void>;
    } = {},
  ) {}

  private endpoint() {
    const path = resolveEndpoint(this.options.endpoint);
    if (!path) throw new BlipNotRunningError("Blip isn't supported on this platform.");
    return path;
  }

  /** One request/response with Blip. On Windows the socket is opened by the Rust helper. */
  private exchange(method: string, request: Uint8Array, timeoutMs: number, signal?: AbortSignal) {
    const path = this.endpoint();
    if (isWindows && !this.options.endpoint) return windowsUnaryCall(path, method, request, { timeoutMs, signal });
    return unaryCall(() => createConnection({ path }), method, request, { timeoutMs, signal });
  }

  private async call(method: string, request: Uint8Array, timeoutMs: number, signal?: AbortSignal) {
    try {
      const response = await this.exchange(method, request, timeoutMs, signal);
      this.connectedOnce = true;
      return response;
    } catch (error) {
      if (!isNotListening(error)) throw asIncompatible(error);
    }
    const canLaunch = Boolean(this.options.launch) || isMac || isWindows;
    if (!canLaunch || this.connectedOnce) {
      throw new BlipNotRunningError("Blip isn't running. Open Blip to continue.");
    }
    this.launching ??= this.launchAndWait();
    await this.launching;
    try {
      const response = await this.exchange(method, request, timeoutMs, signal);
      this.connectedOnce = true;
      return response;
    } catch (error) {
      throw asIncompatible(error);
    }
  }

  /** Starts Blip in the background and waits until its engine accepts connections. */
  private async launchAndWait() {
    launchListener?.();
    try {
      await (this.options.launch ?? launchBlipInBackground)();
    } catch {
      throw new BlipNotInstalledError();
    }
    const deadline = Date.now() + LAUNCH_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, LAUNCH_POLL_MS));
      if (await this.isListening()) return;
    }
    throw new BlipNotRunningError("Blip was started but didn't respond.");
  }

  /** Whether Blip accepts a connection right now. */
  private isListening() {
    const path = this.endpoint();
    if (isWindows && !this.options.endpoint) return windowsIsListening(path);
    return new Promise<boolean>((resolve) => {
      const socket = createConnection({ path });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
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
    let response: { id: string; state: Buffer };
    let state: BlipState;
    try {
      response = decode<{ id: string; state: Buffer }>("rpc.BinaryStateResponse", bytes);
      state = decode<BlipState>("frontend.State", response.state);
    } catch (error) {
      throw new BlipIncompatibleError(`unreadable state: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (state.version !== EXPECTED_STATE_VERSION) {
      throw new BlipIncompatibleError(`state version ${state.version}, expected ${EXPECTED_STATE_VERSION}`);
    }
    if (state.shutting_down) throw new BlipNotRunningError("Blip is quitting.");
    if (!state.auth?.user_id) throw new BlipNotSignedInError();
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
