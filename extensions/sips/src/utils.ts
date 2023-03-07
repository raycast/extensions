import { runAppleScript } from "run-applescript";

export const getSelectedImages = async () => {
  const selectedImages = await runAppleScript(
    `tell application "Finder"
      set theSelection to selection
      if theSelection is {} then
        return
      else if (theSelection count) is equal to 1 then
        if (kind of the first item of theSelection) contains "image" then
          return the POSIX path of (theSelection as alias)
        end if
      else
        set thePaths to {}
        repeat with i from 1 to (theSelection count)
          if (kind of (item i of theSelection)) contains "image" then
            copy (POSIX path of (item i of theSelection as alias)) to end of thePaths
          end if
        end repeat
        return thePaths
      end if
    end tell`
  );

  return selectedImages.split(", ");
};
