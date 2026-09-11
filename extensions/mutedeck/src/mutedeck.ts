import { getPreferenceValues } from "@raycast/api";

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
  wsEndpoint?: string;
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

function apiBase(): string {
  const prefs = getPreferences();
  return (prefs.apiEndpoint?.trim() || "http://localhost:3491").replace(/\/+$/, "");
}

function wsEndpoint(): string {
  const prefs = getPreferences();
  return prefs.wsEndpoint?.trim() || "ws://localhost:3492";
}

async function request(path: string, method: "GET" | "POST"): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { method, signal: AbortSignal.timeout(3000) });
  } catch {
    throw new MuteDeckOffline();
  }
  if (!res.ok) {
    throw new Error(`MuteDeck API error (HTTP ${res.status})`);
  }
  return res;
}

export async function getStatus(): Promise<MuteDeckStatus> {
  const res = await request("/v1/status", "GET");
  const data = (await res.json()) as Record<string, unknown>;
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
  await request(`/v1/${what}`, "POST");
}

export async function leaveMeeting(): Promise<void> {
  await request("/v1/leave", "POST");
}

/** True while the user is sharing their screen or recording. */
export function isPresenting(status: MuteDeckStatus): boolean {
  return status.share === "active" || status.record === "active";
}

/**
 * Bring the call window to the front. This action only exists on MuteDeck's
 * WebSocket API, so open a one-shot connection: identify, send, close.
 * MuteDeck drops messages whose `source` isn't a known plugin value.
 */
export function bringToFront(): Promise<void> {
  // Raycast's extension runtime is Node.js 22, which ships a native global
  // WebSocket client. The guard keeps the failure explicit should the
  // runtime ever change.
  if (typeof WebSocket === "undefined") {
    return Promise.reject(new Error("WebSocket is not available in this runtime"));
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsEndpoint());
    const fail = () => {
      clearTimeout(timer);
      reject(new MuteDeckOffline());
    };
    const timer = setTimeout(() => {
      ws.close();
      fail();
    }, 3000);
    ws.onerror = fail;
    ws.onopen = () => {
      ws.send(JSON.stringify({ source: "plugin", action: "identify", identifier: "Raycast" }));
      ws.send(JSON.stringify({ source: "plugin", action: "bring-to-front" }));
      clearTimeout(timer);
      // Give MuteDeck a moment to read the messages before closing.
      setTimeout(() => {
        ws.close();
        resolve();
      }, 200);
    };
  });
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
