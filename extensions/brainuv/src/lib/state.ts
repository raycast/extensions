import { randomUUID } from "crypto";
import type { State, Stream } from "./types";
import { DEFAULT_COLOR } from "./colors";

export const EMPTY_STATE: State = { streams: [] };

export function releaseQueue(state: State): State {
  if (state.streams.length <= 1) return state;
  const [first, ...rest] = state.streams;
  return { ...state, streams: [...rest, first] };
}

export function promoteStream(state: State, streamId: string): State {
  const idx = state.streams.findIndex((s) => s.id === streamId);
  if (idx <= 0) return state;
  const stream = state.streams[idx];
  const remaining = state.streams.filter((s) => s.id !== streamId);
  return { ...state, streams: [stream, ...remaining] };
}

export function createStream(title: string, color?: string): Stream {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title,
    color: color ?? DEFAULT_COLOR,
    createdAt: now,
    updatedAt: now,
  };
}

export function addStream(state: State, stream: Stream): State {
  return { ...state, streams: [...state.streams, stream] };
}

export function deleteStream(state: State, streamId: string): State {
  return { ...state, streams: state.streams.filter((s) => s.id !== streamId) };
}

export function editStream(
  state: State,
  streamId: string,
  updates: Partial<Pick<Stream, "title" | "color">>,
): State {
  return {
    ...state,
    streams: state.streams.map((s) =>
      s.id === streamId
        ? { ...s, ...updates, updatedAt: new Date().toISOString() }
        : s,
    ),
  };
}

export function moveStream(
  state: State,
  streamId: string,
  direction: "up" | "down",
): State {
  const idx = state.streams.findIndex((s) => s.id === streamId);
  if (idx < 0) return state;
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= state.streams.length) return state;
  const streams = [...state.streams];
  [streams[idx], streams[targetIdx]] = [streams[targetIdx], streams[idx]];
  return { ...state, streams };
}
