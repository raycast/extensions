import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import { fetchFile, request } from "./api";
import { mediaDownloadSchema, SavedMedia } from "./schemas";

const FALLBACK_EXTENSIONS: Record<string, string> = { photo: "jpg", video: "mp4", animated_gif: "mp4" };

export function mediaFileName({ mediaUrl, mediaType, tweetId }: SavedMedia, index: number): string {
  const extension = extname(new URL(mediaUrl).pathname).slice(1) || FALLBACK_EXTENSIONS[mediaType];
  return `xquik-${tweetId}-${index}.${extension}`;
}

export async function saveMedia(post: string, folder = join(homedir(), "Downloads")): Promise<string[]> {
  const { items } = await request(mediaDownloadSchema, "/x/media/download", {
    method: "POST",
    body: { tweetInput: post },
  });
  await mkdir(folder, { recursive: true });
  return Promise.all(
    items.map(async (item, index) => {
      const path = join(folder, mediaFileName(item, index));
      await writeFile(path, await fetchFile(item.mediaUrl));
      return path;
    }),
  );
}
