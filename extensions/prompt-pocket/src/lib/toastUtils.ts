import { showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../types/errors";

/**
 * 成功メッセージを表示
 */
export async function showSuccessToast(
  title: string,
  message?: string,
): Promise<void> {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

/**
 * エラーメッセージを表示
 */
export async function showErrorToast(
  title: string,
  error: unknown,
): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: getErrorMessage(error),
  });
}

/**
 * ローディングメッセージを表示
 */
export async function showLoadingToast(title: string): Promise<void> {
  await showToast({
    style: Toast.Style.Animated,
    title,
  });
}

/**
 * 警告メッセージを表示
 */
export async function showWarningToast(
  title: string,
  message?: string,
): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}
