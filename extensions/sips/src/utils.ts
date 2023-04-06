import { environment, getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { exec, execSync } from "child_process";
import { runAppleScript } from "run-applescript";

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
    `set imageTypes to {"PNG", "JPG", "JPEG", "TIF", "HEIF", "GIF", "ICO", "ICNS", "ASTC", "BMP", "DDS", "EXR", "JP2", "KTX", "Portable Bitmap", "Adobe Photoshop", "PVR", "TGA", "WebP"}

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
    `set imageTypes to {"PNG", "JPG", "JPEG", "TIF", "HEIF", "GIF", "ICO", "ICNS", "ASTC", "BMP", "DDS", "EXR", "JP2", "KTX", "Portable Bitmap", "Adobe Photoshop", "PVR", "TGA", "WebP"}

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
 * @param webpPath The path of the webP image.
 */
export const execSIPSCommandOnWebP = async (command: string, webpPath: string) => {
  const newPath = `${environment.supportPath}/tmp.png`;
  execSync(
    `${environment.assetsPath}/webp/dwebp "${webpPath}" -o "${newPath}" && ${command} "${newPath}" && ${environment.assetsPath}/webp/cwebp "${newPath}" -o "${webpPath}" ; rm "${newPath}"`
  );
};
