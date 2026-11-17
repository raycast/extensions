import { quickSend } from "./lib/quick-send";
import { fileManagerName, readSelectionContent } from "./lib/selection";

export default async function Command() {
  await quickSend(readSelectionContent, {
    emptyMessage: `No Files Selected in ${fileManagerName}`,
    pickerCommand: "send-selected-finder-item",
  });
}
