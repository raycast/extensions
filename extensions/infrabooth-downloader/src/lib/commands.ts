import { showHUD, showToast, Toast } from "@raycast/api";
import { getPlaylistTracks, getState, sendCommand } from "./api";
import { buildDownloadCommand, formatTrackCount } from "./downloadLink";
import { handleError } from "./feedback";
import type { LibraryPlaylist } from "./mapping";
import { resolvedTitle, type ResolvedLink } from "./resolveLink";
import type { RemoteCommand, RemoteTrack } from "../shared/remote-protocol";

const SEND_FAILED = "Could not reach InfraBooth Downloader";

export async function sendWithToast(command: RemoteCommand, title: string): Promise<void> {
  try {
    await sendCommand(command);
    await showToast({ style: Toast.Style.Success, title });
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

export async function sendControl(command: RemoteCommand): Promise<void> {
  try {
    await sendCommand(command);
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

export async function playNow(tracks: RemoteTrack[], startIndex: number): Promise<void> {
  try {
    await sendCommand({ type: "playTracks", tracks, startIndex });
    await showHUD(`Playing ${tracks[startIndex]?.title ?? ""}`);
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

async function loadPlaylistTracks(playlist: LibraryPlaylist): Promise<{ toast: Toast; tracks: RemoteTrack[] } | null> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Loading ${playlist.title}…` });
  const tracks = await getPlaylistTracks(playlist.id, playlist.secretToken);
  if (tracks.length === 0) {
    toast.style = Toast.Style.Failure;
    toast.title = `${playlist.title} has no playable tracks`;
    return null;
  }
  return { toast, tracks };
}

export async function queuePlaylist(playlist: LibraryPlaylist): Promise<void> {
  try {
    const loaded = await loadPlaylistTracks(playlist);
    if (!loaded) return;
    const { toast, tracks } = loaded;
    await sendCommand({ type: "queueTracks", tracks });
    toast.style = Toast.Style.Success;
    toast.title = `Added ${formatTrackCount(tracks.length, tracks.length)} to queue`;
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

export async function playPlaylist(playlist: LibraryPlaylist): Promise<void> {
  try {
    const loaded = await loadPlaylistTracks(playlist);
    if (!loaded) return;
    const { toast, tracks } = loaded;
    await toast.hide();
    await playNow(tracks, 0);
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

const QUEUE_BUSY_TITLE = "A download is already in progress in InfraBooth Downloader";

async function canStartPlaylist(link: ResolvedLink): Promise<boolean> {
  if (link.kind !== "playlist") return true;
  if (link.playlist.tracks.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: `${link.playlist.title} has no downloadable tracks` });
    return false;
  }
  if ((await getState()).downloadQueueBusy) {
    await showToast({ style: Toast.Style.Failure, title: QUEUE_BUSY_TITLE });
    return false;
  }
  return true;
}

export async function startLinkDownload(
  link: ResolvedLink,
  outputDir: string | undefined,
  destinationLabel: string,
): Promise<void> {
  try {
    if (!(await canStartPlaylist(link))) return;
    await sendCommand(buildDownloadCommand(link, outputDir));
    await showHUD(`Downloading ${resolvedTitle(link)} → ${destinationLabel}`);
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}
