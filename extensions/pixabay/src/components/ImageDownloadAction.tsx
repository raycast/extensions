import fs from "fs";
import path from "path";

import { Action, Color, Icon, Toast, showInFinder, showToast } from "@raycast/api";

import type { Hit } from "@/types";

import { getLargeFileExtension } from "@/lib/images";
import { getDownloadFolder, showInFolderAfterDownload } from "@/lib/prefs";
import { getErrorMessage } from "@/lib/utils";

export default function ImageDownloadAction(props: {
  localFilepath: string | undefined;
  hit: Hit;
}): JSX.Element | null {
  const hit = props.hit;
  const lfp = props.localFilepath;
  if (!lfp || !fs.existsSync(lfp)) {
    return null;
  }
  const handle = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Downloading" });
    try {
      const [firsttag] = hit.tags.split(",");
      const filename = `${firsttag} - ${hit.id}.${getLargeFileExtension(hit)}`;
      const downloadFolder = getDownloadFolder();
      fs.mkdirSync(downloadFolder, { recursive: true });
      const localFilename = path.join(downloadFolder, filename);
      fs.copyFileSync(lfp, localFilename);
      await showToast({
        style: Toast.Style.Success,
        title: "Download Succeeded",
        message: localFilename,
        primaryAction: {
          title: "Show in Finder",
          onAction: (toast) => {
            showInFinder(localFilename);
            toast.hide();
          },
        },
      });
      if (showInFolderAfterDownload()) {
        await showInFinder(localFilename);
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Download Failed", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      // eslint-disable-next-line @raycast/prefer-title-case
      title={`Download Image - ${hit.imageWidth} x ${hit.imageHeight}`}
      onAction={handle}
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
    />
  );
}
