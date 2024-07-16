import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { capitalize } from "lodash";
import { PlanetScaleError } from "./api";

export function enrichToastWithURL(toast: Toast, { resource, url }: { resource: string; url: string }) {
  toast.primaryAction = {
    title: `Open ${resource}`,
    shortcut: { modifiers: ["shift", "cmd"], key: "o" },
    onAction: () => open(url),
  };

  toast.secondaryAction = {
    title: `Copy URL`,
    shortcut: { modifiers: ["shift", "cmd"], key: "c" },
    onAction: () => Clipboard.copy(url),
  };
}

export function titleCase(str: string) {
  return capitalize(str.replace(/_/g, " "));
}

export function mutation<T>(callback: (...args: T[]) => Promise<void>) {
  return async (...args: T[]) => {
    try {
      await callback(...args);
    } catch (error) {
      if (error instanceof PlanetScaleError) {
        await showToast({
          title: "Error",
          message: error.data.message,
          style: Toast.Style.Failure,
        });
      } else {
        throw error;
      }
    }
  };
}
