import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { statePath } from "./paths";
import { FeedbackMarker, ProcessIdentity, RecordingState } from "./types";

function isProcessIdentity(value: unknown): value is ProcessIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<ProcessIdentity>;
  return (
    typeof identity.pid === "number" &&
    typeof identity.executable === "string" &&
    typeof identity.startedAt === "string"
  );
}

function isRecordingState(value: unknown): value is RecordingState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<RecordingState>;
  return (
    isProcessIdentity(state.recorder) &&
    isProcessIdentity(state.frameCapture) &&
    typeof state.startedAt === "string" &&
    typeof state.sessionDir === "string" &&
    typeof state.videoPath === "string" &&
    (!state.domContext || isProcessIdentity(state.domContext.process))
  );
}

export function readState(): RecordingState | undefined {
  if (!existsSync(statePath)) return undefined;
  try {
    const state = JSON.parse(readFileSync(statePath, "utf8")) as unknown;
    if (!isRecordingState(state)) throw new Error("Invalid recording state");
    return state;
  } catch {
    rmSync(statePath, { force: true });
    return undefined;
  }
}

export function writeState(state: RecordingState): void {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function clearState(): void {
  rmSync(statePath, { force: true });
}

function markersPath(state: RecordingState): string {
  return `${state.sessionDir}/markers.json`;
}

export function readMarkers(state: RecordingState): FeedbackMarker[] {
  const path = markersPath(state);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf8")) as FeedbackMarker[];
  } catch {
    return [];
  }
}

export function appendMarker(
  state: RecordingState,
  marker: FeedbackMarker,
): void {
  const markers = readMarkers(state);
  markers.push(marker);
  writeFileSync(markersPath(state), JSON.stringify(markers, null, 2));
}
