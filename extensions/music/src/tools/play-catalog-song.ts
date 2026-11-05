import type { Tool } from "@raycast/api";
import * as E from "fp-ts/Either";
import { withAppleMusicAuth } from "../util/apple-music-auth";
import { getCatalogSong } from "../util/catalog-api";
import { playCatalogSong } from "../util/catalog-playback";
import { catalogPlaybackUrl } from "../util/scripts/catalog";

type Input = {
  /** Exact song ID returned by search-catalog. Never use a library ID or invent one. */
  songId: string;
};

export const confirmation: Tool.Confirmation<Input> = withAppleMusicAuth(async (input: Input) => {
  const result = await getCatalogSong(input.songId)();
  if (E.isLeft(result)) throw result.left;
  const song = result.right;
  catalogPlaybackUrl(song);
  return {
    message: `Play "${song.title}" by ${song.artist} in Music? This replaces the current playback queue without adding the song to your library.`,
    info: [
      { name: "Song", value: song.title },
      { name: "Artist", value: song.artist },
      { name: "Album", value: song.album },
    ],
  };
});

export default withAppleMusicAuth(async function play(input: Input) {
  const result = await getCatalogSong(input.songId)();
  if (E.isLeft(result)) throw result.left;
  // Keep AI Chat open; closing Raycast can reactivate Music if it was the previous app.
  const played = await playCatalogSong(result.right)();
  if (E.isLeft(played)) throw played.left;
  return { playing: true, songId: result.right.id, title: result.right.title, artist: result.right.artist };
});
