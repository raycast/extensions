// Pure version 1 contract helpers. No Raycast, process, or network dependencies.
export interface RunningApp {
  id: number | null;
  name: string | null;
}

export interface PC {
  id: string;
  name: string;
  address: string | null;
  paired: boolean;
  state: "ready" | "reachable" | "asleep" | "unknown";
  runningApp: RunningApp | null;
  default: boolean;
}

export interface App {
  id: number;
  name: string;
  hdr: boolean;
  hidden: boolean;
  running: boolean;
}

export function launcherApps(apps: App[], showHidden: boolean): App[] {
  return apps
    .filter((app) => showHidden || !app.hidden || app.running)
    .sort((a, b) => Number(b.running) - Number(a.running));
}

export interface StreamStatus {
  live: boolean;
  pc: { id: string; name: string } | null;
  app: RunningApp | null;
  resolution: { width: number; height: number } | null;
  fps: number | null;
  hdr: boolean | null;
  codec: string | null;
  bitrateMbps: number | null;
}

export class ContractError extends Error {
  constructor(message = "Glimmer returned details this extension couldn’t read. Update Glimmer and try again.") {
    super(message);
    this.name = "ContractError";
  }
}

function invalid(): never {
  throw new ContractError();
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}

function envelope(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalid();
  }
  const value = object(parsed);
  if (value.version !== 1) {
    throw new ContractError(
      "Unsupported Glimmer JSON schema version; expected version 1. Update Glimmer and this extension.",
    );
  }
  return value;
}

function hasControlCharacters(value: string): boolean {
  return /[\p{Cc}\p{Cf}]/u.test(value);
}

function string(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return invalid();
  try {
    // Reject lone surrogates before a display name is used to build a URL.
    encodeURIComponent(value);
    return value;
  } catch {
    return invalid();
  }
}

function boolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : invalid();
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : invalid();
}

function integer(value: unknown): number {
  const result = number(value);
  return Number.isSafeInteger(result) ? result : invalid();
}

function dimension(value: unknown): number {
  const result = integer(value);
  return result > 0 ? result : invalid();
}

function nullable<T>(value: unknown, parse: (value: unknown) => T): T | null {
  return value === null || value === undefined ? null : parse(value);
}

function array<T>(value: unknown, parse: (value: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(parse) : invalid();
}

function runningApp(value: unknown): RunningApp {
  const app = object(value);
  return { id: nullable(app.id, integer), name: nullable(app.name, string) };
}

export function parsePCs(text: string): PC[] {
  return array(envelope(text).pcs, (value) => {
    const pc = object(value);
    const state = pc.state;
    if (state !== "ready" && state !== "reachable" && state !== "asleep" && state !== "unknown") return invalid();
    return {
      id: string(pc.id),
      name: string(pc.name),
      address: nullable(pc.address, string),
      paired: boolean(pc.paired),
      state,
      runningApp: nullable(pc.runningApp, runningApp),
      default: boolean(pc.default),
    };
  });
}

export function parseApps(text: string): App[] {
  return array(envelope(text).apps, (value) => {
    const app = object(value);
    return {
      id: integer(app.id),
      name: string(app.name),
      hdr: boolean(app.hdr),
      hidden: boolean(app.hidden),
      running: boolean(app.running),
    };
  });
}

export function parseStatus(text: string): StreamStatus {
  const value = envelope(text);
  return {
    live: boolean(value.live),
    pc: nullable(value.pc, (value) => {
      const pc = object(value);
      return { id: string(pc.id), name: string(pc.name) };
    }),
    app: nullable(value.app, runningApp),
    resolution: nullable(value.resolution, (value) => {
      const size = object(value);
      return { width: dimension(size.width), height: dimension(size.height) };
    }),
    fps: nullable(value.fps, number),
    hdr: nullable(value.hdr, boolean),
    codec: nullable(value.codec, string),
    bitrateMbps: nullable(value.bitrateMbps, number),
  };
}

export type StopResult = { result: "stopped"; stopped: true } | { result: "noActiveStream"; stopped: false };

export function parseStop(text: string, exitCode: number): StopResult {
  const value = envelope(text);
  if (exitCode === 0 && value.result === "stopped" && value.stopped === true) {
    return { result: "stopped", stopped: true };
  }
  if (exitCode === 5 && value.result === "noActiveStream" && value.stopped === false) {
    return { result: "noActiveStream", stopped: false };
  }
  return invalid();
}

export function exitCodeMessage(code: number | null, pc = "The PC"): string {
  switch (code) {
    case 0:
      return "Done.";
    case 1:
      return "Glimmer couldn’t complete the request. Open Glimmer and try again.";
    case 2:
      return "Glimmer couldn’t use this command. Update Glimmer and this extension.";
    case 3:
      return `${pc} didn’t answer. Check its power and connection, then try again.`;
    case 4:
      return `${pc} isn’t paired or couldn’t be found. Open Glimmer to check its pairing.`;
    default:
      return "Glimmer stopped before completing the request. Try again.";
  }
}

export type URLAction = "stream" | "stop" | "wake" | "quit";

function queryValue(value: string): string {
  if (typeof value !== "string" || !value.trim() || hasControlCharacters(value)) {
    throw new Error("The Glimmer link needs a valid PC or app name.");
  }
  // URLSearchParams encodes spaces as +, which Glimmer treats as a literal plus.
  try {
    return encodeURIComponent(value);
  } catch {
    throw new Error("The Glimmer link needs a valid PC or app name.");
  }
}

export function buildURL(action: URLAction, pc?: string, app?: string): string {
  if (!["stream", "stop", "wake", "quit"].includes(action) || (action !== "stream" && app !== undefined)) {
    throw new Error("This Glimmer link action isn’t supported.");
  }
  if (action === "stop" && pc === undefined) return "glimmer://stop";
  if (pc === undefined) throw new Error("The Glimmer link needs a valid PC or app name.");
  return `glimmer://${action}?pc=${queryValue(pc)}${app === undefined ? "" : `&app=${queryValue(app)}`}`;
}

export function pcState(pc: PC): "Ready" | "Asleep" | "Offline" | "Streaming" {
  if (pc.state === "asleep") return "Asleep";
  if (pc.state === "unknown" || !pc.paired) return "Offline";
  return pc.runningApp ? "Streaming" : "Ready";
}

export function streamDetails(status: StreamStatus): string {
  return [
    status.resolution ? `${status.resolution.width} × ${status.resolution.height}` : "Resolution unknown",
    status.fps === null ? "Frame rate unknown" : `${status.fps} fps`,
    status.hdr === null ? "HDR unknown" : status.hdr ? "HDR" : "SDR",
    status.codec ?? "Codec unknown",
  ].join(" · ");
}
