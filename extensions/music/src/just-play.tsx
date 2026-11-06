import { closeMainWindow, LaunchProps } from "@raycast/api";
import * as E from "fp-ts/Either";

import { parseTrackSearchResults } from "./util/search-tracks";
import * as music from "./util/scripts";
import { hud } from "./util/feedback";
import { withAppleMusicAuth } from "./util/apple-music-auth";
import { searchCatalog } from "./util/catalog-api";
import { playCatalogSong } from "./util/catalog-playback";

const playFromCatalog = withAppleMusicAuth(async (props: LaunchProps<{ arguments: Arguments.JustPlay }>) => {
  const results = await searchCatalog(props.arguments.query.trim())();
  if (E.isLeft(results)) throw results.left;
  const song = results.right.songs.find((candidate) => candidate.playable && candidate.url);
  if (!song) throw new Error(`No playable catalog results for "${props.arguments.query}"`);
  await closeMainWindow();
  const played = await playCatalogSong(song)();
  if (E.isLeft(played)) throw played.left;
});

export default async (props: LaunchProps<{ arguments: Arguments.JustPlay }>) => {
  const query = props.arguments.query.trim();
  if (!query) {
    await hud("Enter a song title or artist.");
    return;
  }
  try {
    const result = await music.track.search(query)();
    if (E.isLeft(result)) throw result.left;
    const track = parseTrackSearchResults(result.right, query)[0];
    if (!track?.id) {
      await playFromCatalog(props);
      return;
    }
    await closeMainWindow();
    const played = await music.track.playById(track.id)();
    if (E.isLeft(played)) throw played.left;
    await hud(`Playing ${track.name} by ${track.artist}`);
  } catch (error) {
    await hud(E.toError(error).message);
  }
};
