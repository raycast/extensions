import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { openFields, runCommand, send } from "./salamander";

export default async function Command() {
  await runCommand(async () => {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      await showHUD("No Finder items selected");
      return;
    }
    await send("open", openFields(items.map((item) => item.path)));
  });
}
