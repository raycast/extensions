import { pasteClipboardAtPosition } from "./paste-utils";

export default async function Command() {
  await pasteClipboardAtPosition(1, "1st previous");
}
