import type { LaunchProps } from "@raycast/api";
import { getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
      await showFailureToast("No domain found");
      return;
    }

    await savePage(selectedText);
  } catch (error) {
    await showFailureToast(error, { title: "Could not get selected text" });
  }
}
