import { showToast, ToastStyle } from "@raycast/api";
import { contents, update } from "./util/clipboard";
export default async () => {
  try {
    const clipboard = await contents();
    const encoded = Buffer.from(clipboard, "utf8").toString("base64");
    await update(encoded);
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Encode failed", e);
    }
  }
};
