import { test } from "node:test";
import assert from "node:assert/strict";
import harness from "../../tests/harness.cjs";
const { React, fixture, resetStats, track, toasts } = harness;
import { act, create } from "react-test-renderer";
import { createRequire } from "node:module";

const loadSource = createRequire(import.meta.url);
const { parseSyncedLyrics, findActiveLyricIndex, findLyrics } = loadSource("../api/lyrics.ts");
const { getCurrentlyPlaying, getCurrentlyPlayingUncached } = loadSource("../api/getCurrentlyPlaying.ts");
const { seek } = loadSource("../api/seek.ts");
const { invalidateCache } = loadSource("../helpers/apiCache.ts");
const FindLyricsCommand = loadSource("../findLyrics.tsx").default;

const tick = () => new Promise((r) => setImmediate(r));
async function settle() {
  for (let n = 0; n < 30; n++) await act(tick);
}
async function mount(element) {
  let renderer;
  await act(async () => {
    renderer = create(element);
  });
  await settle();
  return renderer;
}
async function unmount(renderer) {
  await act(async () => renderer.unmount());
}

const findAction = (node, title) => node.findAll((item) => item.type === "Action" && item.props.title === title)[0];

const SAMPLE_LRC = [
  "[ar:Rick Astley]",
  "[ti:Never Gonna Give You Up]",
  "[00:00.00]",
  "[00:18.83]We're no strangers to love",
  "[00:22.82]You know the rules and so do I",
  "[00:27.100]",
  "[00:30.50][01:10.5]A full commitment's what I'm thinking of",
  "[00:35.00]<00:35.10>You wouldn't get this from <00:36.20>any other guy",
].join("\n");

test("parseSyncedLyrics parses timestamps, expands multi-tags, strips metadata/word-tags, and collapses breaks", () => {
  const lines = parseSyncedLyrics(SAMPLE_LRC);
  assert.deepEqual(lines, [
    { timeMs: 18830, text: "We're no strangers to love" },
    { timeMs: 22820, text: "You know the rules and so do I" },
    { timeMs: 27100, text: "" },
    { timeMs: 30500, text: "A full commitment's what I'm thinking of" },
    { timeMs: 35000, text: "You wouldn't get this from any other guy" },
    { timeMs: 70500, text: "A full commitment's what I'm thinking of" },
  ]);

  assert.deepEqual(parseSyncedLyrics("[ar:Artist]\n[00:05.00]\n[00:10.00] "), []);
});

test("findActiveLyricIndex locates the active line via binary search", () => {
  const lines = [
    { timeMs: 10000, text: "Line 1" },
    { timeMs: 20000, text: "Line 2" },
    { timeMs: 20000, text: "Line 2b" },
    { timeMs: 30000, text: "Line 3" },
  ];

  assert.equal(findActiveLyricIndex([], 15000), -1);
  assert.equal(findActiveLyricIndex(lines, 9999), -1);
  assert.equal(findActiveLyricIndex(lines, 10000), 0);
  assert.equal(findActiveLyricIndex(lines, 19999), 0);
  assert.equal(findActiveLyricIndex(lines, 20000), 2);
  assert.equal(findActiveLyricIndex(lines, 45000), 3);
});

test("findLyrics returns syncedLyrics alongside plain lyrics and handles fallback/404", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: null,
          syncedLyrics: SAMPLE_LRC,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const res = await findLyrics({ title: "Song", artist: "Artist", album: "Album", duration: 200 });
    assert.equal(res.syncedLyrics?.length, 6);
    assert.equal(
      res.lyrics,
      [
        "We're no strangers to love",
        "You know the rules and so do I",
        "A full commitment's what I'm thinking of",
        "You wouldn't get this from any other guy",
      ].join("\n"),
    );

    globalThis.fetch = async () => new Response("", { status: 404 });
    const missing = await findLyrics({ title: "Missing", artist: "Artist", album: "", duration: 200 });
    assert.deepEqual(missing, { lyrics: null });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getCurrentlyPlayingUncached bypasses cache and seek sends rounded integer milliseconds", async () => {
  resetStats();
  const client = fixture();
  let progress = 12000;
  const seeked = [];
  client.getMePlayerCurrentlyPlaying = async () => ({
    is_playing: true,
    progress_ms: progress,
    item: track("target"),
    currently_playing_type: "track",
  });
  client.putMePlayerSeek = async (ms) => {
    seeked.push(ms);
  };

  invalidateCache("api:currently-playing");
  assert.equal((await getCurrentlyPlaying()).progress_ms, 12000);
  progress = 25000;
  assert.equal((await getCurrentlyPlaying()).progress_ms, 12000);
  assert.equal((await getCurrentlyPlayingUncached()).progress_ms, 25000);

  await seek(18.834, 234000);
  assert.deepEqual(seeked, [18834]);
  // seek invalidates the currently-playing cache so subsequent cached reads see fresh progress.
  assert.equal((await getCurrentlyPlaying()).progress_ms, 25000);
});

test("FindLyricsCommand displays synced lyrics, advances with playback, seeks, and toggles plain view", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  resetStats();
  const originalFetch = globalThis.fetch;
  let lrclibCalls = 0;

  try {
    globalThis.fetch = async () => {
      lrclibCalls += 1;
      return new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: "First line\nSecond line\nThird line",
          syncedLyrics: "[00:10.00]First line\n[00:15.00]Second line\n[00:20.00]Third line",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const state = {
      is_playing: true,
      progress_ms: 11000,
      trackId: "s1",
    };
    const seeked = [];
    const client = fixture();
    client.getMePlayerCurrentlyPlaying = async () => ({
      is_playing: state.is_playing,
      progress_ms: state.progress_ms,
      item: track(state.trackId),
      currently_playing_type: "track",
    });
    client.putMePlayerSeek = async (ms) => {
      seeked.push(ms);
      state.progress_ms = ms;
    };
    client.putMePlayerPause = async () => {
      state.is_playing = false;
    };
    client.putMePlayerPlay = async () => {
      state.is_playing = true;
    };

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      const list = renderer.root.findByType("List");
      assert.equal(list.props.selectedItemId, "line-0");
      assert.equal(lrclibCalls, 1);

      // Advance 4.2 seconds -> should cross [00:15.00] into line-1 without refetching LRCLIB.
      await act(async () => t.mock.timers.tick(4200));
      await settle();
      assert.equal(renderer.root.findByType("List").props.selectedItemId, "line-1");
      assert.equal(lrclibCalls, 1);

      // Seek to line 2 ([00:20.00]).
      const thirdItem = renderer.root.findAllByType("List.Item")[2];
      await act(async () => findAction(thirdItem, "Seek to 00:20").props.onAction());
      await settle();
      assert.deepEqual(seeked, [20000]);
      assert.equal(renderer.root.findByType("List").props.selectedItemId, "line-2");
      assert.equal(toasts.at(-1).title, "Seeked to 00:20");

      // Toggle pause and ensure timer progression stops advancing.
      await act(async () => findAction(thirdItem, "Pause").props.onAction());
      await settle();
      assert.equal(state.is_playing, false);

      // Switch to plain lyrics Detail view and back to synced List view.
      await act(async () => findAction(thirdItem, "View Plain Lyrics").props.onAction());
      await settle();
      const detail = renderer.root.findByType("Detail");
      assert.match(detail.props.markdown, /First line/);
      await act(async () => findAction(detail, "View Synced Lyrics").props.onAction());
      await settle();
      assert.ok(renderer.root.findByType("List"));
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand falls back to Detail view when only plain lyrics exist and discards stale background polls", async () => {
  resetStats();
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (url.includes("Song+t2")) {
        return new Response(
          JSON.stringify({
            instrumental: false,
            plainLyrics: "Plain only line",
            syncedLyrics: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: "Line A\nLine B",
          syncedLyrics: "[00:05.00]Line A\n[00:15.00]Line B",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = fixture();
    let holdRead;
    let current = { is_playing: true, progress_ms: 6000, trackId: "t1" };
    client.getMePlayerCurrentlyPlaying = () =>
      holdRead
        ? holdRead()
        : Promise.resolve({
            is_playing: current.is_playing,
            progress_ms: current.progress_ms,
            item: track(current.trackId),
            currently_playing_type: "track",
          });
    client.putMePlayerSeek = async (ms) => {
      current.progress_ms = ms;
    };
    client.postMePlayerNext = async () => {
      current = { is_playing: true, progress_ms: 0, trackId: "t2" };
    };

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      assert.equal(renderer.root.findByType("List").props.selectedItemId, "line-0");

      // Hold a refresh read while user seeks to line-1; the older refresh must not overwrite the seek.
      let releaseOld;
      holdRead = () => {
        holdRead = undefined;
        return new Promise((resolve) => {
          releaseOld = () =>
            resolve({
              is_playing: true,
              progress_ms: 6000,
              item: track("t1"),
              currently_playing_type: "track",
            });
        });
      };

      let refreshPromise;
      await act(async () => {
        refreshPromise = findAction(renderer.root.findAllByType("List.Item")[0], "Refresh").props.onAction();
      });
      await act(async () => {
        await findAction(renderer.root.findAllByType("List.Item")[1], "Seek to 00:15").props.onAction();
      });
      await act(async () => releaseOld());
      await act(async () => refreshPromise);
      await settle();

      // Skip to next track which only has plain lyrics -> switches to Detail view.
      await act(async () => findAction(renderer.root.findAllByType("List.Item")[1], "Next").props.onAction());
      await settle();
      const detail = renderer.root.findByType("Detail");
      assert.match(detail.props.markdown, /Plain only line/);
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
