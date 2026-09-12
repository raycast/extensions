import fs from "fs";
import path from "path";

import { Action, Color, Icon, Toast, showInFinder, showToast } from "@raycast/api";

import type { Video, VideoHit, Videos } from "@/types";

import { Pixabay } from "@/lib/api";
import { getDownloadFolder, showInFolderAfterDownload } from "@/lib/prefs";
import { getErrorMessage, resolveFilepath } from "@/lib/utils";

export default function VideoDownloadAction(props: {
  video: Video | undefined;
  size: keyof Videos;
  title: string;
  hit: VideoHit;
}): JSX.Element | null {
  const v = props.video;
  if (!v) {
    return null;
  }
  const hit = props.hit;
  const firstTag = hit.tags.split(",")[0];
  const filename = `${firstTag} - ${hit.id} - ${props.size}.mp4`;
  const handle = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Downloading" });
    try {
      const downloadFolder = getDownloadFolder();
      fs.mkdirSync(downloadFolder, { recursive: true });
      const downloadFilename = path.join(downloadFolder, filename);
      await Pixabay.downloadFile(v.url, { localFilepath: resolveFilepath(downloadFilename) });
      await showToast({
        style: Toast.Style.Success,
        title: "Download succeeded",
        message: `${downloadFilename}`,
        primaryAction: {
          title: "Show in Finder",
          onAction: (toast) => {
            showInFinder(downloadFilename);
            toast.hide();
          },
        },
      });
      if (showInFolderAfterDownload()) {
        await showInFinder(downloadFilename);
      }
    } catch (error) {
      const e = getErrorMessage(error);
      await showToast({ style: Toast.Style.Failure, title: "Download failed", message: e });
    }
  };
  return (
    <Action
      // eslint-disable-next-line @raycast/prefer-title-case
      title={`Download ${props.title} - ${v.width} x ${v.height}`}
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
      onAction={handle}
    />
  );
}
