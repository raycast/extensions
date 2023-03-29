import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { getSelectedImages } from "./utils";

export default async function Command(props: { arguments: { width: string; height: string } }) {
  const { width, height } = props.arguments;

  if (width == "" && height == "") {
    await showToast({ title: "Must specify either width or height", style: Toast.Style.Failure });
    return;
  }

  const widthInt = width == "" ? -1 : parseInt(width);
  const heightInt = height == "" ? -1 : parseInt(height);

  if (isNaN(widthInt)) {
    await showToast({ title: "Width must be an integer", style: Toast.Style.Failure });
    return;
  } else if (isNaN(heightInt)) {
    await showToast({ title: "Height must be an integer", style: Toast.Style.Failure });
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
      const pathStrings = '"' + selectedImages.join('" "') + '"';

      if (widthInt != -1 && heightInt == -1) {
        execSync(`sips --resampleWidth ${widthInt} ${pathStrings}`);
      } else if (widthInt == -1 && heightInt != -1) {
        execSync(`sips --resampleHeight ${heightInt} ${pathStrings}`);
      } else {
        execSync(`sips --resampleHeightWidth ${heightInt} ${widthInt} ${pathStrings}`);
      }

      await showToast({ title: `Resized ${selectedImages.length.toString()} ${pluralized}` });
    } catch (error) {
      console.log(error);
      await showToast({
        title: `Failed to resize ${selectedImages.length.toString()} ${pluralized}`,
        style: Toast.Style.Failure,
      });
    }
  }
}
