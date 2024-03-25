import { Clipboard, LaunchProps, Toast, getPreferenceValues, getSelectedText, showToast } from "@raycast/api";
import { renderFiglet } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CopyFiglet }>) {
  const { defaultFont } = getPreferenceValues<ExtensionPreferences>();
  const { fallbackText } = props;
  const { font, text } = props.arguments;
  const figletFont = font || defaultFont;

  let figgleText = text || fallbackText;
  if (!figgleText) {
    try {
      figgleText = await getSelectedText();
    } catch (error) {
      console.error(error);
    }
  }

  if (!figgleText) {
    await showToast(Toast.Style.Failure, "No text selected", "Please either set- or select a text");
    return;
  }

  const figletRender = await renderFiglet(figletFont, figgleText);
  if (figletRender) {
    await Clipboard.copy(figletRender);
    await showToast({ title: "Success", message: "FIGlet copied to clipboard" });
  }
}
