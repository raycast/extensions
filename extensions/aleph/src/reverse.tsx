import { showToast, ToastStyle, showHUD } from "@raycast/api";
import { contents, update } from "./util/clipboard";
export default async () => {
  try {
    const clipboard = await contents();
    const encoded = clipboard
      .split("\n")
      .map((line) => line.split("").reverse().join(""))
      .join("\n");
    await update(encoded);
    showHUD("Reversed text");
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Accessibility permission denied.", e);
    }
  }
};
