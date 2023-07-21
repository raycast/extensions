import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { execSIPSCommandOnSVG, execSIPSCommandOnWebP, getSelectedImages } from "./utils";

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

  const toast = await showToast({ title: "Resizing in progress...", style: Toast.Style.Animated });

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      const pathStrings = '"' + selectedImages.join('" "') + '"';
      if (pathStrings.toLocaleLowerCase().includes("webp") || pathStrings.toLocaleLowerCase().includes("svg")) {
        // Handle each image individually
        selectedImages.forEach((imgPath) => {
          if (imgPath.toLowerCase().endsWith(".webp")) {
            // Convert to PNG, rotate and restore to WebP
            execSIPSCommandOnWebP("sips --rotate ${degrees}", imgPath);
            if (widthInt != -1 && heightInt == -1) {
              execSIPSCommandOnWebP(`sips --resampleWidth ${widthInt}`, imgPath);
            } else if (widthInt == -1 && heightInt != -1) {
              execSIPSCommandOnWebP(`sips --resampleHeight ${heightInt}`, imgPath);
            } else {
              execSIPSCommandOnWebP(`sips --resampleHeightWidth ${heightInt} ${widthInt}`, imgPath);
            }
          }
          if (imgPath.toLowerCase().endsWith(".svg")) {
            // Convert to PNG, resize, and restore to WebP
            execSIPSCommandOnSVG("sips --rotate ${degrees}", imgPath);
            if (widthInt != -1 && heightInt == -1) {
              execSIPSCommandOnSVG(`sips --resampleWidth ${widthInt}`, imgPath);
            } else if (widthInt == -1 && heightInt != -1) {
              execSIPSCommandOnSVG(`sips --resampleHeight ${heightInt}`, imgPath);
            } else {
              execSIPSCommandOnSVG(`sips --resampleHeightWidth ${heightInt} ${widthInt}`, imgPath);
            }
          } else {
            // Execute command as normal
            if (widthInt != -1 && heightInt == -1) {
              execSync(`sips --resampleWidth ${widthInt} "${imgPath}"`);
            } else if (widthInt == -1 && heightInt != -1) {
              execSync(`sips --resampleHeight ${heightInt} "${imgPath}"`);
            } else {
              execSync(`sips --resampleHeightWidth ${heightInt} ${widthInt} "${imgPath}"`);
            }
          }
        });
      } else {
        // Run commands on all images at once
        if (widthInt != -1 && heightInt == -1) {
          execSync(`sips --resampleWidth ${widthInt} ${pathStrings}`);
        } else if (widthInt == -1 && heightInt != -1) {
          execSync(`sips --resampleHeight ${heightInt} ${pathStrings}`);
        } else {
          execSync(`sips --resampleHeightWidth ${heightInt} ${widthInt} ${pathStrings}`);
        }
      }

      toast.title = `Resized ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      console.log(error);
      toast.title = `Failed to resize ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Failure;
    }
  }
}
