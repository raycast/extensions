import { closeMainWindow, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";

import optimizeItems from "./utils";
import { configHelper } from "./utils-2";

const command = async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Optimizing files...",
  });

  try {
    const plugins = configHelper.getEnabledPlugins();
    const items = await getSelectedFinderItems();

    await optimizeItems(items, plugins);
    await closeMainWindow();
    showHUD("🎉 Success");
  } catch (error) {
    console.error(error);

    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong!";
    toast.message = String(error);
  }
};

export default command;
