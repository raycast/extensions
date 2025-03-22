import type { LaunchProps } from "@raycast/api";
import { getSelectedText, showToast, Toast } from "@raycast/api";
import { savePage, urlRegex } from "./lib";

type WaybackArguments = {
  url: string;
};

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
