import { Clipboard, showToast, Toast, closeMainWindow } from "@raycast/api";
import { FormatterService } from "./services/formatter-service";
import { ErrorHandler } from "./services/error-handler";
import { Logger } from "./utils/logger";

export default async function FormatClipboard() {
  try {
    Logger.log("FormatClipboard: Starting");

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

    await Clipboard.copy(formatted);

    showToast({
      style: Toast.Style.Success,
      title: "格式化完成",
      message: "已复制到剪贴板",
    });

    await closeMainWindow();
    Logger.log("FormatClipboard: Completed");
  } catch (error) {
    const errorMessage = ErrorHandler.handle(error as Error, "FormatClipboard");
    showToast({
      style: Toast.Style.Failure,
      title: "格式化失败",
      message: errorMessage,
    });
  }
}
