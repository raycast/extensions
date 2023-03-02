import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { getSelectedImages } from "./utils";

export default async function Command() {
  try {
    await getSelectedFinderItems();
  } catch (error) {
    console.log("woof");
  }
  const selectedImages = await getSelectedImages();

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      const pathStrings = '"' + selectedImages.join('" "') + '"';
      execSync(`sips --flip vertical ${pathStrings}`);
      await showToast({ title: `Flipped ${selectedImages.length.toString()} ${pluralized} vertically` });
    } catch {
      await showToast({
        title: `Failed to flip ${selectedImages.length.toString()} ${pluralized}`,
        style: Toast.Style.Failure,
      });
    }
  }
}
