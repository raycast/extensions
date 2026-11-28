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

const findAction = (node, title) =>
  node.findAll((item) => (item.type === "Action" || item.type === "Action.Push") && item.props.title === title)[0];

const getActionTitles = (node) =>
  node
    .findAll(
      (item) =>
        item.type === "Action" ||
        item.type === "Action.Push" ||
        item.type === "Action.CopyToClipboard" ||
        item.type === "Action.OpenInBrowser",
    )
    .map((item) => item.props.title);

const SAMPLE_LRC = [
  "[ar:Rick Astley]",
  "[ti:Never Gonna Give You Up]",
  "[00:00.00]",
  "[00:18.83]We're no strangers to love",
  "[00:22.82]You know the rules and so do I",
  "[00:27.100]",
  "[00:30.50][01:10.5]A full commitment's what I'm thinking of",
  "[00:35.00]<00:35.10>You wouldn't get this from <00:36.20>any other guy",
  "[00:38.00]Hello<00:38.50> world",
].join("\n");

test("parseSyncedLyrics parses timestamps, expands multi-tags, strips metadata/word-tags, and collapses breaks", () => {
  const lines = parseSyncedLyrics(SAMPLE_LRC);
  assert.deepEqual(lines, [
    { timeMs: 18830, text: "We're no strangers to love" },
    { timeMs: 22820, text: "You know the rules and so do I" },
    { timeMs: 27100, text: "" },
    { timeMs: 30500, text: "A full commitment's what I'm thinking of" },
    { timeMs: 35000, text: "You wouldn't get this from any other guy" },
    { timeMs: 38000, text: "Hello world" },
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
    assert.equal(res.syncedLyrics?.length, 7);
    assert.equal(
      res.lyrics,
      [
        "We're no strangers to love",
        "You know the rules and so do I",
        "A full commitment's what I'm thinking of",
        "You wouldn't get this from any other guy",
        "Hello world",
      ].join("\n"),
    );

    globalThis.fetch = async () => new Response("", { status: 404 });
    const missing = await findLyrics({ title: "Missing", artist: "Artist", album: "", duration: 200 });
    assert.deepEqual(missing, { lyrics: null });

    globalThis.fetch = async () => new Response("Internal Server Error", { status: 500 });
    const failed = await findLyrics({ title: "Broken", artist: "Artist", album: "", duration: 200 });
    assert.deepEqual(failed, { lyrics: null, error: true });
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

      // Push plain lyrics Detail view with back navigation (navigationTitle allowed on pushed views, Copy Lyrics before Pause).
      const pushAction = findAction(thirdItem, "View Plain Lyrics");
      assert.equal(pushAction.type, "Action.Push");
      assert.equal(list.props.navigationTitle, undefined);
      const pushedRenderer = await mount(pushAction.props.target);
      try {
        const detail = pushedRenderer.root.findByType("Detail");
        assert.match(detail.props.markdown, /First line/);
        assert.ok(detail.props.navigationTitle);
        const titles = getActionTitles(detail);
        assert.equal(titles[0], "Copy Lyrics");
        assert.equal(titles[1], "Copy Song Info");
        assert.ok(titles.indexOf("Play") > titles.indexOf("Copy Song Info"));
      } finally {
        await unmount(pushedRenderer);
      }
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
      assert.equal(renderer.root.findByType("List").props.selectedItemId, "line-1");

      // Skip to next track which only has plain lyrics -> switches to Detail view with Copy actions first.
      await act(async () => findAction(renderer.root.findAllByType("List.Item")[1], "Next").props.onAction());
      await settle();
      const detail = renderer.root.findByType("Detail");
      assert.equal(detail.props.navigationTitle, undefined);
      assert.match(detail.props.markdown, /Plain only line/);
      const detailTitles = getActionTitles(detail);
      assert.equal(detailTitles[0], "Copy Lyrics");
      assert.equal(detailTitles[1], "Copy Song Info");
      assert.ok(detailTitles.indexOf("Pause") > detailTitles.indexOf("Copy Song Info"));
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand clears stale lyrics on background track change, retries transient lyrics failures, and recovers from playback errors", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  resetStats();
  const originalFetch = globalThis.fetch;

  try {
    let current = { is_playing: true, progress_ms: 6000, trackId: "t1" };
    let failPlaybackRead = false;
    let failT2Lyrics = true;
    let releaseT2Lyrics;

    globalThis.fetch = async (url) => {
      if (url.includes("Song+t2")) {
        if (failT2Lyrics) {
          return new Response("Upstream error", { status: 500 });
        }
        return new Promise((resolve) => {
          releaseT2Lyrics = () =>
            resolve(
              new Response(
                JSON.stringify({
                  instrumental: false,
                  plainLyrics: "Track 2 lyric",
                  syncedLyrics: "[00:05.00]Track 2 lyric",
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
              ),
            );
        });
      }
      return new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: "Track 1 lyric",
          syncedLyrics: "[00:05.00]Track 1 lyric",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = fixture();
    client.getMePlayerCurrentlyPlaying = async () => {
      if (failPlaybackRead) {
        throw new Error("Temporary Spotify outage");
      }
      return {
        is_playing: current.is_playing,
        progress_ms: current.progress_ms,
        item: track(current.trackId),
        currently_playing_type: "track",
      };
    };

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      assert.equal(renderer.root.findAllByType("List.Item")[0].props.title, "Track 1 lyric");

      // Foreground refresh fails while reading playback -> shows playback error.
      failPlaybackRead = true;
      await act(async () => findAction(renderer.root.findAllByType("List.Item")[0], "Refresh").props.onAction());
      await settle();
      assert.match(renderer.root.findByType("Detail").props.markdown, /Temporary Spotify outage/);

      // Next background poll succeeds for the same track -> playback error clears and lyrics return.
      failPlaybackRead = false;
      await act(async () => t.mock.timers.tick(5000));
      await settle();
      assert.equal(renderer.root.findAllByType("List.Item")[0].props.title, "Track 1 lyric");

      // Background poll detects Track 2, fails lyrics with 500 -> Track 1 lyrics are cleared (not shown under Track 2).
      current = { is_playing: true, progress_ms: 1000, trackId: "t2" };
      await act(async () => t.mock.timers.tick(5000));
      await settle();
      assert.match(renderer.root.findByType("Detail").props.markdown, /Failed to fetch lyrics/);

      // Next background poll retries Track 2 lyrics automatically; Track 1 lyrics stay cleared until retry resolves.
      failT2Lyrics = false;
      await act(async () => t.mock.timers.tick(5000));
      await settle();
      assert.ok(releaseT2Lyrics);
      assert.equal(renderer.root.findAllByType("List.Item").length, 0);
      assert.match(renderer.root.findByType("Detail").props.markdown, /Failed to fetch lyrics/);

      await act(async () => releaseT2Lyrics());
      await settle();
      assert.equal(renderer.root.findAllByType("List.Item")[0].props.title, "Track 2 lyric");
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand rejects stale seek completions when track changes while seek is pending", async () => {
  resetStats();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url) => {
      if (url.includes("Song+t2")) {
        return new Response(
          JSON.stringify({
            instrumental: false,
            plainLyrics: "Track 2 A\nTrack 2 B",
            syncedLyrics: "[00:05.00]Track 2 A\n[00:40.00]Track 2 B",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: "Track 1 A\nTrack 1 B",
          syncedLyrics: "[00:05.00]Track 1 A\n[00:45.00]Track 1 B",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = fixture();
    let current = { is_playing: true, progress_ms: 6000, trackId: "t1" };
    client.getMePlayerCurrentlyPlaying = async () => ({
      is_playing: current.is_playing,
      progress_ms: current.progress_ms,
      item: track(current.trackId),
      currently_playing_type: "track",
    });

    let releaseSeek;
    client.putMePlayerSeek = () =>
      new Promise((resolve) => {
        releaseSeek = () => resolve();
      });
    client.postMePlayerNext = async () => {
      current = { is_playing: true, progress_ms: 6000, trackId: "t2" };
    };

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      let pendingSeek;
      await act(async () => {
        pendingSeek = findAction(renderer.root.findAllByType("List.Item")[1], "Seek to 00:45").props.onAction();
      });

      // Track changes to t2 at 6s while t1's seek to 45s is still pending.
      await act(async () => findAction(renderer.root.findAllByType("List.Item")[0], "Next").props.onAction());
      await settle();
      assert.equal(renderer.root.findByType("List").props.selectedItemId, "line-0");

      // Completing t1's seek must not jump t2 to 45s (line-1).
      await act(async () => releaseSeek());
      await act(async () => pendingSeek);
      await settle();
      assert.equal(renderer.root.findByType("List").props.selectedItemId, "line-0");
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand suspends background polls while playback mutation is pending", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  resetStats();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: "Line 1",
          syncedLyrics: "[00:05.00]Line 1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const client = fixture();
    let playbackReads = 0;
    let isPlaying = true;
    client.getMePlayerCurrentlyPlaying = async () => {
      playbackReads += 1;
      return {
        is_playing: isPlaying,
        progress_ms: 6000,
        item: track("t1"),
        currently_playing_type: "track",
      };
    };

    let releasePause;
    client.putMePlayerPause = () =>
      new Promise((resolve) => {
        releasePause = () => {
          isPlaying = false;
          resolve();
        };
      });

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      const initialReads = playbackReads;
      let pendingPause;
      await act(async () => {
        pendingPause = findAction(renderer.root.findAllByType("List.Item")[0], "Pause").props.onAction();
      });

      // Five-second poll fires while pause() is pending: it must be suspended and not supersede Pause.
      await act(async () => t.mock.timers.tick(5000));
      await settle();
      assert.equal(playbackReads, initialReads);

      await act(async () => releasePause());
      await act(async () => pendingPause);
      await settle();
      assert.ok(findAction(renderer.root.findAllByType("List.Item")[0], "Play"));
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand runs deferred recovery sync after a superseded pause mutation releases ownership", async () => {
  resetStats();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: "Line 1",
          syncedLyrics: "[00:05.00]Line 1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const client = fixture();
    let isPlaying = true;
    client.getMePlayerCurrentlyPlaying = async () => ({
      is_playing: isPlaying,
      progress_ms: 6000,
      item: track("t1"),
      currently_playing_type: "track",
    });

    let releasePause;
    client.putMePlayerPause = () =>
      new Promise((resolve) => {
        releasePause = () => {
          isPlaying = false;
          resolve();
        };
      });

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      let pendingPause;
      await act(async () => {
        pendingPause = findAction(renderer.root.findAllByType("List.Item")[0], "Pause").props.onAction();
      });

      // Foreground Refresh takes a newer syncOwnerRef token while Pause is still pending.
      await act(async () => findAction(renderer.root.findAllByType("List.Item")[0], "Refresh").props.onAction());
      await settle();

      // Pause completes afterwards: deferred recovery runs once the mutation counter hits 0 and reflects paused state.
      await act(async () => releasePause());
      await act(async () => pendingPause);
      await settle();
      assert.ok(findAction(renderer.root.findAllByType("List.Item")[0], "Play"));
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand drains deferred recovery when pause finishes while a refresh is still fetching lyrics", async () => {
  resetStats();
  const originalFetch = globalThis.fetch;

  try {
    let holdLyricsFetch = false;
    let releaseLyricsFetch;
    globalThis.fetch = async () => {
      const payload = JSON.stringify({
        instrumental: false,
        plainLyrics: "Line 1",
        syncedLyrics: "[00:05.00]Line 1",
      });
      if (holdLyricsFetch) {
        holdLyricsFetch = false;
        return new Promise((resolve) => {
          releaseLyricsFetch = () =>
            resolve(new Response(payload, { status: 200, headers: { "Content-Type": "application/json" } }));
        });
      }
      return new Response(payload, { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const client = fixture();
    let isPlaying = true;
    client.getMePlayerCurrentlyPlaying = async () => ({
      is_playing: isPlaying,
      progress_ms: 6000,
      item: track("t1"),
      currently_playing_type: "track",
    });

    let releasePause;
    client.putMePlayerPause = () =>
      new Promise((resolve) => {
        releasePause = () => {
          isPlaying = false;
          resolve();
        };
      });

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      let pendingPause;
      await act(async () => {
        pendingPause = findAction(renderer.root.findAllByType("List.Item")[0], "Pause").props.onAction();
      });

      // Start foreground Refresh while Pause is pending, and hold its lyrics lookup in flight.
      holdLyricsFetch = true;
      let pendingRefresh;
      await act(async () => {
        pendingRefresh = findAction(renderer.root.findAllByType("List.Item")[0], "Refresh").props.onAction();
      });
      await settle();
      assert.ok(releaseLyricsFetch);

      // Pause finishes while Refresh is still in flight; recovery must stay pending until Refresh completes.
      await act(async () => releasePause());
      await act(async () => pendingPause);
      await settle();

      // Now Refresh finishes with the pre-pause snapshot -> deferred recovery drains and updates UI to Play.
      await act(async () => releaseLyricsFetch());
      await act(async () => pendingRefresh);
      await settle();
      assert.ok(findAction(renderer.root.findAllByType("List.Item")[0], "Play"));
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand serializes rapid Play/Pause presses instead of sending duplicate commands", async () => {
  resetStats();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          instrumental: false,
          plainLyrics: "Line 1",
          syncedLyrics: "[00:05.00]Line 1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const client = fixture();
    const events = [];
    let isPlaying = true;
    let releasePause;
    let releasePlay;

    client.getMePlayerCurrentlyPlaying = async () => ({
      is_playing: isPlaying,
      progress_ms: 6000,
      item: track("t1"),
      currently_playing_type: "track",
    });
    client.putMePlayerPause = () => {
      events.push("pause:start");
      return new Promise((resolve) => {
        releasePause = () => {
          isPlaying = false;
          events.push("pause:end");
          resolve();
        };
      });
    };
    client.putMePlayerPlay = () => {
      events.push("play:start");
      return new Promise((resolve) => {
        releasePlay = () => {
          isPlaying = true;
          events.push("play:end");
          resolve();
        };
      });
    };

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      const item = renderer.root.findAllByType("List.Item")[0];
      let firstPress;
      let secondPress;

      // Press Pause twice quickly (before the first request finishes): 2nd press must queue Play after Pause.
      await act(async () => {
        firstPress = findAction(item, "Pause").props.onAction();
      });
      await act(async () => {
        secondPress = findAction(item, "Pause").props.onAction();
      });
      await settle();
      assert.deepEqual(events, ["pause:start"]);
      assert.equal(releasePlay, undefined);

      await act(async () => releasePause());
      await settle();
      assert.deepEqual(events, ["pause:start", "pause:end", "play:start"]);

      await act(async () => releasePlay());
      await act(async () => Promise.all([firstPress, secondPress]));
      await settle();
      assert.deepEqual(events, ["pause:start", "pause:end", "play:start", "play:end"]);
      assert.ok(findAction(renderer.root.findAllByType("List.Item")[0], "Pause"));
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("FindLyricsCommand keeps retrying when cleaned title lookup fails transiently and raw title fallback returns 404", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  resetStats();
  const originalFetch = globalThis.fetch;

  try {
    let failCleaned = true;
    globalThis.fetch = async (url) => {
      if (!url.includes("Remastered")) {
        if (failCleaned) {
          return new Response("Upstream error", { status: 500 });
        }
        return new Response(
          JSON.stringify({
            instrumental: false,
            plainLyrics: "Recovered lyric",
            syncedLyrics: "[00:05.00]Recovered lyric",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("", { status: 404 });
    };

    const client = fixture();
    const remasteredTrack = { ...track("t-remaster"), name: "Song t1 (Remastered)" };
    client.getMePlayerCurrentlyPlaying = async () => ({
      is_playing: true,
      progress_ms: 6000,
      item: remasteredTrack,
      currently_playing_type: "track",
    });

    const renderer = await mount(React.createElement(FindLyricsCommand));
    try {
      assert.match(renderer.root.findByType("Detail").props.markdown, /Failed to fetch lyrics/);

      // Next 5s poll retries cleaned title and recovers once upstream succeeds.
      failCleaned = false;
      await act(async () => t.mock.timers.tick(5000));
      await settle();
      assert.equal(renderer.root.findAllByType("List.Item")[0].props.title, "Recovered lyric");
    } finally {
      await unmount(renderer);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
