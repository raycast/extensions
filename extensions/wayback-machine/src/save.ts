import { LaunchProps, getSelectedText, showToast, Toast } from "@raycast/api";
import fetch from "cross-fetch";

type WaybackArguments = {
  url: string;
};

const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

export default async function main(props: LaunchProps<{ arguments: WaybackArguments }>) {
  if (props.arguments.url && urlRegex.test(props.arguments.url)) {
    await savePage(props.arguments.url);
    return;
  }

  try {
    const selectedText = await getSelectedText();

    if (!urlRegex.test(selectedText)) {
      await showToast({ style: Toast.Style.Failure, title: "No domain found" });
      return;
    }

    await savePage(selectedText);
  } catch (error) {
    console.error(error);
  }
}

async function savePage(webpageUrl: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Wayback Machine" });

  try {
    const res = await fetch(`https://web.archive.org/save/${webpageUrl}`);

    if (res.status >= 400) {
      console.log(await res.text());
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save to Wayback Machine";
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Saved to Wayback Machine";
  } catch (err) {
    console.log(err);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save to Wayback Machine";
  }
}
