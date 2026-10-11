import { LaunchProps, showHUD } from "@raycast/api";
import { readFavorites } from "./lib/favorites";
import { callOp, Track } from "./lib/ipc";

interface StationContext {
  name?: string;
  url?: string;
}

async function play(track: Track) {
  await callOp("track.play", { track });
  await showHUD(`▶︎ ${track.title ?? track.path}`);
}

export default async function main(
  props: LaunchProps<{ arguments: { station?: string }; launchContext?: StationContext }>,
) {
  // Quicklinks carry the exact station in launchContext — no lookup needed.
  const ctx = props.launchContext;
  if (ctx?.url) {
    await play({ title: ctx.name ?? ctx.url, path: ctx.url, stream: true, realtime: true });
    return;
  }

  const query = props.arguments.station?.trim();
  if (!query) {
    await showHUD("Give a station name, e.g. “Play Station lofi”");
    return;
  }

  // Favorites first: exact-ish match beats a directory lookup.
  const q = query.toLowerCase();
  const favorite = readFavorites().find((f) => f.name.toLowerCase().includes(q));
  if (favorite) {
    await play({ title: favorite.name, path: favorite.url, stream: true, realtime: true });
    return;
  }

  const res = await callOp<{ tracks?: Track[] }>("provider.search", {
    provider: "radio",
    query,
    offset: 0,
    limit: 1,
  });
  const hit = res.tracks?.[0];
  if (!hit) {
    await showHUD(`No station found for “${query}”`);
    return;
  }
  await play(hit);
}
