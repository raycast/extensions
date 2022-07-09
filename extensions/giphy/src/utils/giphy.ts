import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import copyFileToClipboard from "./copyFileToClipboard";

const DETAIL_GIF_HEIGHT = 300;

export type Rating = "g" | "pg" | "pg-13" | "r";

export function gifToMd(gif: string, alt: string, height?: number) {
  return `<img src="${gif}" alt="${alt}" height="${height || DETAIL_GIF_HEIGHT}" />`;
}

export function normalizeTitle(title: string) {
  return title.split("GIF")[0].trim();
}

export function copyFile(url: string, slug: string) {
  showToast({
    style: Toast.Style.Animated,
    title: "Copying...",
  })
    .then((toast) => {
      return copyFileToClipboard(url, `${slug}.gif`).then((file) => {
        toast.hide();
        showHUD(`Copied GIF "${file}" to clipboard`);
      });
    })
    .catch((e: Error) =>
      showToast({
        style: Toast.Style.Failure,
        title: "Error, please try again",
        message: e?.message,
        primaryAction: {
          title: "Copy Error Message",
          onAction: (toast) => Clipboard.copy(toast.message ?? ""),
          shortcut: { modifiers: ["cmd"], key: "c" },
        },
      })
    );
}
