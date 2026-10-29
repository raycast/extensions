import { environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import path from "path";
import { gitlab } from "../common";
import { fileExistsSync } from "../utils";

const AVATAR_DOWNLOAD_CONCURRENCY = 6;

// shared by all `useAvatars` instances, so list rows don't each start their own downloads
let activeAvatarDownloads = 0;
const pendingAvatarDownloads: (() => void)[] = [];

async function withAvatarDownloadSlot<T>(download: () => Promise<T>): Promise<T> {
  if (activeAvatarDownloads >= AVATAR_DOWNLOAD_CONCURRENCY) {
    await new Promise<void>((resolve) => pendingAvatarDownloads.push(resolve));
  }
  activeAvatarDownloads++;
  try {
    return await download();
  } finally {
    activeAvatarDownloads--;
    pendingAvatarDownloads.shift()?.();
  }
}

/**
 * Avatars of private projects and groups are only served with authentication, and `/uploads/...`
 * web URLs ignore API tokens, so they are downloaded via the API avatar endpoints
 * (`/projects/:id/avatar`, `/groups/:id/avatar`) into the extension support directory.
 * Other avatars (users, Gravatar, ...) are public and used as remote URLs.
 */
async function localAvatarSource(avatarUrl: string): Promise<string> {
  const url = new URL(gitlab.joinUrl(avatarUrl));
  const match = url.pathname.match(/\/uploads\/-\/system\/(project|group)\/avatar\/(\d+)\//);
  if (url.origin !== new URL(gitlab.joinUrl("/")).origin || !match) {
    return url.href;
  }
  const localFilepath = path.join(
    environment.supportPath,
    "avatars",
    `${crypto.createHash("sha1").update(url.href).digest("hex")}${path.extname(url.pathname)}`,
  );
  if (fileExistsSync(localFilepath)) {
    return localFilepath;
  }
  await fs.mkdir(path.dirname(localFilepath), { recursive: true });
  await withAvatarDownloadSlot(() =>
    gitlab.downloadFile(gitlab.joinUrl(`/api/v4/${match[1]}s/${match[2]}/avatar`), {
      localFilepath: `${localFilepath}.download`,
    }),
  );
  await fs.rename(`${localFilepath}.download`, localFilepath);
  return localFilepath;
}

/** Returns a map from avatar URL to an image source that can be shown without authentication. */
export function useAvatars(avatarUrls: (string | undefined)[]): Record<string, string> {
  const { data } = useCachedPromise(
    async (urls: string[]): Promise<Record<string, string>> => {
      const sources: Record<string, string> = {};
      await Promise.all(
        urls.map(async (avatarUrl) => {
          try {
            sources[avatarUrl] = await localAvatarSource(avatarUrl);
          } catch {
            // keep the text icon fallback for avatars that can't be downloaded
          }
        }),
      );
      return sources;
    },
    [[...new Set(avatarUrls.filter((avatarUrl): avatarUrl is string => !!avatarUrl))].sort()],
    { initialData: {}, keepPreviousData: true },
  );
  return data;
}
