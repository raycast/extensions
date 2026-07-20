import { Clipboard, closeMainWindow, getPreferenceValues, PopToRootType, showHUD, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import download from "image-downloader";
import isUrl from "is-url";
import { nanoid } from "nanoid";
import os from "os";
import path from "path";
import type { FaviconResult } from "./types";

export default async function copyFavicon(props: { arguments: Arguments.Copy }) {
  const preferences = await getPreferenceValues();

  let url = props.arguments.url;
  if (!url.includes("https://")) {
    url = "https://" + url;
  }

  const toast = new Toast({
    title: "Copying favicon...",
    message: url,
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!isUrl(url)) {
    toast.title = "Invalid URL";
    toast.style = Toast.Style.Failure;
    return;
  }

  try {
    const destination = path.join(os.tmpdir(), `${nanoid()}.png`);
    const favicon = (await getFavicon(url, { size: preferences.defaultIconSize })) as FaviconResult;

    await download.image({
      url: favicon.source,
      dest: destination,
    });

    await Clipboard.copy({
      file: destination,
    });

    toast.title = "Favicon copied";
    toast.style = Toast.Style.Success;

    await showHUD("Favicon copied");
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    toast.title = "Failed to copy favicon";
    toast.message = (error as Error).message;
    toast.style = Toast.Style.Failure;
  }
}
