import { Clipboard, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { isAuthError } from "./apiError";
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
 * Give a toast the rejected-API-key treatment; false when it isn't one.
 *
 * A 401 outranks whatever the caller was going to say: "Couldn't create
 * bookmark" and "Couldn't load lists" both describe a symptom of one cause the
 * user can actually fix, and every retry from those toasts fails identically
 * until the key changes. So the title names the real problem and the primary
 * action is the fix, not a retry.
 *
 * The caller's title is DEMOTED into the message rather than dropped. On the
 * multi-step create flow it is the only thing that says the bookmark was
 * already saved and only the tag call failed — losing it would leave the user
 * assuming nothing landed and submitting the whole thing again.
 */
function applyAuthFailure(toast: Toast, error: unknown, callerTitle: string, detail: string): boolean {
  if (!isAuthError(error)) return false;
  const t = getTranslator();
  const message = `${callerTitle} — ${detail}`;
  toast.style = Toast.Style.Failure;
  toast.title = t("connection.unauthorized");
  toast.message = message;
  toast.primaryAction = { title: t("connection.openSettings"), onAction: openExtensionPreferences };
  // Copy steps down to secondary: there is nothing here to diagnose, so the
  // action that fixes it should be the one bound to ↵.
  toast.secondaryAction = { title: t("connection.copyError"), onAction: () => Clipboard.copy(message) };
  return true;
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
  if (applyAuthFailure(toast, error, title, message)) return;

  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = message;
  toast.primaryAction = {
    title: getTranslator()("connection.copyError"),
    onAction: () => Clipboard.copy(message),
  };
}

/**
 * Give a Failure toast something to copy when there is no Error to unwrap.
 *
 * `markToastFailed` covers the usual case: something threw, and the message is
 * the payload. Some failures have no exception at all — a status field flipped
 * server-side, or a call returned an empty result. House Style still requires a
 * Failure toast to be copyable, so the caller supplies the state worth pasting
 * into a bug report.
 */
export function attachCopyDetail(toast: Toast, detail: string) {
  toast.primaryAction = {
    title: getTranslator()("connection.copyError"),
    onAction: () => Clipboard.copy(detail),
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
    // Every mutation in the extension that isn't a create-form submit routes
    // through here — notes, lists, tags, highlights, backups, refreshes. Without
    // this branch they were the one family of writes a bad key could still fail
    // with a generic title and no way to fix it.
    if (applyAuthFailure(toast, error, options.failure.title, errorMessage)) return undefined;

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
