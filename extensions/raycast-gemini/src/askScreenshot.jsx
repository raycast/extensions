import { closeMainWindow, environment, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import util from "util";
import { platform } from "os";

const execPromise = util.promisify(exec);

export default async function askScreenshot(props, prompt, isSelecting) {
  await closeMainWindow();

  const isWindows = platform() === "win32";
  const screenshotPath = `${environment.assetsPath}/screenshot.png`;

  let fileBuffer;
  try {
    if (isWindows) {
      // Windows: Use PowerShell to capture screenshot
      const windowsPath = screenshotPath.replace(/\//g, "\\");
      if (isSelecting) {
        // For selected
        await execPromise(
          `powershell -Command "& {Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; [System.Windows.Forms.Clipboard]::Clear(); Start-Process 'explorer.exe' 'ms-screenclip:'; $maxWait = 240; while ($maxWait -gt 0) { if ([System.Windows.Forms.Clipboard]::ContainsImage()) { $img = [System.Windows.Forms.Clipboard]::GetImage(); $img.Save('${windowsPath}', [System.Drawing.Imaging.ImageFormat]::Png); exit 0; } Start-Sleep -Milliseconds 250; $maxWait--; }; exit 1; }"`,
        );
      } else {
        // For full screen
        await execPromise(
          `powershell -Command "& {Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bitmap = $null; $graphics = $null; try { $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen([System.Drawing.Point]::Empty, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save([string]'${windowsPath}', [System.Drawing.Imaging.ImageFormat]::Png); exit 0; } catch { Write-Error $_.Exception.Message; exit 1; } finally { if ($graphics) { $graphics.Dispose(); } if ($bitmap) { $bitmap.Dispose(); } } }"`,
        );
      }
    } else {
      // macOS: Use screencapture command (original logic)
      const screencaptureCmd = `/usr/sbin/screencapture ${isSelecting ? "-s" : ""} ${screenshotPath}`;
      await execPromise(screencaptureCmd);
    }

    fileBuffer = await fs.promises.readFile(screenshotPath);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get screenshot",
      message: error.message,
    });
    return;
  }

  console.log(`Screenshot captured at ${screenshotPath}`);

  try {
    await launchCommand({
      name: "askAI",
      type: LaunchType.UserInitiated,
      context: {
        buffer: [fileBuffer],
        args: props.arguments,
        context: prompt,
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch askAI command",
      message: error.message,
    });
  }
}
