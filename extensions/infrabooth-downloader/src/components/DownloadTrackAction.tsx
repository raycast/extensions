import { Action, Icon } from "@raycast/api";
import { sendWithToast } from "../lib/commands";
import { crossPlatformShortcut } from "../lib/shortcuts";
import type { RemoteTrack } from "@/lib/remote-protocol";

export function DownloadTrackAction({ track }: { track: RemoteTrack }) {
  return (
    <Action
      title="Download"
      icon={Icon.Download}
      shortcut={crossPlatformShortcut(["cmd"], "d")}
      onAction={() => sendWithToast({ type: "downloadTrack", track }, `Downloading “${track.title}”`)}
    />
  );
}
