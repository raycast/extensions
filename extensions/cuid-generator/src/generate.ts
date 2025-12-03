import { createId } from "@paralleldrive/cuid2";
import { Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
  let cuid2 = createId();

  await Clipboard.copy(cuid2);

  await showHUD(`✅ ${cuid2}`);
}
