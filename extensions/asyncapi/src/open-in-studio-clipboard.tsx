import { Toast, showToast } from "@raycast/api";
import { openStudio, runShellScript } from "./utils";

export default async () => {
  const clipboard = await runShellScript("pbpaste");
  clipboard.length > 0 ? await openStudio(clipboard) : await showToast(Toast.Style.Failure, "Your clipboard is empty");
};
