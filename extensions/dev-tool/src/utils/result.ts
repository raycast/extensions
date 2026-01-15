// src/utils/result.ts
import { Clipboard, showToast, Toast } from "@raycast/api";

type SuccessOptions = {
  title?: string;
  message?: string;
  copy?: boolean; // 是否自动复制
};

export async function success(result: string, options: SuccessOptions = {}) {
  const { title = "成功", message = result, copy = true } = options;

  if (copy) {
    await Clipboard.copy(result);
  }

  await showToast({
    title,
    message,
    style: Toast.Style.Success,
  });
}

export async function failure(err: unknown, title = "失败") {
  const message = err instanceof Error ? err.message : String(err ?? "未知错误");

  await showToast({
    title,
    message,
    style: Toast.Style.Failure,
  });
}
