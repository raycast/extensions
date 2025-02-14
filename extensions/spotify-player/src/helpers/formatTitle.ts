type FormatTitleParams = {
  name?: string;
  artistName?: string;
  hideArtistName?: boolean;
  maxTextLength?: string;
};

export function formatTitle({ name, artistName, hideArtistName, maxTextLength }: FormatTitleParams) {
  const max = maxTextLength ? Number(maxTextLength) : 30;

  if (max === 0) {
    return "";
  }

  if (!name || !artistName) {
    return "";
  }

  const title = hideArtistName ? name : `${name} · ${artistName}`;

  if (title.length <= max) {
    return title;
  }

  return title.substring(0, max).trim() + "…";
}
