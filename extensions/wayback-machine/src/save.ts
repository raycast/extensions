import { LaunchProps, closeMainWindow, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import fetch from "cross-fetch";

type WaybackArguments = {
  url: string;
};

export default async function main(props: LaunchProps<{ arguments: WaybackArguments }>) {
  const { url } = props.arguments;
  let selectedText: string | undefined;

  try {
    selectedText = await getSelectedText();
  } catch (error) {
    console.error(error);
  }

  const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;
  const webpageUrl: string | undefined = url || selectedText;
  if (webpageUrl === undefined || !urlRegex.test(webpageUrl)) {
    return showHUD("❌ No domain found");
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving to Wayback Machine",
  });

  try {
    const res = await fetch(`https://web.archive.org/save/${webpageUrl}`);
    if (res.status >= 400) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save to Wayback Machine";
    }
    toast.style = Toast.Style.Success;
    toast.title = "Saved to Wayback Machine";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save to Wayback Machine";
  }
}
