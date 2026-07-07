// Append a line to Today's note. Hejour's append handler deliberately does
// NOT steal focus, so this drops the thought and leaves you where you were.

import { LaunchProps, open, showHUD } from "@raycast/api";
import { HEJOUR_WEBSITE } from "./lib/hejour";

export default async function main(
  props: LaunchProps<{ arguments: { text: string } }>,
) {
  const text = props.arguments.text.trim();
  if (!text) {
    await showHUD("Nothing to add");
    return;
  }
  try {
    await open(`hejour://append?text=${encodeURIComponent(text)}`);
    await showHUD("Added to Today ✓");
  } catch {
    await open(HEJOUR_WEBSITE);
    await showHUD("Hejour is not installed");
  }
}
