import { closeMainWindow } from "@raycast/api";
import * as E from "fp-ts/Either";
import { withAppleMusicAuth } from "../util/apple-music-auth";
import { getCatalogSong } from "../util/catalog-api";
import { playCatalogSong } from "../util/scripts/catalog";

type Input = {
  /** Exact song ID returned by search-catalog. Never use a library ID or invent one. */
  songId: string;
};

export default withAppleMusicAuth(async function play(input: Input) {
  const result = await getCatalogSong(input.songId)();
  if (E.isLeft(result)) throw result.left;
  await closeMainWindow();
  const played = await playCatalogSong(result.right)();
  if (E.isLeft(played)) throw played.left;
  return { playing: true, songId: result.right.id, title: result.right.title, artist: result.right.artist };
});
