import { getSelectedText } from "@raycast/api";
import { speakText } from "./speech";
import { validateSelectedText } from "./text/validation";

export default async function Command() {
  await speakText(async () => validateSelectedText(await getSelectedText()));
}
