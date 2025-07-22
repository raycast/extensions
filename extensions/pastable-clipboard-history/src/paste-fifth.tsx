import { pasteClipboardAtPosition } from "./paste-utils";

export default async function Command() {
  await pasteClipboardAtPosition(5, "5th previous");
}
