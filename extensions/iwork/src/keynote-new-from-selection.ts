import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled } from "./index";

export default async function Main() {
  // Check for Keynote app
  const installed = await checkKeynoteInstalled();
  if (installed) {
    // Create slideshow
    await runAppleScript(`tell application "Finder"
        set fileList to {}
        set selectedFiles to selection as alias list
        repeat with theFile in selectedFiles
            set fileKind to the kind of theFile
            
            if "Image" is in fileKind then
                set end of fileList to theFile
            end if
        end repeat
    end tell

    tell application "Keynote"
        set theDoc to make new document
        
        set documentWidth to width of theDoc
        set documentHeight to height of theDoc
        
        repeat with theImage in fileList
            tell theDoc
                set theLayout to slide layout named "Blank"
                set theSlide to make new slide with properties {base layout:theLayout}
            end tell
            
            tell theSlide
                set newImage to make new image with properties {file:theImage, width:documentWidth, height:documentHeight, position:{0, 0}}
                set posX to (documentWidth - (width of newImage)) / 2
                set posY to (documentHeight - (height of newImage)) / 2
                set position of newImage to {posX, posY}
            end tell
        end repeat
        activate
    end tell`);
    showHUD(`Creating slideshow from selected images...`);
  }
}
