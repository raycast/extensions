import { LocalStorage } from "@raycast/api";

export default async function removeTrackFromPlaylistCache(playlistId: string, trackUri: string) {
  const cacheKey = `playlistItems_${playlistId}`;
  const cacheTimestampKey = `${cacheKey}_cachedAt`;

  const cached = await LocalStorage.getItem<string>(cacheKey);
  if (!cached) return;

  try {
    const parsed: string[] = JSON.parse(cached);
    const updated = parsed.filter((uri) => uri !== trackUri);

    await Promise.all([
      LocalStorage.setItem(cacheKey, JSON.stringify(updated)),
      LocalStorage.setItem(cacheTimestampKey, Date.now().toString()),
    ]);
  } catch (e) {
    console.warn("Failed to update playlist cache:", e);
  }
}
