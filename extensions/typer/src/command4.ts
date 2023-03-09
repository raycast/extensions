import { Clipboard, getPreferenceValues, openCommandPreferences, showHUD, updateCommandMetadata } from "@raycast/api";
export default async function main() {
  const values = getPreferenceValues();
  const value = values["typercommand4"];
  if (value) {
    await updateCommandMetadata({ subtitle: `Pasting: ${value}` });

    Clipboard.paste(value);
    return await showHUD("✅ Paste Successful");
  }

  await openCommandPreferences();
  return await showHUD("❌ Please set a text to paste");
}
