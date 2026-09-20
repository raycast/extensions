import {
  Clipboard,
  LaunchType,
  Toast,
  getSelectedText,
  launchCommand,
  popToRoot,
  showToast,
} from "@raycast/api";
import { createTranslationContext } from "./clipboard";

export default async function Command() {
  try {
    // Capture before changing Raycast navigation, then discard the previous view.
    const context = await createTranslationContext(getSelectedText, () =>
      Clipboard.read(),
    );
    await popToRoot({ clearSearchBar: true });
    await launchCommand({
      name: "translation-view",
      type: LaunchType.UserInitiated,
      context,
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "无法打开翻译",
      message: "请确认 Translation View 命令已启用，然后重试。",
    });
  }
}
