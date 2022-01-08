import { showToast, ToastStyle } from "@raycast/api";
import { contents, update } from "./util/clipboard";
import { encode } from "js-base64";
export default async () => {
  try {
    const clipboard = await contents();
    const encoded = encode(clipboard);
    await update(encoded);
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Encode failed", e);
    }
  }
};
