import { Clipboard, showToast, Toast } from "@raycast/api";
import { describeConnectionError, isConnectionError } from "./connection";
import { getTranslator } from "../i18n/standalone";

export function toErrorMessage(error: unknown): string {
  // A transport failure's own message is the useless string "fetch failed";
  // the actionable detail lives on `error.cause`. Unwrap it so both the toast
  // and its Copy Error action say something worth reading.
  if (isConnectionError(error)) return describeConnectionError(error);
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Turn an existing toast into a failure, with the error copyable.
 *
 * House Style: every `Toast.Style.Failure` carries a "Copy Error" action —
 * a toast the user can't copy out of is a dead end when they want to file a
 * bug. Use this instead of setting `style`/`title`/`message` by hand.
 */
export function markToastFailed(toast: Toast, title: string, error: unknown) {
  const message = toErrorMessage(error);
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = message;
  toast.primaryAction = {
    title: getTranslator()("connection.copyError"),
    onAction: () => Clipboard.copy(message),
  };
}

export async function runWithToast<T>(options: {
  loading: { title: string; message?: string };
  success: { title: string; message?: string };
  failure: { title: string; message?: string };
  action: () => Promise<T>;
}): Promise<T | undefined> {
  const toast = await showToast({
    title: options.loading.title,
    message: options.loading.message,
    style: Toast.Style.Animated,
  });

  try {
    const result = await options.action();
    toast.style = Toast.Style.Success;
    toast.title = options.success.title;
    toast.message = options.success.message;
    return result;
  } catch (error) {
    const errorMessage = options.failure.message ?? toErrorMessage(error);
    toast.style = Toast.Style.Failure;
    toast.title = options.failure.title;
    toast.message = errorMessage;
    toast.primaryAction = {
      title: getTranslator()("connection.copyError"),
      onAction: () => Clipboard.copy(errorMessage),
    };
    return undefined;
  }
}
