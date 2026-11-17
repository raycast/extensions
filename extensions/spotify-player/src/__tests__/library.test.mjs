import { test } from "node:test";
import assert from "node:assert/strict";
import harness from "../../tests/harness.cjs";
const { React, fixture, stats, resetStats, track, toasts, host } = harness;
import { act, create } from "react-test-renderer";
import { createRequire } from "node:module";
// The fixture loader selects/transpiles current or baseline TypeScript at runtime.
const loadSource = createRequire(import.meta.url);
const { playlistContainsTrack } = loadSource("../api/playlistContainsTrack.ts");
const { getMyPlaylists } = loadSource("../api/getMyPlaylists.ts");
const { TrackActionPanel } = loadSource("../components/TrackActionPanel.tsx");
const { PlaylistPicker } = loadSource("../components/PlaylistPicker.tsx");
const { TracksList } = loadSource("../components/TracksList.tsx");
const Library = loadSource("../yourLibrary.tsx").default;
const { useSearch } = loadSource("../hooks/useSearch.ts");
const { AddToSavedTracksAction } = loadSource("../components/AddToSavedTracksAction.tsx");
const tick = () => new Promise((r) => setImmediate(r));
async function settle() {
  for (let n = 0; n < 45; n++) await act(tick);
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

// Sequential: mock client and API caches are shared like one extension worker.
test("large catalog coalesces cold consumers and preserves all later-page playlists", async () => {
  resetStats();
  fixture({ playlists: 275 });
  const [a, b] = await Promise.all([getMyPlaylists(), getMyPlaylists()]);
  assert.equal(a, b);
  assert.equal(a.items.length, 275);
  assert.equal(a.items[274].name, "Playlist 274");
  assert.equal(stats.calls.catalog, 6);
  assert.equal(stats.peakActive, 1);
});
test("membership scans beyond 1000, exits early, and never serializes track data", async () => {
  resetStats();
  fixture({ tracks: 2500, contains: (_, n) => n === 2200 });
  assert.equal(await playlistContainsTrack("p1", "spotify:track:target"), true);
  assert.equal(stats.calls.tracks, 45);
  assert.equal(stats.cacheBytes, 0);
  fixture({ tracks: 2500, contains: (_, n) => n === 0 });
  assert.equal(await playlistContainsTrack("p1", "spotify:track:target"), true);
  assert.equal(stats.calls.tracks, 46);
  fixture({ tracks: 2500 });
  assert.equal(await playlistContainsTrack("p1", "missing"), false);
  assert.equal(stats.calls.tracks, 96);
});
test("overlapping checks have at most two requests; cancelled checks stop and errors are not absence", async () => {
  resetStats();
  fixture({ tracks: 100, delay: 1 });
  await Promise.all(Array.from({ length: 8 }, (_, i) => playlistContainsTrack(`p${i}`, "missing")));
  assert.equal(stats.peakActive, 2);
  const controller = new AbortController();
  const pending = playlistContainsTrack("p0", "missing", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  fixture({ fail: () => true });
  await assert.rejects(playlistContainsTrack("p0", "missing"), /Fixture request failure/);
});
test("queued cancellation settles before active requests finish and preserves request slots", async () => {
  resetStats();
  const client = fixture();
  const started = [];
  const releases = [];
  client.getPlaylistsByPlaylistIdTracks = (id) => {
    started.push(id);
    return new Promise((resolve) => releases.push(() => resolve({ items: [], next: null })));
  };
  const pending = [playlistContainsTrack("active1", "missing"), playlistContainsTrack("active2", "missing")];
  const controller = new AbortController();
  const cancelled = playlistContainsTrack("cancelled", "missing", controller.signal);
  pending.push(cancelled);
  let rejection;
  cancelled.catch((error) => (rejection = error));
  pending.push(playlistContainsTrack("next", "missing"));
  try {
    controller.abort();
    await tick();
    assert.equal(rejection, controller.signal.reason);
    assert.equal(rejection.name, "AbortError");
    pending.push(playlistContainsTrack("last", "missing"));
    assert.deepEqual(started, ["active1", "active2"]);
    releases.shift()();
    await tick();
    assert.deepEqual(started, ["active1", "active2", "next"]);
    releases.shift()();
    await tick();
    assert.deepEqual(started, ["active1", "active2", "next", "last"]);
  } finally {
    // Drain even on failure so the shared limiter cannot affect later tests.
    while (releases.length) {
      releases.shift()();
      await tick();
    }
    await Promise.allSettled(pending);
  }
});
test("null tracks, relinked tracks, empty pages and invalid continuation", async () => {
  resetStats();
  const client = fixture();
  let calls = 0;
  client.getPlaylistsByPlaylistIdTracks = async () =>
    ++calls === 1
      ? { items: [], next: "https://api.spotify.com/tracks?offset=50" }
      : { items: [{ track: null }, { track: { uri: "replacement", linked_from: { uri: "original" } } }], next: null };
  assert.equal(await playlistContainsTrack("p", "original"), true);
  assert.equal(calls, 2);
  client.getPlaylistsByPlaylistIdTracks = async () => ({ items: [], next: "https://api.spotify.com/tracks?offset=0" });
  await assert.rejects(playlistContainsTrack("p", "original"), /Invalid playlist continuation/);
});
test("library, search results and album navigation do not inspect playlist tracks, even across repeated renders", async () => {
  resetStats();
  fixture({ playlists: 275, tracks: 2500 });
  const library = await mount(React.createElement(Library));
  assert.equal(stats.calls.tracks, undefined);
  assert.equal(stats.calls.catalog, 6);
  await act(async () => library.root.findByType("List.Dropdown").props.onChange("playlists"));
  await settle();
  assert.ok(library.root.findAllByType("List.Item").some((item) => item.props.title === "Playlist 274"));
  await unmount(library);
  function SearchResults() {
    const { searchData } = useSearch({ query: "fixture" });
    return searchData?.tracks?.items.map((t) =>
      React.createElement(TrackActionPanel, { key: t.id, title: t.name, track: t }),
    );
  }
  const search = await mount(React.createElement(SearchResults));
  assert.equal(stats.calls.tracks, undefined);
  await unmount(search);
  for (let i = 0; i < 5; i++) {
    const album = await mount(
      React.createElement(TracksList, { album: { id: "album", name: "Album", uri: "spotify:album:album" } }),
    );
    await act(async () =>
      album.update(
        React.createElement(TracksList, { album: { id: "album", name: "Album", uri: "spotify:album:album" } }),
      ),
    );
    await unmount(album);
  }
  assert.equal(stats.calls.tracks, undefined);
});
test("picker loads metadata only until selection; stale selection cannot replace new membership", async () => {
  resetStats();
  const client = fixture({ playlists: 275, tracks: 1 });
  const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
  assert.equal(stats.calls.tracks, undefined);
  let resolveOld;
  client.getPlaylistsByPlaylistIdTracks = async (id) =>
    id === "p0"
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : { items: [], next: null };
  await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
  await act(async () => renderer.root.findByType("List").props.onSelectionChange("p274"));
  await settle();
  await act(async () => resolveOld({ items: [{ track: { uri: "spotify:track:target" } }], next: null }));
  await settle();
  const selected = renderer.root.findAllByType("List.Item").find((item) => item.props.id === "p274");
  assert.deepEqual(selected.props.accessories, []);
  assert.ok(renderer.root.findAllByType("List.Item").some((item) => item.props.title === "Playlist 274"));
  await unmount(renderer);
});
for (const duplicateSongCheck of [false, true]) {
  test(`picker reuses completed checks for add/remove with Quicklink duplicate checking ${duplicateSongCheck}`, async () => {
    resetStats();
    const previous = harness.preferences.duplicateSongCheck;
    harness.preferences.duplicateSongCheck = duplicateSongCheck;
    let present = false;
    const client = fixture({ playlists: 1, tracks: 1, contains: () => present });
    const scansBeforeMutation = [];
    for (const [method, nextPresent] of [
      ["postPlaylistsByPlaylistIdTracks", true],
      ["deletePlaylistsByPlaylistIdTracks", false],
    ]) {
      const original = client[method];
      client[method] = async (...args) => {
        scansBeforeMutation.push(stats.calls.tracks);
        const result = await original(...args);
        present = nextPresent;
        return result;
      };
    }
    const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
    try {
      await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
      await settle();
      assert.equal(stats.calls.tracks, 1);
      const action = renderer.root.findByType("Action").props.onAction;
      await act(async () => Promise.all([action(), action()]));
      await settle();
      assert.equal(stats.writes.filter((x) => x[0] === "add").length, 1);
      assert.equal(renderer.root.findByType("Action").props.title, "Remove from Playlist");
      const scansAfterAdd = stats.calls.tracks;
      await act(async () => renderer.root.findByType("Action").props.onAction());
      await settle();
      assert.equal(stats.writes.filter((x) => x[0] === "remove").length, 1);
      assert.deepEqual(scansBeforeMutation, [1, scansAfterAdd]);
      assert.equal(
        toasts.some((toast) => toast.title === "Duplicate found"),
        false,
      );
      assert.equal(renderer.root.findByType("Action").props.title, "Add to Playlist");
    } finally {
      harness.preferences.duplicateSongCheck = previous;
      await unmount(renderer);
    }
  });
}

test("favorites action writes a saved track without playlist loading", async () => {
  resetStats();
  fixture();
  const renderer = await mount(React.createElement(AddToSavedTracksAction, { trackId: "target" }));
  await act(async () => renderer.root.findByType("Action").props.onAction());
  await settle();
  assert.equal(stats.calls.like, 1);
  assert.equal(stats.calls.catalog, undefined);
  assert.equal(stats.calls.tracks, undefined);
  await unmount(renderer);
});

test("picker checks a new track instead of reusing the previous track's membership", async () => {
  resetStats();
  fixture({ playlists: 1, tracks: 1, contains: () => true });
  const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
  try {
    await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
    await settle();
    assert.equal(renderer.root.findByType("Action").props.title, "Remove from Playlist");
    await act(async () => renderer.update(React.createElement(PlaylistPicker, { uri: "spotify:track:new" })));
    await settle();
    assert.equal(stats.calls.tracks, 2);
    assert.equal(renderer.root.findByType("Action").props.title, "Add to Playlist");
    await act(async () => renderer.root.findByType("Action").props.onAction());
    assert.deepEqual(stats.writes.filter((write) => write[0] === "add")[0][2].uris, ["spotify:track:new"]);
    assert.equal(
      stats.writes.some((write) => write[0] === "remove"),
      false,
    );
  } finally {
    await unmount(renderer);
  }
});
test("new search response wins when older search finishes last", async () => {
  resetStats();
  const client = fixture();
  let old;
  let current;
  client.search = async (query) =>
    query === "old" ? new Promise((r) => (old = r)) : { tracks: { items: [track("new")] } };
  function Search({ query }) {
    current = useSearch({ query });
    return null;
  }
  const renderer = await mount(React.createElement(Search, { query: "old" }));
  await act(async () => renderer.update(React.createElement(Search, { query: "new" })));
  await settle();
  await act(async () => old({ tracks: { items: [track("old")] } }));
  await settle();
  assert.equal(current.searchData.tracks.items[0].id, "new");
  await unmount(renderer);
});

test("catalog membership consumers stream pages, do not refetch on equivalent renders, and cancel old songs", async () => {
  resetStats();
  const client = fixture({ playlists: 3, tracks: 100 });
  const { usePlaylistsContainingTrack } = loadSource("../hooks/usePlaylistsContainingTrack.ts");
  let state;
  function Membership({ uri }) {
    state = usePlaylistsContainingTrack({ playlists: [{ id: "p0" }, { id: "p1" }, { id: "p2" }], trackUri: uri });
    return null;
  }
  const renderer = await mount(React.createElement(Membership, { uri: "one" }));
  assert.equal(stats.calls.tracks, 6);
  await act(async () => renderer.update(React.createElement(Membership, { uri: "one" })));
  await settle();
  assert.equal(stats.calls.tracks, 6);
  assert.equal(stats.cacheBytes, 0);
  let old;
  client.getPlaylistsByPlaylistIdTracks = async () => new Promise((r) => (old = r));
  await act(async () => renderer.update(React.createElement(Membership, { uri: "old" })));
  client.getPlaylistsByPlaylistIdTracks = async () => ({ items: [], next: null });
  await act(async () => renderer.update(React.createElement(Membership, { uri: "new" })));
  await settle();
  await act(async () => old({ items: [{ track: { uri: "old" } }], next: null }));
  await settle();
  assert.deepEqual(state.playlistsContainingTrack, []);
  await unmount(renderer);
});

test("playing-song command renders the lazy picker; quicklinks check beyond 1000 before adding", async () => {
  resetStats();
  fixture({ playlists: 1, tracks: 1500, contains: (_, n) => n === 1400 });
  const Command = loadSource("../addPlayingSongToPlaylist.tsx").default;
  const picker = await mount(React.createElement(Command, {}));
  assert.equal(stats.calls.tracks, undefined);
  await unmount(picker);
  resetStats();
  const quicklink = await mount(React.createElement(Command, { launchContext: { playlistId: "p0" } }));
  assert.equal(stats.calls.catalog, undefined);
  assert.equal(stats.calls.tracks, 29);
  assert.equal(stats.writes.length, 0);
  assert.equal(toasts.at(-1).title, "Duplicate found");
  await act(async () => toasts.at(-1).primaryAction.onAction());
  await settle();
  assert.equal(stats.writes.filter((x) => x[0] === "add").length, 1);
  await unmount(quicklink);
});

test("Quicklinks skip membership scans when duplicate checking is disabled", async () => {
  resetStats();
  fixture({ playlists: 1, tracks: 1500, contains: () => true });
  const previous = harness.preferences.duplicateSongCheck;
  harness.preferences.duplicateSongCheck = false;
  const Command = loadSource("../addPlayingSongToPlaylist.tsx").default;
  let renderer;
  try {
    renderer = await mount(React.createElement(Command, { launchContext: { playlistId: "p0" } }));
    assert.equal(stats.calls.tracks, undefined);
    assert.equal(stats.writes.filter((write) => write[0] === "add").length, 1);
  } finally {
    harness.preferences.duplicateSongCheck = previous;
    if (renderer) await unmount(renderer);
  }
});

for (const state of ["loading", "failed"]) {
  test(`picker can remove when background membership is ${state}`, async () => {
    resetStats();
    const client = fixture({ playlists: 1, tracks: 1, contains: () => true });
    const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
    const fetch = client.getPlaylistsByPlaylistIdTracks;
    let finishBackground;
    let first = true;
    client.getPlaylistsByPlaylistIdTracks = async (...args) => {
      if (!first) return fetch(...args);
      first = false;
      if (state === "failed") throw new Error("Background check failed");
      return new Promise((resolve) => {
        finishBackground = resolve;
      });
    };
    await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
    await settle();
    assert.equal(renderer.root.findByType("Action").props.title, "Add or Remove from Playlist");
    await act(async () => renderer.root.findByType("Action").props.onAction());
    assert.equal(stats.writes.filter((x) => x[0] === "remove").length, 1);
    assert.equal(stats.writes.filter((x) => x[0] === "add").length, 0);
    assert.ok(toasts.some((toast) => toast.title === "Checking Playlist" && toast.style === "animated"));
    if (finishBackground) await act(async () => finishBackground({ items: [], next: null }));
    await unmount(renderer);
  });
}

for (const failure of ["scan", "mutation"]) {
  test(`failed quicklink ${failure} can explicitly retry once without reopening`, async () => {
    resetStats();
    const client = fixture({ playlists: 1, tracks: 1 });
    const method = failure === "scan" ? "getPlaylistsByPlaylistIdTracks" : "postPlaylistsByPlaylistIdTracks";
    const original = client[method];
    let attempts = 0;
    client[method] = async (...args) => {
      if (++attempts === 1) throw new Error("Transient failure");
      return original(...args);
    };
    const Command = loadSource("../addPlayingSongToPlaylist.tsx").default;
    const element = React.createElement(Command, { launchContext: { playlistId: "p0" } });
    const renderer = await mount(element);
    assert.equal(attempts, 1);
    await act(async () => renderer.update(element));
    await settle();
    assert.equal(attempts, 1);
    const retry = renderer.root
      .findAllByType("Action")
      .find((action) => action.props.title === "Retry Adding to Playlist").props.onAction;
    await act(async () => Promise.all([retry(), retry()]));
    await settle();
    assert.equal(attempts, 2);
    assert.equal(stats.writes.filter((x) => x[0] === "add").length, 1);
    await act(async () => retry());
    assert.equal(attempts, 2);
    await unmount(renderer);
  });
}

test("Now Playing keeps the picker action after profile and catalog failures", async () => {
  resetStats();
  const client = fixture({ playlists: 1, tracks: 1 });
  const profile = client.getMe;
  const catalog = client.getMePlaylists;
  client.getMe = client.getMePlaylists = async () => {
    throw new Error("Secondary request failed");
  };
  const Command = loadSource("../nowPlaying.tsx").default;
  const renderer = await mount(React.createElement(Command));
  const action = renderer.root.findAllByType("Action.Push").find((action) => action.props.title === "Add to Playlist");
  assert.ok(action);
  client.getMe = profile;
  client.getMePlaylists = catalog;
  const picker = await mount(action.props.target);
  assert.equal(picker.root.findByType("List.Item").props.title, "Playlist 0");
  await unmount(picker);
  await unmount(renderer);
});

// A fake Spotify player. Like the real one, it rejects a play or pause that wouldn't change anything.
// `lag` makes the next read after a command report the state from before it, and `hold` keeps reads in flight.
function player(client, state) {
  const sent = [];
  const snapshot = () =>
    state.track && { is_playing: state.playing, item: track(state.track), currently_playing_type: "track" };
  client.getMePlayerCurrentlyPlaying = () => {
    const result = state.stale ?? snapshot();
    state.stale = undefined;
    return state.hold ? state.hold(result) : Promise.resolve(result);
  };
  client.getMePlayer = async () => ({ is_playing: state.playing });
  const send = (name, change) => async (body) => {
    sent.push(name);
    if (state.failing || (change.playing === state.playing && !body?.uris)) {
      throw new Error("Player command failed: Restriction violated");
    }
    if (state.lag) state.stale = snapshot();
    Object.assign(state, change, body?.uris && { track: body.uris[0].split(":").pop() });
  };
  client.putMePlayerPause = send("pause", { playing: false });
  client.putMePlayerPlay = send("play", { playing: true });
  client.postMePlayerNext = send("next", { track: "next" });
  client.postMePlayerPrevious = send("previous", { track: "previous" });
  client.getRecommendations = async () => ({ tracks: [track("radio")] });
  return sent;
}

function holdNextRead(state) {
  let release;
  state.hold = (result) => {
    state.hold = undefined;
    return new Promise((resolve) => (release = () => resolve(result)));
  };
  return () => release();
}

const findAction = (renderer, title) =>
  renderer.root.findAll((node) => node.type === "Action" && node.props.title === title)[0];

async function press(renderer, title) {
  const action = findAction(renderer, title);
  assert.ok(action, `no ${title} action`);
  await act(() => action.props.onAction());
  await settle();
}

test("playback commands clear the cached currently-playing state", async () => {
  resetStats();
  const state = { playing: false, track: "target" };
  player(fixture(), state);
  const { getCurrentlyPlaying } = loadSource("../api/getCurrentlyPlaying.ts");
  const read = async () => {
    const data = await getCurrentlyPlaying();
    return `${data.is_playing ? "playing" : "paused"} ${data.item.id}`;
  };
  assert.equal(await read(), "paused target");
  await loadSource("../api/play.ts").play();
  assert.equal(await read(), "playing target");
  await loadSource("../api/pause.ts").pause();
  assert.equal(await read(), "paused target");
  await loadSource("../api/skipToNext.ts").skipToNext();
  assert.equal(await read(), "paused next");
  await loadSource("../api/skipToPrevious.ts").skipToPrevious();
  assert.equal(await read(), "paused previous");
  await loadSource("../api/startRadio.ts").startRadio({ trackIds: ["target"] });
  assert.equal(await read(), "playing radio");
});

test("a read sent before a playback change doesn't cache the old state", async () => {
  resetStats();
  const state = { playing: true, track: "target" };
  player(fixture(), state);
  const { getCurrentlyPlaying } = loadSource("../api/getCurrentlyPlaying.ts");
  const release = holdNextRead(state);
  const early = getCurrentlyPlaying();
  await loadSource("../api/pause.ts").pause();
  release();
  assert.equal((await early).is_playing, true);
  assert.equal((await getCurrentlyPlaying()).is_playing, false);
});

test("Now Playing play/pause flips at once and only does what its label says", async () => {
  resetStats();
  const state = { playing: true, track: "target", lag: true };
  const sent = player(fixture(), state);
  const Command = loadSource("../nowPlaying.tsx").default;
  const renderer = await mount(React.createElement(Command));
  // A second press straight after the first sends the opposite command.
  let first;
  await act(async () => {
    first = findAction(renderer, "Pause").props.onAction();
  });
  await press(renderer, "Play");
  await act(() => first);
  await settle();
  assert.deepEqual(sent, ["pause", "play"]);
  assert.ok(findAction(renderer, "Pause"));
  // Paused on another device while the view still shows Pause: pressing it doesn't start playback.
  state.playing = false;
  await press(renderer, "Pause");
  assert.equal(state.playing, false);
  assert.ok(findAction(renderer, "Play"));
  // A real failure puts the button back and says so.
  state.failing = true;
  await press(renderer, "Play");
  assert.ok(findAction(renderer, "Play"));
  assert.equal(toasts.at(-1).title, "Failed to play");
  await unmount(renderer);
});

test("Now Playing play/pause isn't undone by a read already in flight, now or after reopening", async () => {
  resetStats();
  const state = { playing: true, track: "target" };
  player(fixture(), state);
  const Command = loadSource("../nowPlaying.tsx").default;
  await unmount(await mount(React.createElement(Command)));
  loadSource("../helpers/apiCache.ts").invalidateCache("api:currently-playing");
  const release = holdNextRead(state);
  const renderer = await mount(React.createElement(Command));
  await press(renderer, "Pause");
  await act(async () => release());
  await settle();
  assert.ok(findAction(renderer, "Play"));
  await unmount(renderer);
  const reopened = await mount(React.createElement(Command));
  assert.ok(findAction(reopened, "Play"));
  await unmount(reopened);
});

test("Play clears the cached state only once launching Spotify has started playback", async () => {
  resetStats();
  const state = { playing: false, track: "target" };
  const client = fixture();
  player(client, state);
  // No active device, so Play opens the Spotify app and plays from there.
  client.putMePlayerPlay = async () => {
    throw new Error("Player command failed: No active device found");
  };
  host.spotifyInstalled = true;
  let started;
  host.runSpotifyScript = () => new Promise((resolve) => (started = () => resolve((state.playing = true))));
  const { getCurrentlyPlaying } = loadSource("../api/getCurrentlyPlaying.ts");
  const playing = loadSource("../api/play.ts").play();
  while (!started) await tick();
  assert.equal((await getCurrentlyPlaying()).is_playing, false);
  started();
  await playing;
  assert.equal((await getCurrentlyPlaying()).is_playing, true);
});

test("Now Playing sends quick presses in the order they were made", async () => {
  resetStats();
  const state = { playing: false, track: "target" };
  const client = fixture();
  const sent = player(client, state);
  const Command = loadSource("../nowPlaying.tsx").default;
  const renderer = await mount(React.createElement(Command));
  // Hold Play's request so Pause is pressed while Play is still on its way.
  let release;
  const sendPlay = client.putMePlayerPlay;
  client.putMePlayerPlay = (...args) => new Promise((resolve) => (release = resolve)).then(() => sendPlay(...args));
  const presses = [];
  await act(async () => presses.push(findAction(renderer, "Play").props.onAction()));
  await act(async () => presses.push(findAction(renderer, "Pause").props.onAction()));
  assert.ok(findAction(renderer, "Play"));
  while (!release) await act(tick);
  await act(async () => release());
  await act(() => Promise.all(presses));
  await settle();
  assert.deepEqual(sent, ["play", "pause"]);
  assert.equal(state.playing, false);
  assert.ok(findAction(renderer, "Play"));
  await unmount(renderer);
});

test("Now Playing refresh and next show fresh playback instead of the cached state", async () => {
  resetStats();
  const state = { playing: true, track: undefined };
  player(fixture(), state);
  const Command = loadSource("../nowPlaying.tsx").default;
  const renderer = await mount(React.createElement(Command));
  state.track = "target";
  await press(renderer, "Refresh");
  assert.match(renderer.root.findByType("Detail").props.markdown, /Song target/);
  await press(renderer, "Next");
  assert.match(renderer.root.findByType("Detail").props.markdown, /Song next/);
  await unmount(renderer);
});

test("catalog membership keeps earlier matches and checks later playlists after a failure", async (t) => {
  resetStats();
  const client = fixture({ tracks: 1, contains: () => true });
  const fetch = client.getPlaylistsByPlaylistIdTracks;
  const checked = [];
  client.getPlaylistsByPlaylistIdTracks = async (id, ...args) => {
    checked.push(id);
    if (id === "p1") throw new Error("Playlist unavailable");
    return fetch(id, ...args);
  };
  const errors = t.mock.method(console, "error", () => {});
  const { usePlaylistsContainingTrack } = loadSource("../hooks/usePlaylistsContainingTrack.ts");
  let state;
  function Membership() {
    state = usePlaylistsContainingTrack({
      playlists: [{ id: "p0" }, { id: "p1" }, { id: "p2" }],
      trackUri: "spotify:track:target",
    });
    return null;
  }
  const renderer = await mount(React.createElement(Membership));
  try {
    assert.deepEqual(checked, ["p0", "p1", "p2"]);
    assert.deepEqual(state.playlistsContainingTrack, ["p0", "p2"]);
    assert.equal(state.playlistsContainingTrackIsLoading, false);
    assert.ok(errors.mock.calls.some(({ arguments: args }) => args[0] === "Could not check playlist p1"));
  } finally {
    await unmount(renderer);
  }
});

test("cancelling a failed in-flight membership check stops the catalog walk", async (t) => {
  resetStats();
  const client = fixture();
  const checked = [];
  client.getPlaylistsByPlaylistIdTracks = async (id, options, { signal }) => {
    checked.push(id);
    if (id === "p0") return { items: [{ track: { uri: "spotify:track:target" } }], next: null };
    return new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("Request interrupted")), { once: true });
    });
  };
  const errors = t.mock.method(console, "error", () => {});
  const { usePlaylistsContainingTrack } = loadSource("../hooks/usePlaylistsContainingTrack.ts");
  function Membership() {
    usePlaylistsContainingTrack({
      playlists: [{ id: "p0" }, { id: "p1" }, { id: "p2" }],
      trackUri: "spotify:track:target",
    });
    return null;
  }
  const renderer = await mount(React.createElement(Membership));
  await unmount(renderer);
  await settle();
  assert.deepEqual(checked, ["p0", "p1"]);
  assert.equal(
    errors.mock.calls.some(({ arguments: args }) => String(args[0]).startsWith("Could not check playlist")),
    false,
  );
});

for (const initiallyPresent of [false, true]) {
  test(`picker refreshes instead of reversing the intended action after an external ${initiallyPresent ? "removal" : "addition"}`, async () => {
    resetStats();
    let present = initiallyPresent;
    let version = "first";
    fixture({ playlists: 1, tracks: 1, contains: () => present, snapshot: () => version });
    const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
    try {
      await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
      await settle();
      present = !initiallyPresent;
      version = "external-change";
      await act(async () => renderer.root.findByType("Action").props.onAction());
      assert.equal(stats.writes.length, 0);
      assert.ok(toasts.some((toast) => toast.title === "Playlist Changed"));
      assert.equal(
        renderer.root.findByType("Action").props.title,
        present ? "Remove from Playlist" : "Add to Playlist",
      );
      await act(async () => renderer.root.findByType("Action").props.onAction());
      assert.equal(stats.writes[0][0], present ? "remove" : "add");
    } finally {
      await unmount(renderer);
    }
  });
}

test("picker checks again when the playlist changes during its background scan", async () => {
  resetStats();
  let present = false;
  let version = "first";
  const client = fixture({ playlists: 1, tracks: 1, contains: () => present, snapshot: () => version });
  const original = client.getPlaylistsByPlaylistIdTracks;
  let first = true;
  client.getPlaylistsByPlaylistIdTracks = async (...args) => {
    const result = await original(...args);
    if (first) {
      first = false;
      version = "changed-during-scan";
      present = true;
    }
    return result;
  };
  const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
  try {
    await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
    await settle();
    await act(async () => renderer.root.findByType("Action").props.onAction());
    assert.equal(stats.writes.length, 0);
    assert.equal(renderer.root.findByType("Action").props.title, "Remove from Playlist");
  } finally {
    await unmount(renderer);
  }
});

test("picker blocks writes when the snapshot request fails", async () => {
  resetStats();
  const client = fixture({ playlists: 1, tracks: 1 });
  const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
  try {
    await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
    await settle();
    client.getPlaylistsByPlaylistId = async () => {
      throw new Error("snapshot unavailable");
    };
    await act(async () => renderer.root.findByType("Action").props.onAction());
    assert.equal(stats.writes.length, 0);
    assert.ok(
      toasts.some(
        (toast) => toast.title === "Could not update playlist" && toast.message.includes("snapshot unavailable"),
      ),
    );
  } finally {
    await unmount(renderer);
  }
});

test("picker scans before writing when the service omits snapshot IDs", async () => {
  resetStats();
  fixture({ playlists: 1, tracks: 1, snapshot: () => undefined });
  const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
  try {
    await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
    await settle();
    assert.equal(stats.calls.tracks, 1);
    await act(async () => renderer.root.findByType("Action").props.onAction());
    assert.equal(stats.writes[0][0], "add");
    assert.equal(stats.calls.tracks, 3); // background, pre-write, post-write refresh
  } finally {
    await unmount(renderer);
  }
});

test("a cancelled snapshot request never starts a stale playlist scan", async () => {
  resetStats();
  const client = fixture({ playlists: 2, tracks: 1 });
  let resolveOld;
  client.getPlaylistsByPlaylistId = async (id) =>
    id === "p0"
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : { snapshot_id: "second" };
  const scanned = [];
  const original = client.getPlaylistsByPlaylistIdTracks;
  client.getPlaylistsByPlaylistIdTracks = (...args) => {
    scanned.push(args[0]);
    return original(...args);
  };
  const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
  try {
    await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
    await act(async () => renderer.root.findByType("List").props.onSelectionChange("p1"));
    await settle();
    await act(async () => resolveOld({ snapshot_id: "first" }));
    await settle();
    assert.deepEqual(scanned, ["p1"]);
  } finally {
    await unmount(renderer);
  }
});

// Records the device lookups and play requests, with the device each request named.
function recordPlayback(client, { devices, fail }) {
  const requests = [];
  client.getMePlayerDevices = async () => {
    requests.push("devices");
    return { devices: devices() };
  };
  client.putMePlayerPlay = async (_body, { deviceId } = {}) => {
    requests.push(["play", deviceId]);
    const error = fail(deviceId);
    if (error) throw new Error(error);
  };
  return requests;
}

test("Play goes straight to the active device without looking up devices or apps first", async () => {
  resetStats();
  const requests = recordPlayback(fixture(), { devices: () => [{ id: "speaker", is_active: true }], fail: () => {} });
  await loadSource("../api/play.ts").play();
  assert.deepEqual(requests, [["play", undefined]]);
  assert.equal(stats.calls.apps, undefined);
});

test("without an active device, Play picks one from a fresh device list", async () => {
  resetStats();
  let devices = [{ id: "speaker", is_active: true }];
  const requests = recordPlayback(fixture(), {
    devices: () => devices,
    fail: (deviceId) => !deviceId && "Player command failed: No active device found",
  });
  // The cached list is from while the speaker was still active.
  await loadSource("../api/getMyDevices.ts").getMyDevices();
  devices = [{ id: "phone", is_active: false }];
  await loadSource("../api/play.ts").play();
  assert.deepEqual(requests, ["devices", ["play", undefined], "devices", ["play", "phone"]]);
  assert.equal(stats.calls.apps, 1);
});

test("Play reports other errors without looking up devices or apps", async () => {
  resetStats();
  const requests = recordPlayback(fixture(), {
    devices: () => [{ id: "speaker", is_active: true }],
    fail: () => "Player command failed: Restriction violated",
  });
  await assert.rejects(loadSource("../api/play.ts").play(), /Restriction violated/);
  assert.deepEqual(requests, [["play", undefined]]);
  assert.equal(stats.calls.apps, undefined);
});
