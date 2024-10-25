import { getSelectedText, open, showHUD } from "@raycast/api";
import extractUrls from "extract-urls";

export default async function main() {
  try {
    const selectedText = await getSelectedText();
    const urls = extractUrls(selectedText);
    await showHUD(urls.join('++'));
    if (urls.length > 0) {
      for (const url of urls) {
        await open(url, "company.thebrowser.Browser");
      }
    } else {
      await showHUD("No URLs found");
    }
  } catch (error) {
    await showHUD(String(error));
  }
}

