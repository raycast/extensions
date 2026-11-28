import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";
import { StorageUnreadableError } from "@/core/fs/storage";
import { strings } from "@/strings";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 复制到剪贴板后关窗并显示 HUD。复制类操作都用它，提示文字统一是「对象 + Copied」。 */
export async function copyWithHud(content: string | { file: string }, title: string): Promise<void> {
  await Clipboard.copy(content);
  await showHUD(title);
}

/** 失败提示里的 Copy Error：复制标题和完整错误（含调用栈），反馈问题时直接粘贴。 */
export function copyErrorAction(title: string, error: unknown): Toast.ActionOptions {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  return { title: strings.copyError, onAction: () => void Clipboard.copy(`${title}\n${detail}`) };
}

/** 出错时的统一提示：标题只写结论，message 写原因，⌘T 里有 Copy Error。
 *  - error 是 StorageUnreadableError：换成存储读不出的标题和说明，调用方不用自己判断。
 *  - message 不传时用错误信息本身。
 *  - action：有明确的下一步（如打开设置）时传入，作为主操作；Copy Error 退到第二个。 */
export function showFailure(
  title: string,
  error: unknown,
  options: { message?: string; action?: Toast.ActionOptions } = {},
): Promise<Toast> {
  const storage = error instanceof StorageUnreadableError;
  const heading = storage ? strings.storageUnreadable : title;
  const copy = copyErrorAction(heading, error);
  return showToast({
    style: Toast.Style.Failure,
    title: heading,
    message: storage ? strings.storageUnreadableHint : (options.message ?? errorMessage(error)),
    primaryAction: options.action ?? copy,
    secondaryAction: options.action ? copy : undefined,
  });
}
