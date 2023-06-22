import { closeMainWindow, getPreferenceValues, PopToRootType, showHUD, showInFinder, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import download from "image-downloader";
import path from "path";
import { nanoid } from "nanoid";
import isUrl from "is-url";

interface Arguments {
  url: string;
}

export default async function downloadFavicon(props: { arguments: Arguments }) {
  const url = props.arguments.url;

  const toast = new Toast({
    title: "Downloading favicon...",
    message: url,
    style: Toast.Style.Animated,
  });
  toast.show();

  if (!isUrl(url)) {
    toast.title = "Invalid URL";
    toast.style = Toast.Style.Failure;
    return;
  }

  const preferences = getPreferenceValues();

  const destination = path.join(preferences.downloadDirectory, `${nanoid()}.png`);
  const favicon = await getFavicon(url);

  await download.image({
    url: (favicon as any).source,
    dest: destination,
  });

  toast.title = "Favicon downloaded";
  toast.style = Toast.Style.Success;

  await showInFinder(destination);
  await showHUD("Favicon downloaded");
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
}
