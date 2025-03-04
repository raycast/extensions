import {
  closeMainWindow,
  getPreferenceValues,
  LaunchProps,
  PopToRootType,
  showHUD,
  showInFinder,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import download from "image-downloader";
import isUrl from "is-url";
import { nanoid } from "nanoid";
import path from "path";

export default async function downloadFavicon(props: LaunchProps<{ arguments: Arguments.Download }>) {
  const preferences = await getPreferenceValues();

  let url = props.arguments.url;
  if (!url.includes("https://")) {
    url = "https://" + url;
  }

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

  const destination = path.join(preferences.downloadDirectory, `${nanoid()}.png`);
  const favicon = await getFavicon(url, { size: preferences.defaultIconSize });

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
