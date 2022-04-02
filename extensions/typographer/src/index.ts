import {
  Clipboard,
  getPreferenceValues,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import Typograf from "typograf";

export default async function main() {
  const { LANGUAGE, HTML_ENTITIES } = getPreferenceValues();

  const tp = new Typograf({
    locale: [LANGUAGE],
    htmlEntity: { type: HTML_ENTITIES },
  });

  const selectedText = await getSelectedText();
  const transformedText = tp.execute(selectedText);

  await Clipboard.paste(transformedText);
  await showHUD("✓");
}
