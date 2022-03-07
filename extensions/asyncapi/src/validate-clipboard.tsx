import { Toast, showToast, closeMainWindow } from "@raycast/api";
import { runShellScript, validateAsyncAPIDocument } from "./utils";
import { setTimeout } from "timers/promises";

export default async () => {
  await showToast(Toast.Style.Animated, "Validating your AsyncAPI document...");
  const clipboard = await runShellScript("pbpaste");
  clipboard.length > 0
    ? await validateAsyncAPIDocument(clipboard)
    : await showToast(Toast.Style.Failure, "Your clipboard is empty");

  // Commands don’t get their toast handlers called when the command has already been unloaded. This is the case of `no-view` commands,
  // which they are unloaded right after they have been executed.
  // In order to let `primaryAction`to work, we need to keep the command running for a bit giving the user time for clicking the action.
  await setTimeout(20000);
  await closeMainWindow();
};
