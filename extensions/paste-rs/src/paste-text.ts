import { Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { createAndCopyPaste } from "./copy-paste";

export async function pasteText(
  readContent: () => Promise<string | undefined>,
  emptyTitle: string,
  emptyMessage: string,
  confirm?: (content: string) => Promise<boolean>,
) {
  let toast: Toast | undefined;
  try {
    const content = await readContent();
    if (!content?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: emptyTitle, message: emptyMessage });
      return;
    }
    if (confirm && !(await confirm(content))) return;

    toast = await showToast({ style: Toast.Style.Animated, title: "Creating paste" });
    const { language = "" } = getPreferenceValues<Preferences>();
    const result = await createAndCopyPaste(content, language);
    if (!result.historySaved) {
      toast.style = Toast.Style.Failure;
      toast.title = result.partial
        ? "Partial paste URL copied; history unavailable"
        : "Paste URL copied; history unavailable";
      toast.message = result.url;
      return;
    }
    await toast.hide();
    await showHUD(result.partial ? "Paste partially uploaded, URL copied" : "Paste URL copied");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create paste";
      toast.message = message;
    } else {
      await showToast({ style: Toast.Style.Failure, title: "Could not read text", message });
    }
  }
}
