import { runAppleScript } from "@raycast/utils";
import { writeFile } from "fs/promises";

// 可能失败，外部处理错误
export async function saveFileAs(content: string, defaultName: string): Promise<boolean> {
  // Replace special characters in defaultName to ensure it's AppleScript safe
  const safeDefaultName = defaultName.replace(/"/g, '\\"');

  // AppleScript to open a save dialog with a default name, allowing the user to choose the path and modify the file name
  const appleScript = `
    set theDialog to choose file name with prompt "Please choose where to save the file:" default name "${safeDefaultName}"
    return POSIX path of theDialog
`;

  // Execute the AppleScript
  try {
    const filePath = await runAppleScript(appleScript, {
      timeout: 60 * 1000, // 60 seconds
    });

    if (filePath) {
      // Write the file to the selected path
      await writeFile(filePath, content);
      console.log(`File has been saved to: ${filePath}`);
      return true;
    } else {
      console.log("No path was selected.");
      return false;
    }
  } catch (err: any) {
    // 取消
    if (err.message.includes("exit code 1")) {
      console.log("User canceled the save dialog");
      return false;
    } else if (err.message.includes("timed out")) {
      console.log("User took too long to select a path");
      return false;
    } else {
      throw err;
    }
  }
}
