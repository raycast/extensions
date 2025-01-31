export function formatTitle(
  name: string | undefined,
  artist: string | undefined,
  max: number,
  showArtist: boolean,
  showEllipsis = true,
) {
  if (max === 0) {
    return "";
  }

  if (!name || !artist) {
    return "";
  }

  const title = showArtist ? `${name} - ${artist}` : name;

  if (title.length <= max) {
    return title;
  }

  return title.substring(0, max).trim() + (showEllipsis ? "…" : "");
}
