import { Clipboard, showToast, Toast, closeMainWindow } from "@raycast/api";
import { FormatterService } from "./services/formatter-service";
import { ErrorHandler } from "./services/error-handler";
import { Logger } from "./utils/logger";

export default async function FormatAndPaste() {
  try {
    Logger.log("FormatAndPaste: Starting");

    const text = await Clipboard.readText();

    if (!text) {
      showToast({
        style: Toast.Style.Failure,
        title: "剪贴板为空",
        message: "无法读取剪贴板内容",
      });
      return;
    }

    const formatter = new FormatterService();
    const formatted = formatter.format(text);

    await Clipboard.paste(formatted);

    showToast({
      style: Toast.Style.Success,
      title: "格式化完成",
      message: "已粘贴",
    });

    await closeMainWindow();
    Logger.log("FormatAndPaste: Completed");
  } catch (error) {
    const errorMessage = ErrorHandler.handle(error as Error, "FormatAndPaste");

    try {
      showToast({
        style: Toast.Style.Failure,
        title: "粘贴失败",
        message: `${errorMessage}，内容已在剪贴板中`,
      });
    } catch {
      Logger.error("FormatAndPaste: Failed to show toast", error);
    }
  }
}
