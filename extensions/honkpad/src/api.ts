import { getPreferenceValues } from "@raycast/api";

export interface Meme {
  id: string;
  name: string;
  emoji: string;
  color: string;
  tags: string[];
  hasSound: boolean;
  hasVisual: boolean;
}

/** Thrown for anything the user can fix: Honkpad closed, wrong token, wrong port. */
export class HonkpadError extends Error {
  constructor(
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}

const DEFAULT_PORT = 7840;

function baseUrl(): string {
  const { port } = getPreferenceValues<Preferences>();
  const trimmed = port?.trim();
  if (!trimmed) return `http://127.0.0.1:${DEFAULT_PORT}`;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new HonkpadError("Invalid port", `"${trimmed}" is not a port number. Fix it in the extension preferences.`);
  }
  return `http://127.0.0.1:${n}`;
}

async function call<T>(path: string): Promise<T> {
  const { token } = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {};
  if (token?.trim()) headers["X-Pling-Token"] = token.trim();

  let response: Response;
  try {
    response = await fetch(baseUrl() + path, { headers });
  } catch (error) {
    if (error instanceof HonkpadError) throw error;
    throw new HonkpadError("Honkpad isn't running", "Open Honkpad and try again.");
  }

  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (response.ok && body) return body;

  const reason = body?.error ?? `HTTP ${response.status}`;
  switch (response.status) {
    case 401:
      throw new HonkpadError("Wrong API token", "Copy the token again from Honkpad and update the preferences.");
    case 402:
      throw new HonkpadError("Update Honkpad", "This version of Honkpad doesn't allow it. Install the latest one.");
    case 404:
      throw new HonkpadError("Not found", reason);
    default:
      throw new HonkpadError("Honkpad said no", reason);
  }
}

export function listMemes(): Promise<Meme[]> {
  return call<Meme[]>("/api/items");
}

/** Returns Honkpad's outcome: played, queued, cooldown, dropped, blocked, offline or error. */
export async function playMeme(id: string): Promise<string> {
  const { outcome } = await call<{ outcome: string }>(`/api/play/${encodeURIComponent(id)}`);
  return outcome;
}

export async function playRandom(): Promise<string> {
  const { outcome } = await call<{ outcome: string }>("/api/random");
  return outcome;
}

/** Stops all sound. Honkpad also pauses tip alerts; returns whether they are paused now. */
export async function stopSound(): Promise<boolean> {
  const { tipsPaused } = await call<{ tipsPaused?: boolean }>("/api/stop");
  return tipsPaused === true;
}

/** Short HUD text for a play outcome. */
export function describeOutcome(outcome: string, name?: string): string {
  const what = name ? `“${name}”` : "Meme";
  switch (outcome) {
    case "played":
      return `Playing ${what}`;
    case "queued":
      return `${what} queued`;
    case "cooldown":
      return `${what} is on cooldown`;
    case "dropped":
      return `${what} was dropped`;
    case "blocked":
      return `${what} was blocked by Honkpad`;
    case "offline":
      return `${what} needs the overlay, and no overlay is connected`;
    default:
      return `${what}: ${outcome}`;
  }
}

/** Shows a no-view command error as a failure toast-friendly pair. */
export function errorText(error: unknown): { title: string; message?: string } {
  if (error instanceof HonkpadError) return { title: error.title, message: error.message };
  return { title: "Something went wrong", message: error instanceof Error ? error.message : String(error) };
}
