import { join, sep } from "node:path";
import type { RemoteCommand } from "@/lib/remote-protocol";
import { ApiError } from "./api";
import type { ResolvedLink } from "./resolveLink";

const SOUNDCLOUD_LINK = /^(?:https?:\/\/)?(?:www\.|on\.)?soundcloud\.com\/\S+$/i;

export function extractSoundCloudLink(text: string | undefined): string | undefined {
  const candidate = text?.trim();
  return candidate && SOUNDCLOUD_LINK.test(candidate) ? candidate : undefined;
}

export function shortenHome(path: string, home: string, separator: string = sep): string {
  if (path === home) return "~";
  return path.startsWith(`${home}${separator}`) ? `~${path.slice(home.length)}` : path;
}

export function defaultDownloadDir(appDownloadPath: string, home: string): string {
  return appDownloadPath || join(home, "Downloads");
}

export function outputDirOverride(picked: string, appDownloadPath: string, home: string): string | undefined {
  return picked === defaultDownloadDir(appDownloadPath, home) ? undefined : picked;
}

export function buildDownloadCommand(link: ResolvedLink, outputDir: string | undefined): RemoteCommand {
  const target = outputDir ? { outputDir } : {};
  if (link.kind === "track") {
    return {
      type: "downloadTrack",
      track: link.track,
      secretToken: link.secretToken,
      downloadUrl: link.downloadUrl,
      ...target,
    };
  }
  return { type: "downloadPlaylist", title: link.playlist.title, tracks: link.playlist.tracks, ...target };
}

export function formatTrackCount(available: number, total: number): string {
  const unit = total === 1 ? "track" : "tracks";
  return available === total ? `${total} ${unit}` : `${available} of ${total} ${unit}`;
}

export function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.detail) return error.detail;
  return error instanceof Error ? error.message : String(error);
}
