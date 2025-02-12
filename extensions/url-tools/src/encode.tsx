import { showToast, Toast } from "@raycast/api";
import { contents, update } from "./util/clipboard";
export default async () => {
  try {
    const clipboard = await contents();
    const encoded = encodeURIComponent(clipboard);
    await update(encoded);
  } catch (e) {
    if (typeof e === "string") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Encode failed",
        message: e,
      });
    }
  }
};
