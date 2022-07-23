import { Clipboard, open, showHUD } from "@raycast/api";
import { getAppLinkFromWebLink } from "./utils/getAppLinkFromWebLink";

export default async function main() {
  const clipboardText = await Clipboard.readText();
  try {
    const appLink = await getAppLinkFromWebLink(clipboardText);
    if (appLink) {
      await open(appLink);
    }
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
    }
  }
}
