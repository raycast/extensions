import { showToast, Toast, Clipboard } from "@raycast/api";
import { bookmarkUrl } from "./matterApi";

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
  let result: { success: boolean; message: string; error?: string } = {
    success: false,
    message: "",
  };

  if (!clipboard || !isValidUrl(clipboard)) {
    result = { success: false, message: "No valid URL in clipboard" };
  } else {
    try {
      const res = await bookmarkUrl(clipboard);
      if (res.status && res.status >= 200 && res.status < 300) {
        result = { success: true, message: "Bookmarked!" };
      } else if (res.detail === "Given token not valid for any token type") {
        result = { success: false, message: "Token not valid", error: "Please check your token in preferences" };
      } else {
        const errorMsg = res.detail || res.raw || JSON.stringify(res);
        result = { success: false, message: "Error", error: errorMsg };
      }
    } catch (e) {
      result = { success: false, message: "Error", error: String(e) };
    }
  }

  if (result.success) {
    await showToast(Toast.Style.Success, result.message, clipboard);
  } else {
    await showToast(Toast.Style.Failure, result.message, result.error);
  }
}
