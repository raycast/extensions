import { pasteClipboardAtPosition } from "./paste-utils";

export default async function Command() {
  await pasteClipboardAtPosition(2, "2nd previous");
}
