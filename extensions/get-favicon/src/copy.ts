import { Clipboard, closeMainWindow, PopToRootType, showHUD, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import download from "image-downloader";
import tempfile from "tempfile";
import isUrl from "is-url";

interface Arguments {
  url: string;
}

export default async function copyFavicon(props: { arguments: Arguments }) {
  const url = props.arguments.url;

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
  const favicon = await getFavicon(url);

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
