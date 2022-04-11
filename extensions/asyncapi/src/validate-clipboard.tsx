import { Toast, showToast, Clipboard } from "@raycast/api";
import { validateAsyncAPIDocument } from "./utils";

export default async () => {
  await showToast(Toast.Style.Animated, "Validating your AsyncAPI document...");
  const text = await Clipboard.readText();
  text && text.length > 0
    ? await validateAsyncAPIDocument(text)
    : await showToast(Toast.Style.Failure, "Your clipboard is empty");
};
