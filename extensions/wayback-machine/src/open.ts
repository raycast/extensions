import { LaunchProps, closeMainWindow, getSelectedText, open, showHUD } from "@raycast/api";
import fetch from "cross-fetch";

type WaybackArguments = {
  url: string;
};

export default async function main(props: LaunchProps<{ arguments: WaybackArguments }>) {
  closeMainWindow();

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

  try {
    const res = await fetch(`https://archive.org/wayback/available?url=${webpageUrl}`);
    if (res.status >= 400) {
      return showHUD("❌ Bad response from server");
    }
    const archive = await res.json();
    if (archive.archived_snapshots?.closest?.url) {
      const url = new URL(archive.archived_snapshots.closest.url);
      await open(`https://${url.host}${url.pathname}`);
    } else {
      return showHUD("❌ No archived version found");
    }
  } catch (err) {
    return showHUD(`❌ An error occurred, try again later`);
  }
}
