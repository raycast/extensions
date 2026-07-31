import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { statePath } from "./paths";
import { FeedbackMarker, RecordingState } from "./types";

export function readState(): RecordingState | undefined {
  if (!existsSync(statePath)) return undefined;
  try {
    return JSON.parse(readFileSync(statePath, "utf8")) as RecordingState;
  } catch {
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
