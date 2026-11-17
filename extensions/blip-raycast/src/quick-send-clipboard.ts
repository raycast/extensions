import { environment } from "@raycast/api";
import { readClipboardContent } from "./lib/clipboard";
import { quickSend } from "./lib/quick-send";

export default async function Command() {
  await quickSend(() => readClipboardContent(environment.supportPath), {
    emptyMessage: "Clipboard Is Empty",
    pickerCommand: "send-clipboard",
  });
}
