import { showToast, Toast, showHUD, closeMainWindow, Clipboard, PopToRootType } from "@raycast/api";
import { createMaskedEmail } from "./utils";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });
  try {
    const email = await createMaskedEmail();
    Clipboard.copy(email);
    await toast.hide();
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    await showHUD("🎉 Masked email address copied to clipboard");
  } catch (e) {
    if (e instanceof Error) {
      await toast.hide();
      showToast({ style: Toast.Style.Failure, title: "Error", message: e.message });
    }
  }
}
