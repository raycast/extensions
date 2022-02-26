import { copyTextToClipboard, showToast, ToastStyle } from "@raycast/api";

import { getCurrentTimestamp } from "./utils";

export default function main() {
  const timestamp = getCurrentTimestamp();
  showToast(ToastStyle.Success, "Copied to clipboard");
  copyTextToClipboard(timestamp.toString());
  return null;
}
