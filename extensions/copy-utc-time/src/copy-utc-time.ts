import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    const utcTime = new Date().toISOString();
    await Clipboard.copy(utcTime);
    await showHUD(`✅ ${utcTime} copied to clipboard`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy UTC time" });
  }
};
