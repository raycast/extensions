import { Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

/** Debounce hook — prevents subprocesses from firing on every keystroke. */
export function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timerRef.current);
  }, [value, delayMs]);

  return debounced;
}

/** Show a failure toast for an error; hides previous toast on change/unmount. */
export function useFailureToast(error: Error | null, title = "Search failed") {
  const toastRef = useRef<Toast | null>(null);

  useEffect(() => {
    if (!error) {
      toastRef.current?.hide();
      toastRef.current = null;
      return;
    }

    toastRef.current?.hide();
    showToast({
      style: Toast.Style.Failure,
      title,
      message: error.message,
      primaryAction: {
        title: "Copy Error",
        shortcut: { modifiers: ["cmd"], key: "t" },
        onAction: async (toast) => {
          await Clipboard.copy(error.message);
          toast.hide();
        },
      },
    }).then((toast) => {
      toastRef.current = toast;
    });

    return () => {
      toastRef.current?.hide();
      toastRef.current = null;
    };
  }, [error, title]);
}

/** Show an animated toast while active; hides when active becomes false. */
export function useAnimatedToast(
  active: boolean,
  title: string,
  message?: string,
) {
  const toastRef = useRef<Toast | null>(null);

  useEffect(() => {
    if (!active) {
      toastRef.current?.hide();
      toastRef.current = null;
      return;
    }

    toastRef.current?.hide();
    showToast({
      style: Toast.Style.Animated,
      title,
      message,
    }).then((toast) => {
      toastRef.current = toast;
    });

    return () => {
      toastRef.current?.hide();
      toastRef.current = null;
    };
  }, [active, title, message]);
}
