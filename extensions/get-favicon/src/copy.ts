import { Clipboard, closeMainWindow, getPreferenceValues, PopToRootType, showHUD, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import download from "image-downloader";
import isUrl from "is-url";
import tempfile from "tempfile";
import { Arguments, Preferences } from "./common";
export default async function copyFavicon(props: { arguments: Arguments }) {
  const preferences = await getPreferenceValues<Preferences>();

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

  const destination = tempfile(".png");
  const favicon = await getFavicon(url, { size: preferences.default_icon_size });

  await download.image({
    url: (favicon as any).source,
    dest: destination,
  });

  await Clipboard.copy({
    file: destination,
  });

  toast.title = "Favicon copied";
  toast.style = Toast.Style.Success;

  await showHUD("Favicon copied");
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
}
