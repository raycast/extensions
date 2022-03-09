import { Toast, showToast, closeMainWindow } from "@raycast/api";
import { runShellScript, validateAsyncAPIDocument } from "./utils";

export default async () => {
  await showToast(Toast.Style.Animated, "Validating your AsyncAPI document...");
  const clipboard = await runShellScript("pbpaste");
  clipboard.length > 0
    ? await validateAsyncAPIDocument(clipboard)
    : await showToast(Toast.Style.Failure, "Your clipboard is empty");
};
