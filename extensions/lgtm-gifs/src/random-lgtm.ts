import { showHUD, Clipboard } from "@raycast/api";
import { getRandomLGTMGif } from "../lib/gifs";

export default async function main(): Promise<void> {
  try {
    const randomGif = getRandomLGTMGif();
    const markdown = `![${randomGif.title}](${randomGif.url})`;

    await Clipboard.copy(markdown);
    await showHUD(`Copied "${randomGif.title}" to clipboard`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to get LGTM gif" });
  }
}
