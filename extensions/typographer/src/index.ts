import {
  getSelectedText,
  Clipboard,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";

import Typograf from "typograf";

export default async function main() {
  const { LANGUAGE } = getPreferenceValues();
  const tp = new Typograf({ locale: [LANGUAGE] });

  const selectedText = await getSelectedText();
  const transformedText = tp.execute(selectedText);

  await Clipboard.paste(transformedText);
  await showHUD("✓");
}
