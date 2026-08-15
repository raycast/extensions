import { showToast, Toast } from "@raycast/api";
import { contents, update } from "./util/clipboard";
export default async () => {
  try {
    const clipboard = await contents();
    const decoded = decodeURIComponent(clipboard);
    await update(decoded);
  } catch (e) {
    if (typeof e === "string") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Decode failed",
        message: e,
      });
    }
  }
};
