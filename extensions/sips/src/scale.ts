import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { getSelectedImages } from "./utils";

export default async function Command(props: { arguments: { scaleFactor: string } }) {
  const { scaleFactor } = props.arguments;

  const scaleNumber = parseFloat(scaleFactor);
  if (isNaN(scaleNumber)) {
    await showToast({ title: "Scale factor must be a number", style: Toast.Style.Failure });
    return;
  }

  const selectedImages = await getSelectedImages();

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

        execSync(`sips --resampleHeightWidth ${oldHeight * scaleNumber} ${oldWidth * scaleNumber} "${imagePath}"`);
      }

      await showToast({ title: `Scaled ${selectedImages.length.toString()} ${pluralized}` });
    } catch (error) {
      console.log(error);
      await showToast({
        title: `Failed to scale ${selectedImages.length.toString()} ${pluralized}`,
        style: Toast.Style.Failure,
      });
    }
  }
}
