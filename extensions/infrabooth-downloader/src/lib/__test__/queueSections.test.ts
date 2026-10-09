import { describe, expect, it } from "vitest";
import type { RemoteState, RemoteTrack } from "@/lib/remote-protocol";
import { buildQueueSections } from "../queueSections";

const track = (trackId: number): RemoteTrack => ({
  trackId,
  trackUrl: `https://soundcloud.com/t/${trackId}`,
  title: `Track ${trackId}`,
  artist: "Artist",
  artistId: 1,
  artworkUrl: null,
  durationMs: 1000,
  waveformUrl: null,
});

const state = (overrides: Partial<RemoteState>): RemoteState => ({
  state: "playing",
  currentTrack: null,
  positionMs: 0,
  durationMs: 0,
  volume: 1,
  queue: [],
  cursor: 0,
  shuffle: false,
  manualQueueCount: 0,
  stationQueueCount: 0,
  language: "en",
  theme: "dark",
  downloadingTrackIds: [],
  downloadedTrackIds: [],
  isSignedIn: true,
  downloadPath: "",
  downloadQueueBusy: false,
  ...overrides,
});

const indexes = (entries: { index: number }[]) => entries.map((entry) => entry.index);

describe("buildQueueSections", () => {
  it("splits history, manual queue, regular queue and station", () => {
    const queue = [1, 2, 3, 4, 5, 6, 7].map(track);
    const { history, upcoming } = buildQueueSections(
      state({ queue, cursor: 1, manualQueueCount: 2, stationQueueCount: 2 }),
    );
    expect(indexes(history)).toEqual([0]);
    expect(upcoming.map((section) => [section.title, indexes(section.entries)])).toEqual([
      ["Next up", [2, 3]],
      ["Queue", [4]],
      ["Autoplay Station", [5, 6]],
    ]);
  });

  it("drops empty sections", () => {
    const { history, upcoming } = buildQueueSections(state({ queue: [track(1), track(2)], cursor: 0 }));
    expect(history).toEqual([]);
    expect(upcoming.map((section) => section.title)).toEqual(["Queue"]);
  });

  it("clamps counts that exceed the queue", () => {
    const { upcoming } = buildQueueSections(
      state({ queue: [track(1), track(2)], cursor: 0, manualQueueCount: 10, stationQueueCount: 10 }),
    );
    expect(upcoming.map((section) => [section.title, indexes(section.entries)])).toEqual([["Next up", [1]]]);
  });
});
