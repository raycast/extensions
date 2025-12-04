import { State } from "@lib/haapi";

export function getMediaPlayerTitleAndArtist(state: State): string | undefined {
  const title = state.attributes.media_title;
  const artist = state.attributes.media_artist;
  if (title && artist) {
    return `${artist} - ${title}`;
  }
  return undefined;
}
