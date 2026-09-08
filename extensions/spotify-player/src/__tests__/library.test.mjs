import { test } from "node:test";
import assert from "node:assert/strict";
import harness from "../../tests/harness.cjs";
const { React, fixture, stats, resetStats, track, toasts } = harness;
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
test("picker adds once, removes known membership and blocks duplicates discovered at action time", async () => {
  resetStats();
  fixture({ playlists: 1, tracks: 1 });
  const renderer = await mount(React.createElement(PlaylistPicker, { uri: "spotify:track:target" }));
  await act(async () => renderer.root.findByType("List").props.onSelectionChange("p0"));
  await settle();
  let action = renderer.root.findByType("Action").props.onAction;
  await act(async () => Promise.all([action(), action()]));
  await settle();
  assert.equal(stats.writes.filter((x) => x[0] === "add").length, 1);
  fixture({ playlists: 1, tracks: 1, contains: () => true });
  await act(async () => renderer.root.findByType("Action").props.onAction());
  await settle();
  assert.equal(stats.writes.length, 1);
  assert.equal(toasts.at(-1).title, "Duplicate found");
  await act(async () => toasts.at(-1).primaryAction.onAction());
  await settle();
  assert.equal(stats.writes.filter((x) => x[0] === "add").length, 2);
  assert.equal(renderer.root.findByType("Action").props.title, "Remove from Playlist");
  await act(async () => renderer.root.findByType("Action").props.onAction());
  await settle();
  assert.equal(stats.writes.filter((x) => x[0] === "remove").length, 1);
  await unmount(renderer);
});
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
