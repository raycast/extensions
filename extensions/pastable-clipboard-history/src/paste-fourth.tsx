import { pasteClipboardAtPosition } from "./paste-utils";

export default async function Command() {
  await pasteClipboardAtPosition(4, "4th previous");
}
