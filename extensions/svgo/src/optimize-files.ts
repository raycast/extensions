import { closeMainWindow, getSelectedFinderItems, showHUD } from "@raycast/api";

import optimizeItems from "./utils";

const command = async () => {
  await closeMainWindow;

  try {
    const items = await getSelectedFinderItems();

    await optimizeItems(items);

    showHUD("Optimization successful");
  } catch (error) {
    console.error(error);
    showHUD(`❌ ${String(error)}`);
  }
};

export default command;
