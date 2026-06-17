import cleanupSongTitle from "./cleanupSongTitle";

type FormatTitleParams = {
  name?: string;
  artistName?: string;
  hideArtistName?: boolean;
  cleanupTitle?: boolean;
  maxTextLength?: string;
};

export function formatTitle({ name, artistName, hideArtistName, maxTextLength, cleanupTitle }: FormatTitleParams) {
  const max = maxTextLength ? Number(maxTextLength) : 30;

  if (max === 0) {
    return "";
  }

  if (!name || !artistName) {
    return "";
  }

  const filteredName = cleanupTitle ? cleanupSongTitle(name) : name;
  const title = hideArtistName ? filteredName : `${filteredName} · ${artistName}`;

  if (title.length <= max) {
    return title;
  }

  return title.substring(0, max).trim() + "…";
}
