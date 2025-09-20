import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runAppleScript } from "@raycast/utils";
export async function downloadFile(url: string) {
  try {
    // Create an AppleScript with proper quote handling
    const script = `
      set downloadURL to "${url.replace(/"/g, '\\"')}"
      set downloadsFolder to POSIX path of (path to downloads folder)
      
      -- Remove query parameters from URL
      set cleanURL to downloadURL
      set AppleScript's text item delimiters to "?"
      if (count of text items of downloadURL) > 1 then
        set cleanURL to first text item of downloadURL
      end if
      set AppleScript's text item delimiters to ""
      
      -- Extract filename without query params
      set AppleScript's text item delimiters to "/"
      set fileName to last text item of cleanURL
      set AppleScript's text item delimiters to ""
      
      set destinationPath to downloadsFolder & fileName
      
      -- Use quoted form for all shell commands
      do shell script "curl -L " & quoted form of downloadURL & " -o " & quoted form of destinationPath
      
      return destinationPath
    `;

    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Download completed", `File saved to Downloads folder.`);
    return result;
  } catch (error) {
    console.error(`Download error: ${error}`);
    await showFailureToast(error, { title: "Download failed" });
    return null;
  }
}
