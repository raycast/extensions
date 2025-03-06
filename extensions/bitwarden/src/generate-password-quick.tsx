import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { Bitwarden } from "~/api/bitwarden";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { captureException } from "~/utils/development";
import { getPasswordGeneratorOptions } from "~/utils/passwords";
import { getTransientCopyPreference } from "~/utils/preferences";

const { generatePasswordQuickAction } = getPreferenceValues<Preferences.GeneratePasswordQuick>();

const actions: Record<
  Preferences.GeneratePasswordQuick["generatePasswordQuickAction"],
  (password: string) => Promise<void>
> = {
  copy: async (password) => {
    await Clipboard.copy(password, { transient: getTransientCopyPreference("password") });
    await showCopySuccessMessage("Copied password to clipboard");
  },
  paste: async (password) => {
    await Clipboard.paste(password);
  },
  copyAndPaste: async (password) => {
    await Clipboard.copy(password, { transient: getTransientCopyPreference("password") });
    await Clipboard.paste(password);
    await showHUD("Copied password to clipboard");
  },
};

async function generatePasswordQuickCommand() {
  const toast = await showToast(Toast.Style.Animated, "Generating password...");
  try {
    const bitwarden = await new Bitwarden(toast).initialize();
    const options = await getPasswordGeneratorOptions();
    const password = await bitwarden.generatePassword(options);
    await actions[generatePasswordQuickAction](password);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to generate";
    captureException("Failed to generate password", error);
  }
}

export default generatePasswordQuickCommand;
