// Run each variant in a fresh process. BASELINE_REF selects the actual pre-change source via git show.
const { React, fixture, stats, sample } = require("./harness.cjs");
const { act, create } = require("react-test-renderer");
const { TrackActionPanel } = require("../src/components/TrackActionPanel.tsx");
const { track } = require("./harness.cjs");
const scenario = process.argv[2] ?? "browse";
const { PlaylistPicker } = ["picker", "navigation"].includes(scenario)
  ? require("../src/components/PlaylistPicker.tsx")
  : {};
const { playlistContainsTrack } = scenario === "scan" ? require("../src/api/playlistContainsTrack.ts") : {};
fixture({ playlists: 120, tracks: 2500 });
const tick = () => new Promise((r) => setImmediate(r));
async function settle() {
  for (let i = 0; i < 80; i++) {
    await act(tick);
    sample();
  }
}
(async () => {
  global.gc?.();
  const startHeap = process.memoryUsage().heapUsed;
  stats.peakHeap = startHeap;
  const timer = setInterval(sample, 1);
  let renderer;
  if (scenario === "navigation") {
    const Library = require("../src/yourLibrary.tsx").default;
    const { TracksList } = require("../src/components/TracksList.tsx");
    for (let visit = 0; visit < 25; visit++) {
      for (const element of [
        React.createElement(Library),
        React.createElement(TracksList, { album: { id: "album", name: "Album" } }),
        React.createElement(PlaylistPicker, { uri: "spotify:track:target" }),
      ]) {
        await act(async () => {
          renderer = create(element);
        });
        await settle();
        if (element.type === PlaylistPicker) {
          await act(async () => renderer.root.findByType("List").props.onSelectionChange(`p${visit}`));
          await settle();
        }
        await act(async () => renderer.unmount());
        renderer = undefined;
      }
    }
  } else if (scenario === "scan") {
    await playlistContainsTrack("p119", "missing");
  } else {
    const element =
      scenario === "picker"
        ? React.createElement(PlaylistPicker, { uri: "spotify:track:target" })
        : React.createElement(TrackActionPanel, { title: "Fixture", track: track("target") });
    await act(async () => {
      renderer = create(element);
    });
    await settle();
    if (scenario === "picker") {
      await act(async () => renderer.root.findByType("List").props.onSelectionChange("p119"));
      await settle();
    }
  }
  sample();
  if (renderer) await act(async () => renderer.unmount());
  global.gc?.();
  clearInterval(timer);
  console.log(
    JSON.stringify({
      variant: process.env.BASELINE_REF ? "before" : "after",
      scenario,
      startHeapMiB: startHeap / 2 ** 20,
      peakHeapMiB: stats.peakHeap / 2 ** 20,
      endHeapMiB: process.memoryUsage().heapUsed / 2 ** 20,
      calls: stats.calls,
      peakConcurrent: stats.peakActive,
      serializedMiB: stats.cacheBytes / 2 ** 20,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
