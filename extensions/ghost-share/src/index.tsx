import { showToast, Toast, Clipboard, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import { openAsBlob } from "fs";
import path from "path";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Ghost Share",
    message: "Detecting selected file...",
  });

  try {
    // 1. Get selected file from Finder via AppleScript
    const script = `
      tell application "Finder"
        set selectedItems to selection
        if (count of selectedItems) is 0 then
          return "ERROR: No file selected"
        end if
        set firstItem to item 1 of selectedItems
        return (POSIX path of (firstItem as alias))
      end tell
    `;

    const filePath = await runAppleScript<string>(script);

    if (filePath.startsWith("ERROR:")) {
      toast.style = Toast.Style.Failure;
      toast.title = "Selection Error";
      toast.message = "Please select a file in Finder.";
      return;
    }

    const fileName = path.basename(filePath);
    toast.message = `Uploading ${fileName}...`;

    // 2. Prepare FormData for Catbox.moe
    const fileBlob = await openAsBlob(filePath);
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fileBlob, fileName);

    // 3. Upload to Catbox
    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: form,
    });

    const rawBody = await response.text();

    if (response.ok && rawBody.startsWith("http")) {
      const link = rawBody.trim();
      
      // 4. Copy to clipboard and notify
      await Clipboard.copy(link);
      
      toast.style = Toast.Style.Success;
      toast.title = "Link Copied!";
      toast.message = link;

      await showHUD(`Ghost: Link copied for ${fileName}`);
    } else {
      throw new Error(`Upload failed (Status ${response.status}): ${rawBody.slice(0, 100)}`);
    }
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Upload Failed";
    toast.message = error instanceof Error ? error.message : "Internal error";
  }
}
