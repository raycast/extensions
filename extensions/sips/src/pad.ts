import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { getSelectedImages } from "./utils";

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

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      for (const imagePath of selectedImages) {
        const resultArr = execSync(`sips -g pixelWidth -g pixelHeight "${imagePath}"`)
          .toString()
          .split(/(: |\n)/g);
        const oldWidth = parseInt(resultArr[4]);
        const oldHeight = parseInt(resultArr[8]);

        execSync(
          `sips --padToHeightWidth ${oldHeight + padAmount} ${
            oldWidth + padAmount
          } --padColor ${hexString} "${imagePath}"`
        );
      }

      await showToast({ title: `Added padding to ${selectedImages.length.toString()} ${pluralized}` });
    } catch {
      await showToast({
        title: `Failed to pad ${selectedImages.length.toString()} ${pluralized}`,
        style: Toast.Style.Failure,
      });
    }
  }
}
