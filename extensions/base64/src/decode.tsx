import { showToast, ToastStyle } from "@raycast/api";
import { contents, update } from "./util/clipboard";
import { decode, isValid } from "js-base64";
export default async () => {
  try {
    const clipboard = await contents();
    if (!isValid(clipboard)) throw "not a valid base64 string";
    const decoded = decode(clipboard);
    await update(decoded);
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Decode failed", e);
    }
  }
};
