import { Track } from "../music-assistant/external-code/interfaces";

export function getShuffleToastMessage(wasEnabled: boolean): string {
  return wasEnabled ? "Shuffle disabled" : "Shuffle enabled";
}

export function getFavoriteToastTitle(wasFavorite: boolean): string {
  return wasFavorite ? "Removed from Favorites" : "Added to Favorites";
}

export function getFavoriteActionTitle(isFavorite: boolean): string {
  return isFavorite ? "Remove from Favorites" : "Add to Favorites";
}

export function getCurrentTrackMarkdown(trackName?: string, albumArtUrl?: string): string {
  if (!trackName) {
    return "# No Track Playing\n\nNo track is currently playing on the selected player.";
  }

  let markdown = "";

  if (albumArtUrl) {
    markdown += `![Album Art](${albumArtUrl}?raycast-width=220&raycast-height=220)\n\n`;
  }

  markdown += `# ${trackName}\n\n`;
  return markdown;
}

export function formatAlbumTypeLabel(albumType: string): string {
  return albumType.charAt(0).toUpperCase() + albumType.slice(1);
}

export function getTrackPositionLabel(track: Track | null): string | null {
  if (!track) return null;

  const parts: string[] = [];
  if (track.disc_number) {
    parts.push(`Disc ${track.disc_number}`);
  }
  if (track.track_number) {
    parts.push(`Track ${track.track_number}`);
  }

  return parts.length > 0 ? parts.join(", ") : null;
}
