import { LocalStorage, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import {
  type FetchLike,
  HttpError,
  MuteDeckHttpClient,
  NotAuthenticatedError,
  PairingDeniedError,
  PairingRequiredError,
  fromAsyncStringStorage,
} from "@mutedeck/plugin-client";
import { raycastHostInfo } from "@mutedeck/plugin-client/hosts/raycast";

/** MuteDeck reports each capability as one of these string values. */
export type StateValue = "active" | "inactive" | "disabled" | "";

export interface MuteDeckStatus {
  call: StateValue;
  control: string;
  mute: StateValue;
  video: StateValue;
  share: StateValue;
  record: StateValue;
  version?: string;
}

export type Toggleable = "mute" | "video" | "share" | "record";

export interface MuteDeckPreferences {
  apiEndpoint?: string;
  confirmMuteInPresentation: boolean;
  confirmVideoInPresentation: boolean;
  confirmLeave: boolean;
}

export const getPreferences = getPreferenceValues<MuteDeckPreferences>;

/** Thrown when MuteDeck's local API can't be reached at all. */
export class MuteDeckOffline extends Error {
  constructor() {
    super("MuteDeck isn't running");
  }
}

/** Thrown when MuteDeck hasn't approved Raycast: denied, expired or busy. */
export class MuteDeckNotPaired extends Error {
  constructor(message = "Raycast isn't approved in MuteDeck") {
    super(message);
  }
}

const DEFAULT_API_ENDPOINT = "http://localhost:3491";
const REQUEST_TIMEOUT_MS = 3000;
/** Wait at least this long after a denial before prompting again on our own. */
const DENIED_RETRY_MIN_MS = 30_000;

function apiEndpoint(): {
  scheme: "http" | "https";
  host: string;
  port: number;
} {
  const prefs = getPreferences();
  const raw = prefs.apiEndpoint?.trim() || DEFAULT_API_ENDPOINT;
  try {
    const url = new URL(raw);
    const scheme = url.protocol === "https:" ? "https" : "http";
    const port = url.port ? Number(url.port) : scheme === "https" ? 443 : 80;
    // URL keeps IPv6 hosts in brackets, which is what the SDK needs in its URL.
    return { scheme, host: url.hostname || "127.0.0.1", port };
  } catch {
    return { scheme: "http", host: "127.0.0.1", port: 3491 };
  }
}

/**
 * Global `fetch` with a per-request timeout. Connection failures become
 * {@link MuteDeckOffline}, so callers can tell "not running" from API errors.
 * The SDK passes its own signal only while pairing; the timeout applies to
 * each request (each pairing poll included), not to the whole wait.
 */
const fetchWithTimeout: FetchLike = async (url, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    return await fetch(url, { ...init, signal });
  } catch (e) {
    if (init.signal?.aborted) {
      throw e;
    }
    throw new MuteDeckOffline();
  }
};

let client: MuteDeckHttpClient | undefined;

/** One SDK client per command process; it remembers an old (v1) MuteDeck. */
function mutedeck(): MuteDeckHttpClient {
  if (!client) {
    const { scheme, host, port } = apiEndpoint();
    client = new MuteDeckHttpClient({
      client: {
        id: "raycast",
        name: "Raycast",
        ...raycastHostInfo(environment, process.platform),
      },
      scheme,
      host,
      port,
      fetch: fetchWithTimeout,
      // Token and instance id, kept in the extension's Raycast LocalStorage.
      tokenStore: fromAsyncStringStorage(
        (k) => LocalStorage.getItem<string>(k),
        (k, v) => LocalStorage.setItem(k, v),
        (k) => LocalStorage.removeItem(k),
      ),
    });
  }
  return client;
}

let pairing: Promise<void> | undefined;

/**
 * Raycast runs every command in its own process, so a denial's wait is kept
 * in LocalStorage: otherwise each new command would prompt again right away.
 */
const PAIRING_BLOCKED_KEY = "mutedeck.pairingBlockedUntil";

async function pairingBlockedUntil(): Promise<number> {
  return Number((await LocalStorage.getItem<string>(PAIRING_BLOCKED_KEY)) ?? 0);
}

/**
 * Ask MuteDeck to approve Raycast and wait for the user's answer, with a toast
 * while it's pending. Concurrent callers (the Meeting Deck polls every second)
 * share one request. After a denial we don't prompt again on our own until
 * the server's `retry_after` (at least 30 s) has passed; {@link pairNow} skips
 * that wait when the user asks for it. On an old MuteDeck, which has no
 * pairing, this resolves without a token and without a toast.
 */
async function ensurePaired(): Promise<void> {
  if (Date.now() < (await pairingBlockedUntil())) {
    throw new MuteDeckNotPaired();
  }
  if (!pairing) {
    pairing = runPairing().finally(() => {
      pairing = undefined;
    });
  }
  return pairing;
}

async function runPairing(): Promise<void> {
  // Created only once MuteDeck shows its prompt, so an old MuteDeck (and an
  // already-paired Raycast) never flashes a toast.
  let toast: Toast | undefined;
  try {
    await mutedeck().ensurePaired({
      onPending: async () => {
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Approve Raycast in MuteDeck…",
          message: "MuteDeck is asking whether to allow Raycast.",
        });
      },
    });
    if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Raycast is connected to MuteDeck";
      toast.message = undefined;
    }
  } catch (e) {
    if (e instanceof MuteDeckOffline) {
      await toast?.hide();
      throw e;
    }
    if (e instanceof PairingDeniedError) {
      const wait = Math.max(DENIED_RETRY_MIN_MS, (e.retryAfter ?? 0) * 1000);
      await LocalStorage.setItem(PAIRING_BLOCKED_KEY, String(Date.now() + wait));
      const title =
        e.reason === "expired"
          ? "MuteDeck approval timed out"
          : e.reason === "busy"
            ? "MuteDeck is busy with another approval"
            : "MuteDeck didn't allow Raycast";
      await showToast({
        style: Toast.Style.Failure,
        title,
        message: "Run the command again to retry.",
      });
      throw new MuteDeckNotPaired(title);
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't connect to MuteDeck",
      message: e instanceof Error ? e.message : undefined,
    });
    throw describe(e);
  }
}

/** Ask for approval now, even right after a denial (an explicit user action). */
export async function pairNow(): Promise<void> {
  await LocalStorage.removeItem(PAIRING_BLOCKED_KEY);
  await ensurePaired();
}

/**
 * Run an SDK call against MuteDeck's /v1 API.
 *
 * Without a token, Raycast asks once to be approved, even when MuteDeck
 * would still accept calls without one: that is what moves it off the
 * unauthenticated path. If that doesn't work out (denied, or an old MuteDeck
 * without pairing), the call goes ahead without a token, which MuteDeck
 * accepts unless it is set to require one. When MuteDeck does require a
 * token, or rejects ours (revoked), pair and try once more.
 */
async function authed<T>(call: (md: MuteDeckHttpClient) => Promise<T>): Promise<T> {
  const md = mutedeck();
  if (!(await md.hasToken())) {
    try {
      await ensurePaired();
    } catch (e) {
      if (e instanceof MuteDeckOffline) {
        throw e;
      }
      // Not approved (yet): MuteDeck may still accept the call without one.
    }
  }
  try {
    return await call(md);
  } catch (e) {
    if (!(e instanceof PairingRequiredError)) {
      throw describe(e);
    }
  }
  await ensurePaired();
  try {
    return await call(md);
  } catch (e) {
    if (e instanceof NotAuthenticatedError) {
      throw new MuteDeckNotPaired("MuteDeck rejected Raycast's token");
    }
    if (e instanceof PairingRequiredError) {
      throw new MuteDeckNotPaired("MuteDeck requires Raycast to be approved");
    }
    throw describe(e);
  }
}

function describe(e: unknown): unknown {
  if (e instanceof HttpError) {
    return new Error(`MuteDeck API error (HTTP ${e.status})`);
  }
  return e;
}

export async function getStatus(): Promise<MuteDeckStatus> {
  const data = (await authed((md) => md.getStatus())) as unknown as Record<string, unknown>;
  const state = (v: unknown): StateValue => (v === "active" || v === "inactive" || v === "disabled" ? v : "");
  return {
    call: state(data.call),
    control: typeof data.control === "string" ? data.control : "",
    mute: state(data.mute),
    video: state(data.video),
    share: state(data.share),
    record: state(data.record),
    version: typeof data.version === "string" ? data.version : undefined,
  };
}

export async function toggle(what: Toggleable): Promise<void> {
  await authed((md) => {
    switch (what) {
      case "mute":
        return md.mute();
      case "video":
        return md.video();
      case "share":
        return md.share();
      case "record":
        return md.record();
    }
  });
}

export async function leaveMeeting(): Promise<void> {
  await authed((md) => md.leave());
}

/** True while the user is sharing their screen or recording. */
export function isPresenting(status: MuteDeckStatus): boolean {
  return status.share === "active" || status.record === "active";
}

/** Bring the call window to the front (`POST /v1/bring-to-front`). */
export async function bringToFront(): Promise<void> {
  await authed((md) => md.bringToFront());
}

/** Human name of the platform currently controlled by MuteDeck. */
export function controlLabel(control: string): string {
  const names: Record<string, string> = {
    system: "System",
    zoom: "Zoom",
    teams: "Microsoft Teams",
    meet: "Google Meet",
    "google-meet": "Google Meet",
    webex: "Webex",
  };
  return names[control] ?? (control ? control.charAt(0).toUpperCase() + control.slice(1) : "Unknown");
}

export function muteLabel(v: StateValue): string {
  if (v === "active") return "Muted";
  if (v === "inactive") return "Unmuted";
  if (v === "disabled") return "No mic";
  return "Unknown";
}

export function onOffLabel(v: StateValue): string {
  if (v === "active") return "On";
  if (v === "inactive") return "Off";
  if (v === "disabled") return "Disabled";
  return "Unknown";
}
