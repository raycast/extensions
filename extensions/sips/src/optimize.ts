import { environment, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import * as fs from "fs";
import { runAppleScriptSync } from "run-applescript";
import { optimize } from "svgo";
import { getSelectedImages } from "./utils";

const optimizeJPEG = (jpegPath: string, newPath: string, amount: number) => {
  runAppleScriptSync(`use framework "Foundation"

  -- Load JPEG image from file
  set jpegData to current application's NSData's alloc()'s initWithContentsOfFile:"${jpegPath}"
  
  -- Create bitmap image representation from image
  set bitmapRep to current application's NSBitmapImageRep's imageRepWithData:jpegData
  
  -- Compress bitmap representation
  set compressionFactor to ${1.0 - amount / 100.0}
  set compressedData to bitmapRep's representationUsingType:(current application's NSBitmapImageFileTypeJPEG) |properties|:{NSImageCompressionFactor:compressionFactor}
  
  -- Save compressed data to file
  set compressedFilePath to "${newPath}"
  compressedData's writeToFile:compressedFilePath atomically:true`);
};

const optimizeWEBP = (webpPath: string, amount: number) => {
  const jpegPath = `${environment.supportPath}/tmp.jpeg`;
  const newPath = webpPath.substring(0, webpPath.toLowerCase().lastIndexOf(".webp")) + " (Optimized).webp";

  execSync(`chmod +x ${environment.assetsPath}/webp/cwebp`);
  execSync(`chmod +x ${environment.assetsPath}/webp/dwebp`);

  execSync(`${environment.assetsPath}/webp/dwebp "${webpPath}" -o "${jpegPath}"`);
  optimizeJPEG(jpegPath, jpegPath, amount);
  execSync(`${environment.assetsPath}/webp/cwebp "${jpegPath}" -o "${newPath}"; rm "${jpegPath}"`);
};

const optimizeSVG = (svgPath: string) => {
  const newPath = svgPath.substring(0, svgPath.toLowerCase().lastIndexOf(".svg")) + " (Optimized).svg";
  const data = fs.readFileSync(svgPath);
  const result = optimize(data.toString(), {
    path: newPath,
    multipass: true,
  });
  fs.writeFileSync(newPath, result.data);
};

export default async function Command(props: { arguments: { optimizationFactor: string } }) {
  const { optimizationFactor } = props.arguments;

  let optimizationValue = 100;
  if (optimizationFactor != "") {
    optimizationValue = parseFloat(optimizationFactor);
    if (!optimizationValue) {
      await showToast({ title: "Invalid optimization factor", style: Toast.Style.Failure });
      return;
    }
  }

  const selectedImages = await getSelectedImages();

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Optimization in progress...", style: Toast.Style.Animated });

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      selectedImages.forEach((imgPath) => {
        if (imgPath.toLowerCase().endsWith("webp")) {
          // Convert to JPEG, optimize, and restore to WebP
          optimizeWEBP(imgPath, optimizationValue);
        } else if (imgPath.toLowerCase().endsWith("svg")) {
          // Optimize SVG using SVGO
          optimizeSVG(imgPath);
        } else if (imgPath.toLowerCase().endsWith("jpg") || imgPath.toLowerCase().endsWith("jpeg")) {
          // Optimize JPEG images
          const newPath = imgPath.substring(0, imgPath.lastIndexOf(".jp")) + " (Optimized).jpeg";
          optimizeJPEG(imgPath, newPath, optimizationValue);
        } else {
          // Optimize any other SIPS-compatible image type
          const jpegPath = `${environment.supportPath}/tmp.jpeg`;
          const newPath =
            imgPath.substring(0, imgPath.toLowerCase().lastIndexOf(".")) + " (Optimized)." + imgPath.split(".").at(-1);

          optimizeJPEG(imgPath, jpegPath, optimizationValue);
          execSync(`sips --setProperty format jpeg "${jpegPath}" --out "${newPath}"; rm "${jpegPath}"`);
        }
      });
      toast.title = `Optimized ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Success;
    } catch {
      toast.title = `Failed to optimize ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Failure;
    }
  }
}
