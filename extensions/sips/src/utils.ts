import { environment, getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import { runAppleScript, runAppleScriptSync } from "run-applescript";

interface Preferences {
  preferredFileManager: string;
}

/**
 * Gets currently selected images in Finder.
 *
 * @returns A promise resolving to the comma-separated list of images as a string.
 */
const getSelectedFinderImages = async (): Promise<string> => {
  return runAppleScript(
    `set imageTypes to {"PNG", "JPG", "JPEG", "TIF", "HEIF", "GIF", "ICO", "ICNS", "ASTC", "BMP", "DDS", "EXR", "JP2", "KTX", "Portable Bitmap", "Adobe Photoshop", "PVR", "TGA", "WebP", "SVG", "PDF", "HEIC"}

    tell application "Finder"
      set theSelection to selection
      if theSelection is {} then
        return
      else if (theSelection count) is equal to 1 then
        repeat with imageType in imageTypes
          if (kind of the first item of theSelection) contains imageType then
            return the POSIX path of (theSelection as alias)
            exit repeat
          end if
        end repeat
      else
        set thePaths to {}
        repeat with i from 1 to (theSelection count)
          repeat with imageType in imageTypes
            if (kind of (item i of theSelection)) contains imageType then
              copy (POSIX path of (item i of theSelection as alias)) to end of thePaths
              exit repeat
            end if
          end repeat
        end repeat
        return thePaths
      end if
    end tell`
  );
};

/**
 * Gets currently selected images in Path Finder.
 *
 * @returns A promise resolving to the comma-separated list of images as a string.
 */
const getSelectedPathFinderImages = async (): Promise<string> => {
  return runAppleScript(
    `set imageTypes to {"PNG", "JPG", "JPEG", "TIF", "HEIF", "GIF", "ICO", "ICNS", "ASTC", "BMP", "DDS", "EXR", "JP2", "KTX", "Portable Bitmap", "Adobe Photoshop", "PVR", "TGA", "WebP", "SVG", "PDF", "HEIC"}

    tell application "Path Finder"
      set theSelection to selection
      if theSelection is {} then
        return
      else if (theSelection count) is equal to 1 then
        repeat with imageType in imageTypes
          if (kind of the first item of theSelection) contains imageType then
            return the POSIX path of first item of theSelection
            exit repeat
          end if
        end repeat
      else
        set thePaths to {}
        repeat with i from 1 to (theSelection count)
          repeat with imageType in imageTypes
            if (kind of (item i of theSelection)) contains imageType then
              copy (POSIX path of (item i of theSelection)) to end of thePaths
              exit repeat
            end if
          end repeat
        end repeat
        return thePaths
      end if
    end tell`
  );
};

/**
 * Gets selected images in the preferred file manager application.
 *
 * @returns A promise resolving to the list of selected image paths.
 */
export const getSelectedImages = async (): Promise<string[]> => {
  const selectedImages: string[] = [];

  // Get name of preferred file manager
  const extensionPreferences = getPreferenceValues<Preferences>();
  const fileManager = extensionPreferences.preferredFileManager;
  let preferredFileManagerError = false;

  let activeApp = fileManager;
  try {
    activeApp = (await getFrontmostApplication()).name;
  } catch {
    console.log("Couldn't get frontmost application");
  }

  // Attempt to get selected images from Path Finder
  try {
    if (activeApp == "Path Finder" && fileManager == "Path Finder") {
      const pathFinderImages = (await getSelectedPathFinderImages()).split(", ");
      pathFinderImages.forEach((imgPath) => {
        if (!selectedImages.includes(imgPath)) {
          selectedImages.push(imgPath);
        }
      });
    }
  } catch (error) {
    console.log("Couldn't get images from Path Finder");
    preferredFileManagerError = true;
  }

  // Get selected images from Finder -- use as fallback for desktop selections & on error
  const finderImages = (await getSelectedFinderImages()).split(", ");
  if (activeApp == "Finder" || fileManager == "Finder" || preferredFileManagerError) {
    selectedImages.push(...finderImages);
  } else {
    // Add desktop selections
    finderImages.forEach((imgPath) => {
      if (imgPath.split("/").at(-2) == "Desktop" && !selectedImages.includes(imgPath)) {
        selectedImages.push(imgPath);
      }
    });
  }

  return selectedImages;
};

/**
 * Executes a SIPS command on a WebP image, using a temporary PNG in the process.
 *
 * @param command The SIPS command to execute.
 * @param webpPath The path of the WebP image.
 */
export const execSIPSCommandOnWebP = async (command: string, webpPath: string) => {
  const newPath = `${environment.supportPath}/tmp.png`;
  execSync(`chmod +x ${environment.assetsPath}/webp/dwebp`);
  execSync(`chmod +x ${environment.assetsPath}/webp/cwebp`);
  execSync(
    `${environment.assetsPath}/webp/dwebp "${webpPath}" -o "${newPath}" && ${command} "${newPath}" && ${environment.assetsPath}/webp/cwebp "${newPath}" -o "${webpPath}" ; rm "${newPath}"`
  );
};

/**
 * Executes a SIPS command on an SVG image, using a temporary PNG in the process.
 *
 * @param command The SIPS command to execute.
 * @param svgPath The path of the SVG image.
 */
export const execSIPSCommandOnSVG = async (command: string, svgPath: string) => {
  const newPath = `${environment.supportPath}/tmp.bmp`;
  convertSVG("BMP", svgPath, newPath);
  execSync(`chmod +x ${environment.assetsPath}/potrace/potrace`);
  execSync(
    `${command} "${newPath}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${svgPath}" "${newPath}"; rm "${newPath}"`
  );
};

/**
 * Converts an SVG to a SIPS-compatible image type.
 *
 * @param targetType The desired image type.
 * @param svgPath The path of the SVG image.
 * @param newPath The path to save the resulting image in.
 */
export const convertSVG = (targetType: string, svgPath: string, newPath: string) => {
  runAppleScriptSync(`use framework "Foundation"

  -- Load SVG image from file
  set svgFilePath to "${svgPath}"
  set svgData to current application's NSData's alloc()'s initWithContentsOfFile:svgFilePath
  
  -- Create image from SVG data
  set svgImage to current application's NSImage's alloc()'s initWithData:svgData
  
  -- Convert image to PNG data
  set tiffData to svgImage's TIFFRepresentation()
  set theBitmap to current application's NSBitmapImageRep's alloc()'s initWithData:tiffData
  set pngData to theBitmap's representationUsingType:(current application's NSBitmapImageFileType${targetType}) |properties|:(missing value)
  
  -- Save PNG data to file
  set pngFilePath to "${newPath}"
  pngData's writeToFile:pngFilePath atomically:true`);
};

/**
 * Converts a PDF to a SIPS-compatible image type, with each page stored in its own image file.
 *
 * @param targetType The desired image type.
 * @param pdfPath The path of the PDF document.
 * @param newPathBase The folder to place the resulting images in.
 */
export const convertPDF = (targetType: string, pdfPath: string, newPathBase: string) => {
  runAppleScriptSync(`use framework "Foundation"
  use framework "PDFKit"
  
  -- Load the PDF file as NSData
  set pdfData to current application's NSData's dataWithContentsOfFile:"${pdfPath}"
  
  -- Create a PDFDocument from the PDF data
  set pdfDoc to current application's PDFDocument's alloc()'s initWithData:pdfData
  
  set pageCount to (pdfDoc's pageCount()) - 1
  repeat with pageIndex from 0 to pageCount
    -- Create an NSImage from each page of the PDF document
    set pdfPage to (pdfDoc's pageAtIndex:pageIndex)
    set pdfRect to (pdfPage's boundsForBox:(current application's kPDFDisplayBoxMediaBox))
    set pdfImage to (current application's NSImage's alloc()'s initWithSize:{item 1 of item 2 of pdfRect, item 2 of item 2 of pdfRect})
    pdfImage's lockFocus()
    (pdfPage's drawWithBox:(current application's kPDFDisplayBoxMediaBox))
    pdfImage's unlockFocus()
    
    -- Convert the NSImage to PNG data
    set pngData to pdfImage's TIFFRepresentation()
    set pngRep to (current application's NSBitmapImageRep's imageRepWithData:pngData)
    set pngData to (pngRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value))
    
    -- Write the PNG data to a new file
    pngData's writeToFile:"${newPathBase}/page-" & pageIndex + 1 & ".${targetType.toLowerCase()}" atomically:true
  end repeat`);
};

/**
 * Rotates each page of a PDF by the specified degrees.
 *
 * @param pdfPath The path of the PDF to rotate.
 * @param degrees The amount to rotate each page by. Must be a multiple of 90.
 */
export const rotatePDF = (pdfPath: string, degrees: number) => {
  runAppleScriptSync(`use framework "Foundation"
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
  rotatedPdfData's writeToFile:"${pdfPath}" atomically:true`);
};

/**
 * Directions for flipping images.
 */
export enum Direction {
  HORIZONTAL = 0,
  VERTICAL = 1,
}

/**
 *
 * @param pdfPath The PDF to flip each page of.
 * @param direction The direction to flip. Must be a valid {@link Direction}.
 */
export const flipPDF = (pdfPath: string, direction: Direction) => {
  const flipInstruction =
    direction == Direction.HORIZONTAL
      ? `(transform's scaleXBy:-1 yBy:1)
    (transform's translateXBy:(-(item 1 of item 2 of pdfRect)) yBy:0)`
      : `(transform's scaleXBy:1 yBy:-1)
    (transform's translateXBy:0 yBy:(-(item 2 of item 2 of pdfRect)))`;

  runAppleScriptSync(`use framework "Foundation"
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
  flippedPdfData's writeToFile:"${pdfPath}" atomically:true`);
};
