import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { createImage } from "./lib/create-image";
import { isMoreThan2Files } from "./lib/validation";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    await isMoreThan2Files(selectedItems);
    const files = selectedItems.map((x) => x.path);
    await closeMainWindow();
    await createImage(files, "vertical");
    await showToast({
      style: Toast.Style.Success,
      title: "File created",
    });
  } catch (error) {
    let message = String(error);
    if (error instanceof Error) {
      message = error.message;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Image merge failed",
      message: message,
    });
  }
}
