import { describe, expect, test } from "vitest";
import {
  buildAddToQueue,
  buildPlayTrackAtIndex,
  buildPlayVideos,
  buildRemoveFromQueue,
  isValidVideoId,
  parsePlayQueue,
} from "./queue";

describe("isValidVideoId", () => {
  test("accepts an 11-character YouTube id", () => {
    expect(isValidVideoId("dQw4w9WgXcQ")).toBe(true);
  });

  test("rejects a full URL", () => {
    expect(isValidVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
  });

  test("rejects an empty string", () => {
    expect(isValidVideoId("")).toBe(false);
  });
});

describe("parsePlayQueue", () => {
  test("parses currentIndex and audioVideoId", () => {
    const queue = parsePlayQueue(
      '{"currentIndex":2,"tracks":[{"videoId":"a","audioVideoId":"b"}]}',
    );
    expect(queue.currentIndex).toBe(2);
    expect(queue.tracks[0].audioVideoId).toBe("b");
  });

  test("parses an empty queue", () => {
    const queue = parsePlayQueue('{"currentIndex":0,"tracks":[]}');
    expect(queue.currentIndex).toBe(0);
    expect(queue.tracks.length).toBe(0);
  });
});

describe("command builders", () => {
  test("play track at index", () => {
    expect(buildPlayTrackAtIndex(2)).toBe(
      'tell application "Kaset" to play track at index 2',
    );
  });

  test("remove from queue", () => {
    expect(buildRemoveFromQueue("abc")).toBe(
      'tell application "Kaset" to remove from queue "abc"',
    );
  });

  test("add to queue appends by default", () => {
    expect(buildAddToQueue(["A", "B"])).toBe(
      'tell application "Kaset" to add to queue {"A", "B"}',
    );
  });

  test("add to queue with next", () => {
    expect(buildAddToQueue(["A"], true)).toBe(
      'tell application "Kaset" to add to queue {"A"} with next',
    );
  });

  test("play videos with starting at", () => {
    expect(buildPlayVideos(["A", "B"], 2)).toBe(
      'tell application "Kaset" to play videos {"A", "B"} starting at 2',
    );
  });

  test("play videos with no starting at", () => {
    expect(buildPlayVideos(["A"])).toBe(
      'tell application "Kaset" to play videos {"A"}',
    );
  });
});
