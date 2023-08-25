import { closeMainWindow, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";

import optimizeItems from "./utils";

const command = async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Optimizing files...",
  });

  try {
    const items = await getSelectedFinderItems();

    await optimizeItems(items);
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
