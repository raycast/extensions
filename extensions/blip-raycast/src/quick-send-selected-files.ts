import { quickSend } from "./lib/quick-send";
import { fileManagerName, getSelectedPaths } from "./lib/selection";

export default async function Command() {
  await quickSend(
    async () => {
      const paths = await getSelectedPaths();
      return paths.length ? { kind: "files", paths, source: `Selected in ${fileManagerName}` } : undefined;
    },
    { emptyMessage: `Nothing is selected in ${fileManagerName}`, pickerCommand: "send-selected-finder-item" },
  );
}
