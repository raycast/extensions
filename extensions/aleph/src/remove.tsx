import { showToast, ToastStyle, showHUD } from "@raycast/api";
import { contents, update } from "./util/clipboard";
export default async () => {
  try {
    const clipboard = await contents();
    const encoded = clipboard.replace(/[\u0591-\u05C7]/g, "");
    await update(encoded);
    showHUD("Removed Nikud");
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Accessibility permission denied.", e);
    }
  }
};
