import { Clipboard, closeMainWindow, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/.+/;

export default async function Command() {
  const clipboard = await Clipboard.readText();
  const url = clipboard?.trim() || "";

  if (!url) {
    await showFailureToast("Copy a GitHub URL first", {
      title: "Nothing in clipboard",
    });
    return;
  }

  if (!GITHUB_URL_REGEX.test(url)) {
    await showFailureToast(
      "Clipboard must contain a GitHub URL (https://github.com/...)",
      {
        title: "Invalid clipboard content",
      },
    );
    return;
  }

  const devUrl = url.replace("github.com", "github.dev");
  await open(devUrl);
  await closeMainWindow();
  await showHUD("Opened in browser");
}
