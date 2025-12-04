/**
 * @file utilities/utils.ts
 *
 * @summary Helper functions used throughout the extension.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:48:00
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import path from "path";

import {
  Clipboard,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  LocalStorage,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { getAVIFEncPaths } from "./avif";
import { copyImagesAtPathsToClipboard, getClipboardImages } from "./clipboard";
import { Direction, ImageInputSource, ImageResultHandling } from "./enums";
import { mkdir } from "fs/promises";
import {
  getFinderSelection,
  getForkLiftSelection,
  getHoudahSpotSelection,
  getNeoFinderSelection,
  getPathFinderSelection,
  getQSpaceSelection,
} from "./scripts/file-selection";

/**
 * Adds an item to the list of temporary files to remove.
 * @param item The path of the item to remove.
 */
export const addItemToRemove = async (item: string) => {
  const itemsToRemove = (await LocalStorage.getItem("itemsToRemove")) ?? "";
  await LocalStorage.setItem("itemsToRemove", itemsToRemove + ", " + item);
};

/**
 * Gets a path to a temporary file with the given name and extension.
 *
 * The file will be added to the list of temporary files to remove upon cleanup.
 *
 * @param name The name of the file
 * @param extension The extension of the file
 * @returns A promise resolving to the path of the temporary file.
 */
export const getScopedTempFile = async (name: string, extension: string) => {
  const tempPath = path.join(os.tmpdir(), `${name}.${extension}`);
  return {
    path: tempPath,
    [Symbol.asyncDispose]: async () => {
      if (fs.existsSync(tempPath)) {
        await fs.promises.rm(tempPath, { recursive: true });
      }
    },
  };
};

export const getScopedTempDirectory = async (name: string) => {
  const tempPath = path.join(os.tmpdir(), name);
  await mkdir(tempPath, { recursive: true });
  return {
    path: tempPath,
    [Symbol.asyncDispose]: async () => {
      if (fs.existsSync(tempPath)) {
        await fs.promises.rm(tempPath, { recursive: true });
      }
    },
  };
};

/**
 * Cleans up temporary files created by the extension.
 *
 * @returns A promise resolving when the cleanup is complete.
 */
export const cleanup = async () => {
  const itemsToRemove = (await LocalStorage.getItem("itemsToRemove")) ?? "";
  const itemsToRemoveArray = itemsToRemove.toString().split(", ");
  for (const item of itemsToRemoveArray) {
    if (fs.existsSync(item)) {
      await fs.promises.rm(item, { recursive: true });
    }
  }
  await LocalStorage.removeItem("itemsToRemove");
};

/**
 * Gets selected images in the preferred file manager application.
 *
 * @returns A promise resolving to the list of selected image paths.
 */
export const getSelectedImages = async (): Promise<string[]> => {
  let selectedImages: string[] = [];

  // Get name of preferred file manager
  const extensionPreferences = getPreferenceValues<Preferences>();
  const inputMethod = extensionPreferences.inputMethod;
  let inputMethodError = false;

  if (inputMethod == "Clipboard") {
    // Extract images from clipboard
    try {
      const clipboardImages = (await getClipboardImages()).split(", ");
      await LocalStorage.setItem("itemsToRemove", clipboardImages.join(", "));
      if (clipboardImages.filter((i) => i.trim().length > 0).length > 0) {
        return clipboardImages;
      }
    } catch (error) {
      // Error getting images from clipboard, fall back to Finder/Path Finder
      console.error(`Couldn't get images from clipboard: ${error}`);
      inputMethodError = true;
    }
  }

  // Get name of frontmost application
  let activeApp = inputMethod;
  try {
    activeApp = (await getFrontmostApplication()).name as typeof inputMethod;
  } catch (error) {
    console.error(`Couldn't get frontmost application: ${error}`);
  }

  // Attempt to get selected images from Path Finder
  try {
    if (inputMethod == ImageInputSource.PathFinderSelection || activeApp == "Path Finder") {
      selectedImages = await getPathFinderSelection();
    }
  } catch (error) {
    // Error getting images from Path Finder, fall back to Finder
    console.error(`Couldn't get images from Path Finder: ${error}`);
    inputMethodError = true;
  }

  // Attempt to get selected images from NeoFinder
  try {
    if (inputMethod == ImageInputSource.NeoFinderSelection || activeApp == "NeoFinder") {
      selectedImages = await getNeoFinderSelection();
    }
  } catch (error) {
    // Error getting images from NeoFinder, fall back to Finder
    console.error(`Couldn't get images from NeoFinder: ${error}`);
    inputMethodError = true;
  }

  // Attempt to get selected images from HoudahSpot
  try {
    if (inputMethod == ImageInputSource.HoudahSpotSelection || activeApp == "HoudahSpot") {
      selectedImages = await getHoudahSpotSelection();
    }
  } catch (error) {
    // Error getting images from HoudahSpot, fall back to Finder
    console.error(`Couldn't get images from HoudahSpot: ${error}`);
    inputMethodError = true;
  }

  // Attempt to get selected images from QSpace Pro
  try {
    if (inputMethod == ImageInputSource.QSpaceSelection || activeApp == "QSpace Pro") {
      selectedImages = await getQSpaceSelection();
    }
  } catch (error) {
    // Error getting images from QSpace Pro, fall back to Finder
    console.error(`Couldn't get images from QSpace Pro: ${error}`);
    inputMethodError = true;
  }

  // Attempt to get selected images from ForkLift
  try {
    if (inputMethod == ImageInputSource.ForkLiftSelection || activeApp == "ForkLift") {
      selectedImages = await getForkLiftSelection();
    }
  } catch (error) {
    // Error getting images from ForkLift, fall back to Finder
    console.error(`Couldn't get images from ForkLift: ${error}`);
    inputMethodError = true;
  }

  if (selectedImages.length > 0) {
    return selectedImages.filter((item, index) => selectedImages.indexOf(item) === index);
  }

  // Get selected images from Finder -- use as fallback for desktop selections & on error
  const finderImages = await getFinderSelection();
  if (activeApp == "Finder" || inputMethod == "Finder" || inputMethodError) {
    selectedImages = finderImages;
  } else {
    // Add desktop selections
    finderImages.forEach((imgPath) => {
      if (imgPath.split("/").at(-2) == "Desktop" && !selectedImages.includes(imgPath)) {
        selectedImages.push(imgPath);
      }
    });
  }

  return selectedImages.filter((item, index) => selectedImages.indexOf(item) === index);
};

/**
 * Puts the produced images in the user's preferred location, deleting the files at the given paths.
 *
 * @param imagePaths The paths of the produced images.
 * @returns A promise resolving when the operation is complete.
 */
export const moveImageResultsToFinalDestination = async (imagePaths: string[]) => {
  let activeApp = "Finder";
  try {
    activeApp = (await getFrontmostApplication()).name;
  } catch (error) {
    console.error(`Couldn't get frontmost application: : ${error}`);
  }

  const preferences = getPreferenceValues<Preferences>();
  // Handle the result per the user's preference
  if (preferences.imageResultHandling == ImageResultHandling.CopyToClipboard) {
    await copyImagesAtPathsToClipboard(imagePaths);
    deleteFiles(imagePaths);
  } else if (preferences.imageResultHandling == ImageResultHandling.OpenInPreview) {
    await openPathsInPreview(imagePaths);
    deleteFiles(imagePaths);
  } else if (preferences.inputMethod == ImageInputSource.NeoFinderSelection || activeApp == "NeoFinder") {
    await showInFinder(imagePaths[0]);
  } else if (preferences.inputMethod == ImageInputSource.HoudahSpotSelection || activeApp == "HoudahSpot") {
    await showInFinder(imagePaths[0]);
  }
};

export const getWebPBinaryPath = async () => {
  const cpuType = os.cpus()[0].model.includes("Apple") ? "arm" : "x86";

  if (cpuType == "arm") {
    // Make sure the arm binaries are executable
    execSync(`chmod +x ${environment.assetsPath}/webp/arm/dwebp`);
    execSync(`chmod +x ${environment.assetsPath}/webp/arm/cwebp`);
    // Remove x86 binaries if they exist
    if (fs.existsSync(`${environment.assetsPath}/webp/x86/dwebp`)) {
      await fs.promises.rm(`${environment.assetsPath}/webp/x86/dwebp`);
    }
    if (fs.existsSync(`${environment.assetsPath}/webp/x86/cwebp`)) {
      await fs.promises.rm(`${environment.assetsPath}/webp/x86/cwebp`);
    }
    return [`${environment.assetsPath}/webp/arm/dwebp`, `${environment.assetsPath}/webp/arm/cwebp`];
  } else {
    // Make sure the x86 binaries are executable
    execSync(`chmod +x ${environment.assetsPath}/webp/x86/dwebp`);
    execSync(`chmod +x ${environment.assetsPath}/webp/x86/cwebp`);

    // Remove arm binaries if they exist
    if (fs.existsSync(`${environment.assetsPath}/webp/arm/dwebp`)) {
      await fs.promises.rm(`${environment.assetsPath}/webp/arm/dwebp`);
    }
    if (fs.existsSync(`${environment.assetsPath}/webp/arm/cwebp`)) {
      await fs.promises.rm(`${environment.assetsPath}/webp/arm/cwebp`);
    }
    return [`${environment.assetsPath}/webp/x86/dwebp`, `${environment.assetsPath}/webp/x86/cwebp`];
  }
};

/**
 * Executes a SIPS command on a WebP image, using a temporary PNG in the process.
 *
 * @param command The SIPS command to execute.
 * @param webpPath The path of the WebP image.
 * @returns A promise resolving to the path of the resulting image.
 */
export const execSIPSCommandOnWebP = async (command: string, webpPath: string): Promise<string> => {
  const preferences = getPreferenceValues<Preferences>();
  await using tmpFile = await getScopedTempFile("tmp", "png");
  const newPath = (await getDestinationPaths([webpPath]))[0];

  const [dwebpPath, cwebpPath] = await getWebPBinaryPath();

  execSync(
    `${dwebpPath} "${webpPath}" -o "${tmpFile.path}" && ${command} "${tmpFile.path}" && ${cwebpPath} ${preferences.useLosslessConversion ? "-lossless" : ""} "${tmpFile.path}" -o "${newPath}"`,
  );
  return newPath;
};

/**
 * Executes a SIPS command on an AVIF image, using a temporary PNG in the process.
 *
 * @param command The SIPS command to execute.
 * @param avifPath The path of the AVIF image.
 */
export const execSIPSCommandOnAVIF = async (command: string, avifPath: string): Promise<string> => {
  const preferences = getPreferenceValues<Preferences>();
  await using tmpFile = await getScopedTempFile("tmp", "png");
  const newPath = (await getDestinationPaths([avifPath]))[0];

  const { encoderPath, decoderPath } = await getAVIFEncPaths();
  execSync(
    `${decoderPath} "${avifPath}" "${tmpFile.path}" && ${command} "${tmpFile.path}" && ${encoderPath} ${preferences.useLosslessConversion ? "-s 0 --min 0 --max 0 --minalpha 0 --maxalpha 0 --qcolor 100 --qalpha 100" : ""}  "${tmpFile.path}" "${newPath}"`,
  );
  return newPath;
};

/**
 * Executes a SIPS command on an SVG image, using a temporary PNG in the process.
 *
 * @param command The SIPS command to execute.
 * @param svgPath The path of the SVG image.
 */
export const execSIPSCommandOnSVG = async (command: string, svgPath: string): Promise<string> => {
  await using tmpFile = await getScopedTempFile("tmp", "bmp");
  const newPath = (await getDestinationPaths([svgPath]))[0];

  await convertSVG("BMP", svgPath, tmpFile.path);
  execSync(`chmod +x ${environment.assetsPath}/potrace/potrace`);
  execSync(
    `${command} "${tmpFile.path}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${tmpFile.path}"`,
  );
  return newPath;
};

/**
 * Converts an SVG to a SIPS-compatible image type.
 *
 * @param targetType The desired image type.
 * @param svgPath The path of the SVG image.
 * @param newPath The path to save the resulting image in.
 */
export const convertSVG = async (targetType: string, svgPath: string, newPath: string) => {
  return runAppleScript(`use framework "Foundation"
  use scripting additions

  -- Load SVG image from file
  set svgFilePath to "${svgPath}"
  set svgData to current application's NSData's alloc()'s initWithContentsOfFile:svgFilePath
  
  -- Create image from SVG data
  set svgImage to current application's NSImage's alloc()'s initWithData:svgData
  
  -- Convert image to PNG data
  set tiffData to svgImage's TIFFRepresentation()
  set theBitmap to current application's NSBitmapImageRep's alloc()'s initWithData:tiffData

  try
    set pngData to theBitmap's representationUsingType:(current application's NSBitmapImageFileType${targetType}) |properties|:(missing value)
  on error
    set pngData to theBitmap's representationUsingType:(current application's NSBitmapImageFileTypePNG) |properties|:(missing value)
  end
  
  -- Save PNG data to file
  pngData's writeToFile:"${newPath}" atomically:false`);
};

/**
 * Converts a PDF to a SIPS-compatible image type, with each page stored in its own image file.
 *
 * @param targetType The desired image type.
 * @param pdfPath The path of the PDF document.
 * @param newPathBase The folder to place the resulting images in.
 */
export const convertPDF = async (targetType: string, pdfPath: string, newPathBase: string) => {
  const preferences = getPreferenceValues<Preferences>();

  let repType = "NSPNGFileType";
  if (targetType == "JPEG") {
    repType = "NSJPEGFileType";
  } else if (targetType == "TIFF") {
    repType = "NSTIFFFileType";
  }

  return runAppleScript(
    `use framework "Foundation"
  use framework "PDFKit"
  
  -- Load the PDF file as NSData
  set pdfData to current application's NSData's dataWithContentsOfFile:"${pdfPath}"
  
  -- Create a PDFDocument from the PDF data
  set pdfDoc to current application's PDFDocument's alloc()'s initWithData:pdfData

  ${
    preferences.imageResultHandling == ImageResultHandling.CopyToClipboard ||
    preferences.imageResultHandling == ImageResultHandling.OpenInPreview
      ? `set pageImages to current application's NSMutableArray's alloc()'s init()`
      : ``
  }
  
  set pageCount to (pdfDoc's pageCount()) - 1
  repeat with pageIndex from 0 to pageCount
    -- Create an NSImage from each page of the PDF document
    set pdfPage to (pdfDoc's pageAtIndex:pageIndex)
    set pdfRect to (pdfPage's boundsForBox:(current application's kPDFDisplayBoxMediaBox))
    set pdfImage to (current application's NSImage's alloc()'s initWithSize:{item 1 of item 2 of pdfRect, item 2 of item 2 of pdfRect})
    pdfImage's lockFocus()
    (pdfPage's drawWithBox:(current application's kPDFDisplayBoxMediaBox))
    pdfImage's unlockFocus()

    ${
      preferences.imageResultHandling == ImageResultHandling.CopyToClipboard
        ? `pageImages's addObject:pdfImage`
        : `
  
    -- Convert the NSImage to PNG data
    set pngData to pdfImage's TIFFRepresentation()
    set pngRep to (current application's NSBitmapImageRep's imageRepWithData:pngData)
    set pngData to (pngRep's representationUsingType:(current application's ${repType}) |properties|:(missing value))
    
    -- Write the PNG data to a new file
    set filePath to "${newPathBase}/page-" & pageIndex + 1 & ".${targetType.toLowerCase()}"
    set fileURL to current application's NSURL's fileURLWithPath:filePath
    ${preferences.imageResultHandling == ImageResultHandling.OpenInPreview ? `pageImages's addObject:fileURL` : ``}
    pngData's writeToURL:fileURL atomically:false`
    }
  end repeat

  ${
    preferences.imageResultHandling == ImageResultHandling.OpenInPreview
      ? `
    -- Open the images of each page in Preview, then delete their temporary files
    tell application "Finder"
      set previewPath to POSIX path of ((application file id "com.apple.Preview") as text)
      set previewURL to current application's NSURL's fileURLWithPath:previewPath
    end tell

    set workspace to current application's NSWorkspace's sharedWorkspace()
    set config to current application's NSWorkspaceOpenConfiguration's configuration()
    workspace's openURLs:pageImages withApplicationAtURL:previewURL configuration:config completionHandler:(missing value)
    delay 1
    
    set fileManager to current application's NSFileManager's defaultManager()
    repeat with imageURL in pageImages
      fileManager's removeItemAtURL:imageURL |error|:(missing value)
    end repeat
    `
      : ``
  }
  
  ${
    preferences.imageResultHandling == ImageResultHandling.CopyToClipboard
      ? `
    -- Copy the image of each page to the clipboard
    set thePasteboard to current application's NSPasteboard's generalPasteboard()
    thePasteboard's clearContents()
    thePasteboard's writeObjects:pageImages`
      : ``
  }`,
    { timeout: 60 * 1000 * 5 },
  );
};

/**
 * Rotates each page of a PDF by the specified degrees.
 *
 * @param pdfPath The path of the PDF to rotate.
 * @param degrees The amount to rotate each page by. Must be a multiple of 90.
 */
export const rotatePDF = async (pdfPath: string, degrees: number): Promise<string> => {
  const preferences = getPreferenceValues<Preferences>();

  let newPath = pdfPath;
  if (preferences.imageResultHandling == ImageResultHandling.SaveToDownloads) {
    newPath = path.join(os.homedir(), "Downloads", path.basename(newPath, path.extname(newPath)) + ".pdf");
  } else if (preferences.imageResultHandling == ImageResultHandling.SaveToDesktop) {
    newPath = path.join(os.homedir(), "Desktop", path.basename(newPath, path.extname(newPath)) + ".pdf");
  } else if (
    preferences.imageResultHandling == ImageResultHandling.CopyToClipboard ||
    preferences.imageResultHandling == ImageResultHandling.OpenInPreview
  ) {
    newPath = path.join(os.tmpdir(), path.basename(newPath, path.extname(newPath)) + ".pdf");
  }

  let iter = 2;
  while (fs.existsSync(newPath) && os.tmpdir() != path.dirname(newPath)) {
    newPath = path.join(
      path.dirname(newPath),
      path.basename(newPath, path.extname(newPath)) + ` (${iter})${path.extname(newPath)}`,
    );
    iter++;
  }

  runAppleScript(`use framework "Foundation"
  use framework "PDFKit"
  
  -- Load the PDF file as NSData
  set pdfData to current application's NSData's dataWithContentsOfFile:"${pdfPath}"
  
  -- Create a PDFDocument from the PDF data
  set pdfDoc to current application's PDFDocument's alloc()'s initWithData:pdfData
  
  -- Loop through the pages and rotate each one
  repeat with i from 0 to ((pdfDoc's pageCount()) - 1)
    set pdfPage to (pdfDoc's pageAtIndex:i)
    pdfPage's setRotation:((pdfPage's |rotation|()) + ${degrees})
  end repeat
  
  -- Write the modified PDF data to a new file
  set rotatedPdfData to pdfDoc's dataRepresentation()
  rotatedPdfData's writeToFile:"${newPath}" atomically:false`);
  return newPath;
};

/**
 *
 * @param pdfPath The PDF to flip each page of.
 * @param direction The direction to flip. Must be a valid {@link Direction}.
 */
export const flipPDF = async (pdfPath: string, direction: Direction) => {
  const preferences = getPreferenceValues<Preferences>();

  let newPath = pdfPath;
  if (preferences.imageResultHandling == ImageResultHandling.SaveToDownloads) {
    newPath = path.join(os.homedir(), "Downloads", path.basename(newPath));
  } else if (preferences.imageResultHandling == ImageResultHandling.SaveToDesktop) {
    newPath = path.join(os.homedir(), "Desktop", path.basename(newPath));
  } else if (
    preferences.imageResultHandling == ImageResultHandling.CopyToClipboard ||
    preferences.imageResultHandling == ImageResultHandling.OpenInPreview
  ) {
    newPath = path.join(os.tmpdir(), path.basename(newPath));
  }

  let iter = 2;
  while (fs.existsSync(newPath) && os.tmpdir() != path.dirname(newPath)) {
    newPath = path.join(
      path.dirname(newPath),
      path.basename(newPath, path.extname(newPath)) + ` (${iter})${path.extname(newPath)}`,
    );
    iter++;
  }

  const flipInstruction =
    direction == Direction.HORIZONTAL
      ? `(transform's scaleXBy:-1 yBy:1)
    (transform's translateXBy:(-(item 1 of item 2 of pdfRect)) yBy:0)`
      : `(transform's scaleXBy:1 yBy:-1)
    (transform's translateXBy:0 yBy:(-(item 2 of item 2 of pdfRect)))`;

  runAppleScript(`use framework "Foundation"
  use framework "PDFKit"
  
  -- Load the PDF file as NSData
  set pdfData to current application's NSData's dataWithContentsOfFile:"${pdfPath}"
  
  -- Create a PDFDocument from the PDF data
  set pdfDoc to current application's PDFDocument's alloc()'s initWithData:pdfData
  
  -- Flip each page
  repeat with i from 0 to ((pdfDoc's pageCount()) - 1)
    set thePDFPage to (pdfDoc's pageAtIndex:i)
    set pdfRect to (thePDFPage's boundsForBox:(current application's kPDFDisplayBoxMediaBox))
    set flippedPdfImage to (current application's NSImage's alloc()'s initWithSize:(item 2 of pdfRect))
    
    flippedPdfImage's lockFocus()
    set transform to current application's NSAffineTransform's alloc()'s init()
    ${flipInstruction}
    transform's concat()
    (thePDFPage's drawWithBox:(current application's kPDFDisplayBoxMediaBox))
    flippedPdfImage's unlockFocus()
    
    set newPage to (current application's PDFPage's alloc()'s initWithImage:flippedPdfImage)
    
    (pdfDoc's removePageAtIndex:i)
    (pdfDoc's insertPage:newPage atIndex:i)
  end repeat
  
  -- Write the modified PDF data to the file
  set flippedPdfData to pdfDoc's dataRepresentation()
  flippedPdfData's writeToFile:"${newPath}" atomically:false`);
  return newPath;
};

/**
 * Gets the destination path for an image, given the original path and the desired extension, taking the user's preferences into account.
 * @param originalPath The original path of the image.
 * @param targetExtension The desired extension of the image. If not provided, the original extension will be used.
 * @returns The destination path for the image.
 */
export const getImageDestination = (originalPath: string, targetExtension?: string): string => {
  const preferences = getPreferenceValues<Preferences>();

  // Decompose the original path into its components
  const originalExtension = path.extname(originalPath);
  const originalName = path.basename(originalPath, originalExtension);
  const originalDir = path.dirname(originalPath);

  // Construct & return the new path
  const newExtension = targetExtension ? `${targetExtension}` : originalExtension;
  const newFileName = `${originalName}.${newExtension}`;

  if (preferences.imageResultHandling == ImageResultHandling.SaveToDownloads) {
    const desktopPath = path.join(os.homedir(), "Downloads");
    return path.join(desktopPath, newFileName);
  } else if (preferences.imageResultHandling == ImageResultHandling.SaveToDesktop) {
    const desktopPath = path.join(os.homedir(), "Desktop");
    return path.join(desktopPath, newFileName);
  }
  return path.join(originalDir, newFileName);
};

/**
 * Opens the specified paths in Preview.
 *
 * @param filePaths The paths of the files to open.
 */
export const openPathsInPreview = async (filePaths: string | string[]) => {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  const containsSVG = paths.some((p) => path.extname(p) == ".svg");

  await runAppleScript(`use framework "Foundation"
    use scripting additions
    set pageImages to {${paths.map((p) => `current application's NSURL's fileURLWithPath:"${p}"`).join(", ")}}

    set workspace to current application's NSWorkspace's sharedWorkspace()
    set config to current application's NSWorkspaceOpenConfiguration's configuration()

    ${
      containsSVG
        ? `tell application "Finder"
            set safariPath to POSIX path of ((application file id "com.apple.Safari") as text)
            set safariURL to current application's NSURL's fileURLWithPath:safariPath
          end tell

          workspace's openURLs:pageImages withApplicationAtURL:safariURL configuration:config completionHandler:(missing value)
          
          tell application "Safari"
            set finished to false
            set iter to 0
            repeat while ((count of windows) = 0 or finished is not true) and iter < 10
              delay 0.5
              set iter to iter + 1

              set currentStatus to true
              repeat with doc in (path of documents as list)
                repeat with thePath in {"${paths.map((p) => encodeURI(`file://${p}`)).join('", "')}"}
                  if thePath is not in doc then
                    set currentStatus to false
                  end if
                end repeat
              end repeat
              set finished to currentStatus
            end repeat
          end tell
          `
        : `tell application "Finder"
            set previewPath to POSIX path of ((application file id "com.apple.Preview") as text)
            set previewURL to current application's NSURL's fileURLWithPath:previewPath
          end tell

          workspace's openURLs:pageImages withApplicationAtURL:previewURL configuration:config completionHandler:(missing value)
          
          tell application "Preview"
            set finished to false
            set iter to 0
            repeat while ((count of windows) = 0 or finished is not true) and iter < 10
              delay 0.5
              set iter to iter + 1

              set currentStatus to true
              repeat with doc in (path of documents as list)
                repeat with thePath in {"${paths.join('", "')}"}
                  if thePath is not in doc then
                    set currentStatus to false
                  end if
                end repeat
              end repeat
              set finished to currentStatus
            end repeat
          end tell`
    }`);
};

/**
 * Deletes the files at the given paths.
 *
 * @param filePaths The paths of the files to delete.
 */
export const deleteFiles = (filePaths: string | string[]) => {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  for (const path of paths) {
    fs.unlinkSync(path);
  }
};

/**
 * Returns the name of the frontmost application based on whether it owns the menubar.
 *
 * @returns The name of the frontmost application, or "Finder" if no application owns the menubar, which shouldn't generally happen.
 */
export const getMenubarOwningApplication = async () => {
  return runAppleScript(`use framework "Foundation"
    use scripting additions
    set workspace to current application's NSWorkspace's sharedWorkspace()
    set runningApps to workspace's runningApplications()
    
    set targetApp to missing value
    repeat with theApp in runningApps
      if theApp's ownsMenuBar() then
        set targetApp to theApp
        exit repeat
      end if
    end repeat
    
    if targetApp is missing value then
      return "Finder"
    else
      return targetApp's localizedName() as text
    end if`);
};

/**
 * Returns the current directory of the file manager. Tries Path Finder first, if it's the frontmost application, then falls back to Finder.
 *
 * @returns The current directory of the file manager.
 */
export const getCurrentDirectory = async (itemPath: string) => {
  // Get name of frontmost application
  let activeApp = "Finder";
  try {
    activeApp = await getMenubarOwningApplication();
  } catch (error) {
    console.error(`Couldn't get frontmost application: ${error}`);
  }

  // Attempt to get current directory of Path Finder
  try {
    if (activeApp == "Path Finder") {
      return runAppleScript(`tell application "Path Finder"
        if 1 ≤ (count finder windows) then
          try
          get POSIX path of (target of finder window 1)
          on error message number -1728
            -- Folder is nonstandard, use container of selection
            tell application "System Events"
              set itemPath to POSIX file "${itemPath}" as alias
              return POSIX path of container of itemPath
            end tell
          end try
        else
          get POSIX path of desktop
        end if
      end tell`);
    }
  } catch (error) {
    // Error getting directory of Path Finder, fall back to Finder
    console.error(`Couldn't get current directory of Path Finder: ${error}`);
  }

  // Fallback to getting current directory from Finder
  return runAppleScript(`tell application "Finder"
    if 1 ≤ (count Finder windows) then
      try
        return POSIX path of (target of window 1 as alias)
      on error message number -1700
        -- Folder is nonstandard, use container of selection
        set itemPath to POSIX file "${itemPath}" as alias
        return POSIX path of (container of itemPath as alias)
      end try
    else
      return POSIX path of (desktop as alias)
    end if
  end tell`);
};

/**
 * Returns the destination paths for the given original paths, based on the user's preferences.
 *
 * @param originalPaths The original paths of image files.
 * @param generated Whether the images were generated by the extension.
 * @param newExtension The new extension of the images, if any.
 * @returns The destination paths for the given original paths.
 */
export const getDestinationPaths = async (
  originalPaths: string[],
  generated = false,
  newExtension: string | undefined = undefined,
): Promise<string[]> => {
  const preferences = getPreferenceValues<Preferences>();
  const currentDirectory = await getCurrentDirectory(originalPaths[0]);
  return originalPaths.map((imgPath) => {
    let newPath = imgPath;
    if (preferences.imageResultHandling == ImageResultHandling.SaveToDownloads) {
      newPath = path.join(os.homedir(), "Downloads", path.basename(newPath));
    } else if (preferences.imageResultHandling == ImageResultHandling.SaveToDesktop) {
      newPath = path.join(os.homedir(), "Desktop", path.basename(newPath));
    } else if (
      (preferences.imageResultHandling == ImageResultHandling.SaveInContainingFolder ||
        preferences.imageResultHandling == ImageResultHandling.ReplaceOriginal) &&
      (preferences.inputMethod == ImageInputSource.Clipboard || generated)
    ) {
      newPath = path.join(currentDirectory, path.basename(newPath));
    } else if (
      preferences.imageResultHandling == ImageResultHandling.CopyToClipboard ||
      preferences.imageResultHandling == ImageResultHandling.OpenInPreview
    ) {
      newPath = path.join(os.tmpdir(), path.basename(newPath));
    }

    newPath = newExtension ? newPath.replace(path.extname(newPath), `.${newExtension}`) : newPath;

    if (
      preferences.imageResultHandling != ImageResultHandling.ReplaceOriginal &&
      os.tmpdir() != path.dirname(newPath)
    ) {
      let iter = 2;
      while (fs.existsSync(newPath)) {
        newPath = path.join(
          path.dirname(newPath),
          path.basename(newPath, path.extname(newPath)) + `-${iter}${path.extname(newPath)}`,
        );
        iter++;
      }
    }
    return newPath;
  });
};

/**
 * Shows or updates a toast to display the given error, and logs the error to the console.
 * @param title The title of the toast.
 * @param error The error to show.
 * @param toast The toast to update.
 */
export const showErrorToast = async (title: string, error: Error, toast?: Toast, messageText?: string) => {
  console.error(error);
  if (!toast) {
    toast = await showToast({
      title: title,
      message: messageText ?? error.message,
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Copy Error",
        onAction: async () => {
          await Clipboard.copy(error.message);
        },
      },
    });
  } else {
    toast.title = title;
    toast.message = messageText ?? error.message;
    toast.style = Toast.Style.Failure;
    toast.primaryAction = {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(error.message);
      },
    };
  }
};

/**
 * Extracts the RGB and alpha values from a hex color. The default alpha value is 255 (FF).
 * @param hex The 6- or 8-digit hex color to extract values from. The hash is optional.
 * @returns An object.
 */
export const hexToRGBA = (hex: string) => {
  const hexWithoutHash = hex.replace("#", "");
  const hexWithoutAlpha = hexWithoutHash.slice(0, 6);
  const alpha = hexWithoutHash.slice(6, 8);
  const hex16 = parseInt(hexWithoutAlpha, 16);
  const red = (hex16 >> 16) & 255;
  const green = (hex16 >> 8) & 255;
  const blue = hex16 & 255;
  return {
    red,
    green,
    blue,
    alpha: alpha ? parseInt(alpha, 16) : 255,
  };
};

export const expandTilde = (filePath: string) => {
  const homedir = os.homedir();
  if (filePath.startsWith("~")) {
    return filePath.replace(/^~(?=$|\/|\\)/, homedir);
  }

  const regex = /(\/Users\/.*?)\/.*/;
  const match = filePath.match(regex);
  if (match) {
    return filePath.replace(match[1], homedir);
  }
  return filePath;
};
