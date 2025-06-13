import { showToast, Toast, Clipboard } from "@raycast/api";
import { bookmarkUrl } from "./matterApi";
import { showFailureToast } from "@raycast/utils";

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default async function main() {
  const clipboard = (await Clipboard.readText()) ?? "";
  if (!clipboard || !isValidUrl(clipboard)) {
    await showToast(Toast.Style.Failure, "No valid URL in clipboard");
    return;
  }

  await showToast(Toast.Style.Animated, "Bookmarking URL...");
  try {
    const res = await bookmarkUrl(clipboard);
    if (res.status && res.status >= 200 && res.status < 300) {
      await showToast(Toast.Style.Success, "Bookmarked!", clipboard);
    } else if (res.detail === "Given token not valid for any token type") {
      await showToast(Toast.Style.Failure, "Token not valid", "Please check your token in preferences");
    } else {
      const errorMsg = res.detail || res.raw || JSON.stringify(res);
      await showToast(Toast.Style.Failure, "Error", errorMsg);
    }
  } catch (e) {
    showFailureToast(e, { title: "Error" });
  }
}
