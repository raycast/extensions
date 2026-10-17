import { Clipboard } from "@raycast/api";
import { saveWithFeedback } from "./save-feedback";

export default async function SaveClipboard() {
  await saveWithFeedback(async () => (await Clipboard.readText()) ?? "");
}
