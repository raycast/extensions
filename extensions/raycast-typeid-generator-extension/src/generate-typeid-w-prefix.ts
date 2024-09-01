import { Clipboard, LaunchProps, showHUD, getPreferenceValues } from "@raycast/api";
import { typeid } from "typeid-js";

export default async function generateTypeidWPrefix(
  props: LaunchProps<{ arguments: Arguments.GenerateTypeidWPrefix }>,
) {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.disableCopyToClipboard && !preferences.insert) {
    await showHUD("Doing nothing.");
    return;
  }

  const { prefix } = props.arguments;
  const uuid = typeid(prefix).toString();

  if (!preferences.disableCopyToClipboard) {
    await Clipboard.copy(uuid);
    await showHUD(`✅ Copied new UUID: ${uuid}`);
  }

  if (preferences.insert) {
    await Clipboard.paste(uuid);
    await showHUD(`✅ Inserted new UUID: ${uuid}`);
  }
}
