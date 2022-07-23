import { showToast, ToastStyle } from "@raycast/api";
import { contents, update } from "./util/clipboard";
export default async () => {
  try {
    const clipboard = await contents();
    const decoded = Buffer.from(clipboard, "base64").toString("utf8");
    await update(decoded);
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Decode failed", e);
    }
  }
};
