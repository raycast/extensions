import { getSelectedText, Clipboard } from "@raycast/api";
import { getPreferences } from "./preferences";

export default async function Command() {
  const { url, format } = getPreferences();
  const selectedText = await getSelectedText();
  const regexp = new RegExp(format, "gm");

  const transformedText = selectedText.replace(regexp, `[$&](${url})`);

  await Clipboard.paste({ text: transformedText });
}
