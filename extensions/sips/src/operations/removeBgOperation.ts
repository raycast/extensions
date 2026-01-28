import {
  convertPDF,
  convertSVG,
  expandTilde,
  getDestinationPaths,
  getScopedTempDirectory,
  getScopedTempFile,
  getWebPBinaryPath,
  hexToRGBA,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";
import { runAppleScript } from "@raycast/utils";
import { Color, Colors } from "../utilities/types";
import { execSync } from "child_process";
import { environment, getPreferenceValues } from "@raycast/api";
import { getAVIFEncPaths } from "../utilities/avif";
import path from "path";
import { readdir } from "fs/promises";
import { makePDF } from "../utilities/pdf";

/**
 * Runs an AppleScript to remove the background from an image.
 * @param sourcePath The path of the image to remove the background from.
 * @param outputPath The path to save the image to.
 * @param bgColor The color to use as the background.
 * @param crop Whether to crop the image to the isolated subject.
 * @returns A promise that resolves when the operation is complete.
 */
const runRemoveBgScript = async (
  sourcePath: string,
  outputPath: string,
  bgColor?: Color,
  crop = true,
  ignoreFailure = false,
) => {
  const result = await runAppleScript(
    `function run() {
      ObjC.import("CoreGraphics");
      ObjC.import("CoreImage");
      ObjC.import("Vision");
      
      const sourceURL = $.NSURL.fileURLWithPath("${sourcePath}")
      const image = $.CIImage.imageWithContentsOfURL(sourceURL);
      
      const handler = $.VNImageRequestHandler.alloc.initWithCIImageOptions(image, $.NSDictionary.alloc.init);
      const request = $.VNGenerateForegroundInstanceMaskRequest.alloc.init;
      const requests = $.NSArray.arrayWithObject(request);
      
      let error = Ref();
      handler.performRequestsError(requests, error);
      
      const result = request.results.firstObject;
      if (!result?.js) {
        if (${ignoreFailure}) {
          const outputURL = $.NSURL.fileURLWithPath("${outputPath}");
          const context = $.CIContext.alloc.init;
          const format = $.kCIFormatRGBA8;
          const colorspace = $.CGColorSpaceCreateDeviceRGB();
          const outputOptions = $.NSDictionary.alloc.init;
          context.writePNGRepresentationOfImageToURLFormatColorSpaceOptionsError(image, outputURL, format, colorspace, outputOptions, error);
          return outputURL.path;
        }
        return "Failed to isolate foreground."
      }
      
      const pixelBuffer = result.generateMaskedImageOfInstancesFromRequestHandlerCroppedToInstancesExtentError(result.allInstances, handler, ${crop}, error);
      const maskedImage = $.CIImage.imageWithCVPixelBuffer(pixelBuffer);
      
      ${
        bgColor
          ? `const color = $.CIColor.colorWithRedGreenBlueAlpha(${bgColor.red / 255}, ${bgColor.green / 255}, ${bgColor.blue / 255}, ${bgColor.alpha / 255});
      const colorImage = $.CIImage.imageWithColor(color).imageByCroppingToRect(maskedImage.extent);
      
      const blendFilter = $.CIFilter.filterWithName("CIBlendWithAlphaMask");
      blendFilter.setValueForKey(colorImage, "inputBackgroundImage");
      blendFilter.setValueForKey(maskedImage, "inputImage");
      blendFilter.setValueForKey(maskedImage, "inputMaskImage");
      const finalImage = blendFilter.outputImage;`
          : `const finalImage = maskedImage;`
      }
      
      const outputURL = $.NSURL.fileURLWithPath("${outputPath}");
      const context = $.CIContext.alloc.init;
      const format = $.kCIFormatRGBA8;
      const colorspace = $.CGColorSpaceCreateDeviceRGB();
      const outputOptions = $.NSDictionary.alloc.init;
      context.writePNGRepresentationOfImageToURLFormatColorSpaceOptionsError(finalImage, outputURL, format, colorspace, outputOptions, error);
      return outputURL.path;
    }`,
    {
      language: "JavaScript",
    },
  );
  if (result !== outputPath) {
    throw new Error(result);
  }
};

/**
 * Removes the backgrounds from images.
 * @param sourcePaths The paths of the images to pad.
 * @param bgColorString The color to use as the background.
 * @param crop Whether to crop the image to the isolated subject.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function removeBg(sourcePaths: string[], bgColorString?: string, crop = false) {
  const preferences = getPreferenceValues<ExtensionPreferences & Preferences.RemoveBg>();
  if (environment.commandName === "tools/remove-bg") {
    preferences.preserveFormat = true;
  }

  const expandedPaths = sourcePaths.map((path) => expandTilde(path));
  const newPaths = await getDestinationPaths(expandedPaths);
  const resultPaths: string[] = [];

  let bgColor: Color | undefined;
  if (bgColorString) {
    if (bgColorString.match(/^#?[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)) {
      bgColor = hexToRGBA(bgColorString);
    } else if (Object.keys(Colors).includes(bgColorString.toLowerCase().replaceAll(" ", ""))) {
      bgColor = hexToRGBA(Colors[bgColorString.toLowerCase().replaceAll(" ", "") as keyof typeof Colors]);
    } else {
      throw new Error("Invalid color string provided.");
    }
  }

  for (const imagePath of expandedPaths) {
    let newPath = newPaths[expandedPaths.indexOf(imagePath)];
    if (imagePath.toLowerCase().endsWith(".webp")) {
      // WEBP -> PNG -> Remove Background -> WEBP
      await using tempPNGfromWEBP = await getScopedTempFile("sips-remove-bg-1", "png");
      await using tempPNGnoBG = await getScopedTempFile("sips-remove-bg-2", "png");

      const [dwebpPath, cwebpPath] = await getWebPBinaryPath();
      execSync(
        `${dwebpPath} ${preferences.useLosslessConversion ? "-lossless" : ""} "${imagePath}" -o "${tempPNGfromWEBP.path}"`,
      );
      await runRemoveBgScript(tempPNGfromWEBP.path, tempPNGnoBG.path, bgColor, crop);

      if (preferences.preserveFormat) {
        execSync(
          `${cwebpPath} ${preferences.useLosslessConversion ? "-lossless" : ""} "${tempPNGnoBG.path}" -o "${newPath}"`,
        );
      } else {
        newPath = path.join(path.dirname(newPath), path.basename(newPath, ".webp") + ".png");
        execSync(`mv "${tempPNGnoBG.path}" "${newPath}"`);
      }
      resultPaths.push(newPath);
    } else if (imagePath.toLowerCase().endsWith(".svg")) {
      // SVG -> PNG -> Remove Background -> SVG
      await using tempPNGfromSVG = await getScopedTempFile("sips-remove-bg-1", "png");
      await using tempPNGnoBG = await getScopedTempFile("sips-remove-bg-2", "png");
      await using tempSVG = await getScopedTempFile("sips-remove-bg-3", "svg");
      await convertSVG("PNG", imagePath, tempPNGfromSVG.path);
      await runRemoveBgScript(tempPNGfromSVG.path, tempPNGnoBG.path, bgColor, crop);

      if (preferences.preserveFormat) {
        execSync(`chmod +x ${environment.assetsPath}/potrace/potrace`);
        execSync(
          `sips --setProperty format bmp "${tempPNGnoBG.path}" --out "${tempSVG.path}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${tempSVG.path}"`,
        );
      } else {
        newPath = path.join(path.dirname(newPath), path.basename(newPath, ".svg") + ".png");
        execSync(`mv "${tempPNGnoBG.path}" "${newPath}"`);
      }
      resultPaths.push(newPath);
    } else if (imagePath.toLowerCase().endsWith(".avif")) {
      // AVIF -> PNG -> Remove Background -> AVIF
      await using tempPNGfromAVIF = await getScopedTempFile("sips-remove-bg-1", "png");
      await using tempPNGnoBG = await getScopedTempFile("sips-remove-bg-2", "png");

      const { encoderPath, decoderPath } = await getAVIFEncPaths();
      execSync(`${decoderPath} "${imagePath}" "${tempPNGfromAVIF.path}"`);
      await runRemoveBgScript(tempPNGfromAVIF.path, tempPNGnoBG.path, bgColor, crop);

      if (preferences.preserveFormat) {
        execSync(
          `${encoderPath} ${preferences.useLosslessConversion ? "-s 0 --min 0 --max 0 --minalpha 0 --maxalpha 0 --qcolor 100 --qalpha 100" : ""}  "${tempPNGnoBG.path}" "${newPath}"`,
        );
      } else {
        newPath = path.join(path.dirname(newPath), path.basename(newPath, ".avif") + ".png");
        execSync(`mv "${tempPNGnoBG.path}" "${newPath}"`);
      }
      resultPaths.push(newPath);
    } else if (imagePath.toLowerCase().endsWith(".pdf")) {
      // PDF -> PNG -> Remove Background -> PDF
      await using tempPNGfromPDFDir = await getScopedTempDirectory("sips-remove-bg-1");
      await using tempPNGnoBGDir = await getScopedTempDirectory("sips-remove-bg-2");
      await convertPDF("PNG", imagePath, tempPNGfromPDFDir.path);

      const extractedPNGs = (await readdir(tempPNGfromPDFDir.path)).map((file) =>
        path.join(tempPNGfromPDFDir.path, file),
      );
      for (const pngFile of extractedPNGs) {
        const newPNGPath = path.join(tempPNGnoBGDir.path, path.basename(pngFile));
        await runRemoveBgScript(pngFile, newPNGPath, bgColor, crop, true);
      }

      if (preferences.preserveFormat) {
        const modifiedPNGs = (await readdir(tempPNGnoBGDir.path)).map((file) => path.join(tempPNGnoBGDir.path, file));
        modifiedPNGs.sort((a, b) =>
          parseInt(a?.split("-").at(-1) || "0") > parseInt(b?.split("-").at(-1) || "0") ? 1 : -1,
        );
        await makePDF(modifiedPNGs, newPath);
        resultPaths.push(newPath);
      } else {
        const newDirPath = path.join(path.dirname(newPath), path.basename(newPath, ".pdf") + "-pngs");
        execSync(`mv "${tempPNGnoBGDir.path}" "${newDirPath}"`);
        const finalPNGs = (await readdir(newDirPath)).map((file) => path.join(newDirPath, file));
        resultPaths.push(...finalPNGs);
      }
    } else {
      // Not a special format -- no extra steps needed
      let originalFormat = imagePath.split(".").pop() ?? "png";
      if (originalFormat === "jpg") {
        originalFormat = "jpeg";
      }
      await using tempPng = await getScopedTempFile("sips-remove-bg", "png");
      await runRemoveBgScript(imagePath, tempPng.path, bgColor, crop);

      if (preferences.preserveFormat) {
        execSync(`sips -s format ${originalFormat.toLowerCase()} "${tempPng.path}" --out "${newPath}"`);
      } else {
        newPath = path.join(path.dirname(newPath), path.basename(newPath, ".png") + ".png");
        execSync(`mv "${tempPng.path}" "${newPath}"`);
      }
      resultPaths.push(newPath);
    }
  }
  await moveImageResultsToFinalDestination(resultPaths);
  return resultPaths;
}
