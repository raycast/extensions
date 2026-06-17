import type { LaunchProps } from "@raycast/api";
import { getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { savePage, isValidUrl, extractUrls } from "./lib";

type WaybackArguments = {
  url: string;
};

export default async function main(props: LaunchProps<{ arguments: WaybackArguments }>) {
  if (props.arguments.url && isValidUrl(props.arguments.url)) {
    await savePage(props.arguments.url);
    return;
  }

  try {
    const selectedText = await getSelectedText();
    const urls = extractUrls(selectedText);

    if (urls.length === 0) {
      await showFailureToast("No domain found");
      return;
    }

    await savePage(urls[0]);
  } catch (error) {
    await showFailureToast(error, { title: "No URL provided or selected" });
  }
}
