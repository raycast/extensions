import { describe, expect, test } from "vitest";
import {
  isPlaceholderTrack,
  MAX_RECENT,
  mergeRecent,
  visibleRecent,
  type RecentTrack,
} from "./history";

function track(id: string) {
  return {
    name: id,
    artist: "Artist",
    album: "",
    duration: 100,
    id,
    artworkURL: "",
  };
}

describe("mergeRecent", () => {
  test("prepends a new track, most recent first", () => {
    expect(mergeRecent([], track("a"), 1000)).toEqual([
      { ...track("a"), playedAt: 1000 },
    ]);
  });

  test("does not duplicate a re-played most-recent track", () => {
    const prev: RecentTrack[] = [{ ...track("a"), playedAt: 1000 }];
    const out = mergeRecent(prev, track("a"), 2000);
    expect(out).toHaveLength(1);
    expect(out[0].playedAt).toBe(2000);
  });

  test("moves a re-played older track to the front", () => {
    const prev: RecentTrack[] = [
      { ...track("b"), playedAt: 2000 },
      { ...track("a"), playedAt: 1000 },
    ];
    const out = mergeRecent(prev, track("a"), 3000);
    expect(out.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(out[0].playedAt).toBe(3000);
  });

  test("caps the log at MAX_RECENT, dropping the oldest", () => {
    const prev: RecentTrack[] = Array.from(
      { length: MAX_RECENT },
      (_, index) => ({ ...track(`t${index}`), playedAt: index }),
    );
    const out = mergeRecent(prev, track("new"), 9999);
    expect(out).toHaveLength(MAX_RECENT);
    expect(out[0].id).toBe("new");
    expect(out.some((entry) => entry.id === `t${MAX_RECENT - 1}`)).toBe(false);
  });
});

describe("visibleRecent", () => {
  const history: RecentTrack[] = [
    { ...track("newest"), playedAt: 3000 },
    { ...track("middle"), playedAt: 2000 },
    { ...track("oldest"), playedAt: 1000 },
  ];

  test("shows history oldest first", () => {
    expect(visibleRecent(history).map((entry) => entry.id)).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
  });

  test("excludes the track that is currently playing", () => {
    expect(visibleRecent(history, "middle").map((entry) => entry.id)).toEqual([
      "oldest",
      "newest",
    ]);
  });

  test("leaves the list intact when nothing is playing", () => {
    expect(visibleRecent(history, undefined)).toHaveLength(3);
  });
});

describe("isPlaceholderTrack", () => {
  test("rejects Kaset's ID-only Loading... placeholder", () => {
    expect(
      isPlaceholderTrack({
        name: "Loading...",
        artist: "",
        album: "",
        duration: 0,
        id: "FC1JY0m7lzE",
        artworkURL: "",
      }),
    ).toBe(true);
  });

  test("rejects a track with no name", () => {
    expect(isPlaceholderTrack(track(""))).toBe(true);
  });

  test("rejects a track with no metadata at all", () => {
    expect(
      isPlaceholderTrack({
        name: "Something",
        artist: "",
        album: "",
        duration: 0,
        id: "x",
        artworkURL: "",
      }),
    ).toBe(true);
  });

  test("keeps a real track", () => {
    expect(
      isPlaceholderTrack({
        name: "Shooting Star",
        artist: "Flawed Mangoes",
        album: "",
        duration: 292,
        id: "FC1JY0m7lzE",
        artworkURL: "https://example.com/a.jpg",
      }),
    ).toBe(false);
  });

  test("keeps a track that has a title and duration but no artist", () => {
    expect(
      isPlaceholderTrack({
        name: "Untitled Jam",
        artist: "",
        album: "",
        duration: 180,
        id: "y",
        artworkURL: "",
      }),
    ).toBe(false);
  });
});
