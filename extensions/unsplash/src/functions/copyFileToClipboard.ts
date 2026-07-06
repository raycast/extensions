import { showToast, Toast, environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, unlinkSync } from "fs";

const execFileP = promisify(execFile);

interface CopyFileToClipboardProps {
  url: string;
  id: string;
}

export const copyFileToClipboard = async ({ url, id }: CopyFileToClipboardProps) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and copying image...");

  const selectedPath = environment.supportPath;
  const fixedPathName = selectedPath.endsWith("/") ? `${selectedPath}${id}.jpg` : `${selectedPath}/${id}.jpg`;

  try {
    if (process.platform === "win32") {
      if (!existsSync(fixedPathName)) {
        try {
          await execFileP("curl.exe", ["-s", "--fail", "-o", fixedPathName, url]);
        } catch (err) {
          try {
            unlinkSync(fixedPathName);
          } catch {
            // ignore cleanup error
          }
          throw err;
        }
      }
      const ps = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$img = [System.Drawing.Image]::FromFile('${fixedPathName.replace(/'/g, "''")}')
[System.Windows.Forms.Clipboard]::SetImage($img)
$img.Dispose()`;
      const encoded = Buffer.from(ps.trim(), "utf16le").toString("base64");
      await execFileP("powershell", ["-NoProfile", "-STA", "-EncodedCommand", encoded]);
      toast.style = Toast.Style.Success;
      toast.title = "Image copied to the clipboard!";
      return;
    }

    const actualPath = fixedPathName;

    const command = !existsSync(actualPath)
      ? `set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd`
      : "";

    await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
      set q_temp_folder to quoted form of temp_folder

      ${command}

      set x to alias (POSIX file temp_folder)
      set the clipboard to (read (contents of x) as JPEG picture)
    `);

    toast.style = Toast.Style.Success;
    toast.title = "Image copied to the clipboard!";
  } catch (err) {
    console.error(err);

    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong.";
    toast.message = "Try with another image or check your internet connection.";
  }
};

export default copyFileToClipboard;
