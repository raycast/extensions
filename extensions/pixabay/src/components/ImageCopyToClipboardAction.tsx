import fs from "fs";
import path from "path";

import { Action, Clipboard, Color, Icon, Toast, showToast } from "@raycast/api";

import type { Hit } from "@/types";

import { getLargeFileExtension } from "@/lib/images";
import { getDownloadFolder } from "@/lib/prefs";
import { getErrorMessage } from "@/lib/utils";

export default function ImageCopyToClipboardAction(props: {
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

      const fileContent: Clipboard.Content = { file: localFilename };
      await Clipboard.copy(fileContent);

      await showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: filename,
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Download Failed", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      // eslint-disable-next-line @raycast/prefer-title-case
      title={`Copy Image - ${hit.imageWidth} x ${hit.imageHeight}`}
      onAction={handle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      icon={{ source: Icon.CopyClipboard, tintColor: Color.PrimaryText }}
    />
  );
}
