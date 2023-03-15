import { Clipboard, closeMainWindow, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { Bitwarden } from "~/api/bitwarden";
import { Preferences } from "~/types/general";
import { copyPassword } from "~/utils/clipboard";
import { getPasswordGeneratorOptions } from "~/utils/passwords";

const { generatePasswordQuickAction } = getPreferenceValues<Preferences>();

const actions: Record<Preferences["generatePasswordQuickAction"], (password: string) => Promise<void>> = {
  copy: async (password) => {
    await copyPassword(password);
    await closeMainWindow();
    await showHUD("Copied password to clipboard");
  },
  paste: async (password) => {
    await Clipboard.paste(password);
  },
  copyAndPaste: async (password) => {
    await copyPassword(password);
    await showHUD("Copied password to clipboard");
    await Clipboard.paste(password);
  },
};

async function generatePasswordQuickCommand() {
  const toast = await showToast(Toast.Style.Animated, "Generating password…");
  try {
    const bitwarden = await new Bitwarden().initialize();
    const options = await getPasswordGeneratorOptions();
    const password = await bitwarden.generatePassword(options);
    await actions[generatePasswordQuickAction](password);
  } catch {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to generate";
  }
}

export default generatePasswordQuickCommand;
