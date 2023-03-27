import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { execSIPSCommandOnWebP, getSelectedImages } from "./utils";

export default async function Command() {
  const selectedImages = await getSelectedImages();

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Flipping in progress...", style: Toast.Style.Animated });

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      const pathStrings = '"' + selectedImages.join('" "') + '"';
      if (pathStrings.toLowerCase().includes("webp")) {
        // Handle each image individually
        selectedImages.forEach((imgPath) => {
          if (imgPath.toLowerCase().endsWith("webp")) {
            // Convert to PNG, flip and restore to WebP
            execSIPSCommandOnWebP("sips --flip vertical", imgPath);
          } else {
            // Run command as normal
            execSync(`sips --flip vertical "${imgPath}"`);
          }
        });
      } else {
        // Flip all images at once
        execSync(`sips --flip vertical ${pathStrings}`);
      }
      toast.title = `Flipped ${selectedImages.length.toString()} ${pluralized} vertically`;
      toast.style = Toast.Style.Success;
    } catch {
      toast.title = `Failed to flip ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Failure;
    }
  }
}
