import { quickSend, readClipboardForQuickSend } from "./lib/quick-send";

export default async function Command() {
  await quickSend(readClipboardForQuickSend, {
    emptyMessage: "The clipboard is empty",
    pickerCommand: "send-clipboard",
  });
}
