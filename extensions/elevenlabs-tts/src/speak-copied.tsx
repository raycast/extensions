import { Clipboard } from "@raycast/api";
import { speakText } from "./speech";
import { validateCopiedText } from "./text/validation";

export default async function Command() {
  await speakText(async () => validateCopiedText(await Clipboard.readText()));
}
