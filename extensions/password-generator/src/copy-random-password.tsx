import { Clipboard, PopToRootType, Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";

import { generatePassword } from "@/helpers/helpers";

export default async function Command() {
  const { hideAfterCopy } = getPreferenceValues<ExtensionPreferences>();
  const { length: lengthInput, useNumbers, useChars } = getPreferenceValues<Preferences.CopyRandomPassword>();

  const length = parseInt(lengthInput, 10);

  if (!Number.isFinite(length)) {
    await showToast(Toast.Style.Failure, "Password length must be a number");
    return;
  }

  if (length < 5 || length > 64) {
    await showToast(Toast.Style.Failure, "Password length must be between 5 and 64");
    return;
  }

  const generatedPassword = generatePassword(length, useNumbers, useChars);

  await Clipboard.copy(generatedPassword);

  if (hideAfterCopy) {
    await showHUD(`Copied Password - ${generatedPassword} 🎉`, {
      clearRootSearch: false,
      popToRootType: PopToRootType.Suspended,
    });
  } else {
    await showHUD("Copied Password 🎉");
  }
}
