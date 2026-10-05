import { getSelectedText } from "@raycast/api";
import { speakText } from "./speech";

export default async function Command() {
  await speakText(() => getSelectedText());
}
