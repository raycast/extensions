const { test } = require("node:test");
const assert = require("node:assert/strict");
const { React, fixture, stats, resetStats, track, toasts } = require("./harness.cjs");
const { act, create } = require("react-test-renderer");
const { playlistContainsTrack } = require("../src/api/playlistContainsTrack.ts");
const { getMyPlaylists } = require("../src/api/getMyPlaylists.ts");
const { TrackActionPanel } = require("../src/components/TrackActionPanel.tsx");
const { PlaylistPicker } = require("../src/components/PlaylistPicker.tsx");
const { TracksList } = require("../src/components/TracksList.tsx");
const Library = require("../src/yourLibrary.tsx").default;
const { useSearch } = require("../src/hooks/useSearch.ts");
const { AddToSavedTracksAction } = require("../src/components/AddToSavedTracksAction.tsx");
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
  const { usePlaylistsContainingTrack } = require("../src/hooks/usePlaylistsContainingTrack.ts");
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
  const Command = require("../src/addPlayingSongToPlaylist.tsx").default;
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
