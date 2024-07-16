import {
  Clipboard,
  PopToRootType,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { createMaskedEmail } from "./fastmail";

type Preferences = {
  create_prefix: string;
};

export default async function Command() {
  const { create_prefix } = getPreferenceValues<Preferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });

  try {
    const email = await createMaskedEmail(create_prefix);

    Clipboard.copy(email);
    await showHUD("🎉 Masked email copied to clipboard");
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create masked email";
    toast.message =
      error instanceof Error
        ? error.message
        : "An error occurred while creating the masked email, please try again later";
  }
}
