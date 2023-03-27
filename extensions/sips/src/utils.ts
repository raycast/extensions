import { getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

interface Preferences {
  preferredFileManager: string;
}

const getSelectedFinderImages = async(): Promise<string> => {
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
}

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
}

export const getSelectedImages = async () => {
  const selectedImages: string[] = []

  // Get name of preferred file manager
  const extensionPreferences = getPreferenceValues<Preferences>()
  const fileManager = extensionPreferences.preferredFileManager
  let preferredFileManagerError = false

  let activeApp = fileManager
  try {
    activeApp = (await getFrontmostApplication()).name
  } catch {
    console.log("Couldn't get frontmost application")
  }

  console.log(activeApp)

  // Attempt to get selected images from Path Finder
  try {
    if (activeApp == "Path Finder" && fileManager == "Path Finder") {
      const pathFinderImages = (await getSelectedPathFinderImages()).split(", ")
      pathFinderImages.forEach((imgPath) => {
        if (!selectedImages.includes(imgPath)) {
          selectedImages.push(imgPath)
        }
      })
    }
  } catch (error) {
    console.log("Couldn't get images from Path Finder")
    preferredFileManagerError = true
  }

  // Get selected images from Finder -- use as fallback for desktop selections & on error
  const finderImages = (await getSelectedFinderImages()).split(", ")
  if (activeApp == "Finder" || fileManager == "Finder" || preferredFileManagerError) {
    selectedImages.push(...finderImages)
  } else {
    // Add desktop selections
    finderImages.forEach((imgPath) => {
      if (imgPath.split("/").at(-2) == "Desktop" && !selectedImages.includes(imgPath)) {
        selectedImages.push(imgPath)
      }
    })
  }

  console.log(selectedImages)

  return selectedImages;
};
