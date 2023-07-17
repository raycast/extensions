import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { execSIPSCommandOnSVG, execSIPSCommandOnWebP, getSelectedImages } from "./utils";

export default async function Command(props: { arguments: { amount: string; hexcolor: string } }) {
  const { amount, hexcolor } = props.arguments;
  const selectedImages = await getSelectedImages();

  const padAmount = parseInt(amount);
  if (isNaN(padAmount) || padAmount < 0) {
    await showToast({ title: "Padding amount must be a positive integer", style: Toast.Style.Failure });
    return;
  }

  let hexString = hexcolor || "FFFFFF";
  if (hexString.startsWith("#")) {
    hexString = hexString.substring(1);
  }
  if (!hexString.match(/#?[0-9A-Fa-f]{6}/)) {
    await showToast({ title: "Invalid HEX Color", style: Toast.Style.Failure });
    return;
  }

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Padding in progress...", style: Toast.Style.Animated });

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      for (const imagePath of selectedImages) {
        const resultArr = execSync(`sips -g pixelWidth -g pixelHeight "${imagePath}"`)
          .toString()
          .split(/(: |\n)/g);
        const oldWidth = parseInt(resultArr[4]);
        const oldHeight = parseInt(resultArr[8]);

        if (imagePath.toLowerCase().endsWith(".webp")) {
          // Convert to PNG, apply padding, then restore to WebP
          execSIPSCommandOnWebP(
            `sips --padToHeightWidth ${oldHeight + padAmount} ${oldWidth + padAmount} --padColor ${hexString}`,
            imagePath
          );
        }
        if (imagePath.toLowerCase().endsWith(".svg")) {
          // Convert to PNG, apply padding, then restore to SVG
          execSIPSCommandOnSVG(
            `sips --padToHeightWidth ${oldHeight + padAmount} ${oldWidth + padAmount} --padColor ${hexString}`,
            imagePath
          );
        } else {
          // Run command normally
          execSync(
            `sips --padToHeightWidth ${oldHeight + padAmount} ${
              oldWidth + padAmount
            } --padColor ${hexString} "${imagePath}"`
          );
        }
      }

      toast.title = `Added padding to ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Success;
    } catch {
      toast.title = `Failed to pad ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Failure;
    }
  }
}
