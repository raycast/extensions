import { Clipboard, Toast, showToast } from "@raycast/api";

import { getOtpSecret } from "../lib/dcli";
import { VaultCredential } from "../types/dcli";

export function useTotp(item: VaultCredential) {
  const copyTotp = () => copy(item.id);
  const pasteTotp = () => paste(item.id);

  return {
    hasTotp: item.otpSecret !== undefined,
    copyTotp,
    pasteTotp,
  };
}

async function copy(id: string) {
  const toast = await showToast(Toast.Style.Animated, "Getting TOTP code...");
  try {
    const totp = await getOtpSecret(id);
    await Clipboard.copy(totp, { concealed: true });

    toast.message = "Pasted code to clipboard";
    toast.style = Toast.Style.Success;
  } catch (error) {
    toast.message = "Failed to get TOTP";
    toast.style = Toast.Style.Failure;
  }
}

async function paste(id: string) {
  const toast = await showToast(Toast.Style.Animated, "Getting TOTP code...");
  try {
    const totp = await getOtpSecret(id);
    await Clipboard.paste(totp);

    toast.message = "Copied code to clipboard";
    toast.style = Toast.Style.Success;
  } catch (error) {
    toast.message = "Failed to get TOTP";
    toast.style = Toast.Style.Failure;
  }
}
