import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";

export async function outputResult(text: string, successTitle: string): Promise<void> {
  const { autoPaste } = getPreferenceValues<{ autoPaste: boolean }>();
  if (autoPaste) {
    await Clipboard.paste(text);
    await showToast({
      style: Toast.Style.Success,
      title: `${successTitle} and pasted`,
    });
  } else {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: `${successTitle} and copied to clipboard`,
    });
  }
}
