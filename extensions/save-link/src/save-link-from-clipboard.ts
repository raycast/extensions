import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { createAndCopyWeblocFile, extractDomainFromUrl, extractUrlFromText } from "./utils";

interface Arguments {
  title?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  const { title: customTitle } = props.arguments;

  try {
    // Read clipboard content
    const clipboardContent = await Clipboard.read();

    if (!clipboardContent.text) {
      await showHUD("❌ No text found in clipboard");
      return;
    }

    // Extract URL from clipboard text
    const url = extractUrlFromText(clipboardContent.text);

    if (!url) {
      await showHUD("❌ No valid URL found in clipboard");
      return;
    }

    // Create and copy webloc file using the abstracted function
    await createAndCopyWeblocFile({
      url,
      customTitle,
      fallbackTitle: extractDomainFromUrl(url),
      titleSource: "domain name",
    });
  } catch (error) {
    console.error("Error creating webloc file from clipboard:", error);
    await showHUD(`❌ Failed to create webloc file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
