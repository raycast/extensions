import { showToast, Toast, Clipboard } from "@raycast/api";

export function showToastWithPromise<T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  toasts: { loading: string; success: string | ((value: T) => Omit<Toast.Options, "style">); error?: string },
) {
  const promise = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;

  showToast({ style: Toast.Style.Animated, title: toasts.loading });

  promise
    .then((p) => {
      if (typeof toasts.success === "function") {
        const toastOptions = toasts.success(p);
        showToast({ style: Toast.Style.Success, ...toastOptions });
      } else {
        showToast({ style: Toast.Style.Success, title: toasts.success });
      }
      return p;
    })
    .catch((e) => {
      showToast({
        style: Toast.Style.Failure,
        title: toasts.error ?? "Something went wrong",
        message: e instanceof Error ? e.message : undefined,
        primaryAction: {
          title: "Copy Logs",
          shortcut: { modifiers: ["cmd", "shift"], key: "c" },
          async onAction(toast) {
            await Clipboard.copy(e.stack ?? e.toString());
            await toast.hide();
          },
        },
      });
    });

  return promise;
}
