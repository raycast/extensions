import { Clipboard, closeMainWindow, PopToRootType, showHUD, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import isUrl from "is-url";

interface Arguments {
  url: string;
}

export default async function copyFavicon(props: { arguments: Arguments }) {
  let url = props.arguments.url;
  if (!url.includes("https://")) {
    url = "https://" + url;
  }

  const toast = new Toast({
    title: "Fetching favicon...",
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
    const favicon = await getFavicon(url);

    if (!favicon || !(favicon as any).source) {
      throw new Error("Favicon not found");
    }

    const faviconUrl = (favicon as any).source;

    await Clipboard.copy(faviconUrl);

    toast.title = "Favicon URL copied";
    toast.style = Toast.Style.Success;

    await showHUD("Favicon URL copied");
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    toast.title = "Failed to fetch favicon";
    toast.message = (error as Error).message;
    toast.style = Toast.Style.Failure;
  }
}
