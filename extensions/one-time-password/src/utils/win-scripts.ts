import { exec } from 'child_process';
import { closeMainWindow, Clipboard } from '@raycast/api';
import { runPowerShellScript } from '@raycast/utils';
import fs from 'fs/promises';
import { promisify } from 'util';
import { extractQRCodeFromImage } from '.';
const execAsync = promisify(exec);

export interface DisplayInfo {
  X: number;
  Y: number;
  Width: number;
  Height: number;
  DeviceName: string;
}

async function getWindowsDisplaysInfo(): Promise<DisplayInfo[]> {
  const getDisplaysScript = `
Add-Type -AssemblyName System.Windows.Forms
$allScreens = [System.Windows.Forms.Screen]::AllScreens
$displayList = @()
foreach ($screen in $allScreens) {
    $displayList += [PSCustomObject]@{
        X = $screen.Bounds.X;
        Y = $screen.Bounds.Y;
        Width = $screen.Bounds.Width;
        Height = $screen.Bounds.Height;
        DeviceName = $screen.DeviceName;
    }
}
$displayList | ConvertTo-Json -Compress
    `;

  const rawDisplayInfoJson = await runPowerShellScript(getDisplaysScript);
  let displays: DisplayInfo[] = [];
  try {
    const parsed = JSON.parse(rawDisplayInfoJson);
    if (Array.isArray(parsed)) {
      displays = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      displays = [parsed];
    }
  } catch {
    throw new Error('Could not parse display information from PowerShell.');
  }
  return displays;
}

async function captureWindowsScreenshot(
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number,
  outputPath: string
): Promise<void> {
  const singleScreenCaptureScript = `
Add-Type -AssemblyName System.Windows.Forms

try {
    $ScreenX = ${screenX}
    $ScreenY = ${screenY}
    $ScreenWidth = ${screenWidth}
    $ScreenHeight = ${screenHeight}
    $OutputPath = "${outputPath}" # Crucial to double-quote the path

    Write-Host "Capturing screen at X:$($ScreenX), Y:$($ScreenY) with size $($ScreenWidth)x$($ScreenHeight) to $($OutputPath)..."

    $bmp = New-Object System.Drawing.Bitmap($ScreenWidth, $ScreenHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)

    $graphics.CopyFromScreen($ScreenX, $ScreenY, 0, 0, (New-Object System.Drawing.Size($ScreenWidth, $ScreenHeight)))

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Screenshot saved successfully."

    $graphics.Dispose()
    $bmp.Dispose()

} catch {
    Write-Error "Error capturing single screenshot: $($_.Exception.Message)"
    throw $_.Exception # Re-throw to be caught by runPowerShellScript
}
    `;

  await runPowerShellScript(singleScreenCaptureScript);
}

export async function scanWindowsQRCodeAcrossDisplays(path: string): Promise<string | undefined> {
  let scannedData: string | undefined;

  try {
    const displays = await getWindowsDisplaysInfo();

    if (displays.length === 0) {
      console.warn('No displays found. Skipping screenshot capture.');
      return;
    }

    await closeMainWindow();

    for (const display of displays) {
      await captureWindowsScreenshot(display.X, display.Y, display.Width, display.Height, path);

      scannedData = await extractQRCodeFromImage(path);
      if (scannedData) {
        break;
      }
    }

    // relaunch for progress
    await execAsync(`start raycast:`).catch(() => {});
  } catch (error) {
    console.error('Error scanning screens on Windows:', error);
    return undefined;
  }

  try {
    await fs.unlink(path);
  } catch (cleanUpError) {
    console.warn(`Could not delete temporary file ${path}:`, cleanUpError);
  }

  return scannedData;
}

async function isProcessRunning(processName: string) {
  try {
    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}"`);
    // Check if the process name appears in the output, excluding the header line.
    // The output typically looks like:
    // Image Name                PID Session Name        Session#    Mem Usage
    // ========================= ======== ================ =========== ============
    // ScreenClippingHost.exe      1234 Console                   1     12,345 K
    const isRunning =
      stdout.toLowerCase().includes(processName.toLowerCase()) && !stdout.toLowerCase().startsWith('image name');
    return isRunning;
  } catch (error: any) {
    if (error.code === 1) {
      // Command executed but no process found (tasklist returns exit code 1 if no process matches)
      return false;
    }
    console.error(`Error executing tasklist for ${processName}: ${error.message}`);
    throw error; // Re-throw other errors
  }
}

async function openUriSchemeAndWaitForExit(uri: string, processNames: string[], pollInterval: number = 500) {
  return new Promise<void>(async (resolve, reject) => {
    console.log(`Attempting to open URI scheme: ${uri}`);

    // Launch the URI scheme using 'start' command.
    // 'start' itself exits immediately after launching the URI, so we need to monitor the process.
    execAsync(`start "" "${uri}"`)
      .then(() => {
        console.log(`URI scheme "${uri}" launched. Now monitoring for process exit...`);
        // Do not resolve here, we need to wait for the process to exit.
      })
      .catch((error) => {
        console.error(`Error launching URI scheme "${uri}": ${error.message}`);
        return reject(error);
      });

    // Start polling for the process to exit
    const intervalId = setInterval(async () => {
      let anyProcessRunning = false;
      for (const pName of processNames) {
        try {
          const running = await isProcessRunning(pName);
          if (running) {
            anyProcessRunning = true;
            break; // Found one running, no need to check others
          }
        } catch (checkError: any) {
          console.error(`Error checking process ${pName}: ${checkError.message}`);
          // Decide if this error should stop the polling or just log.
          // For now, we'll continue polling.
        }
      }

      if (!anyProcessRunning) {
        clearInterval(intervalId); // Stop polling
        console.log(`All monitored processes (${processNames.join(', ')}) have exited.`);
        resolve(); // Resolve the promise as the process has exited
      } else {
        // console.log(`Processes ${processNames.join(', ')} still running. Polling again...`);
      }
    }, pollInterval);
  });
}

async function readClipBoardFile(path: string) {
  let scannedData: string | undefined;

  try {
    const { file } = await Clipboard.read();

    if (file) {
      await fs.writeFile(path, file);
      scannedData = await extractQRCodeFromImage(path);
    }

    await fs.unlink(path);
  } catch (cleanUpError) {
    console.warn(`Could not delete temporary file ${path}:`, cleanUpError);
  }

  return scannedData;
}

export async function selectWindowsQRCodeRegion(path: string): Promise<string | undefined> {
  try {
    await closeMainWindow();

    await openUriSchemeAndWaitForExit('ms-screenclip://?clippingMode=Rectangle', [
      'ScreenClippingHost.exe',
      'SnippingTool.exe',
    ]);
    console.log('Screen clipping program has exited.');

    const selectedData = await readClipBoardFile(path);

    // Relaunch raycast
    await execAsync(`start raycast:`).catch(() => {});

    return selectedData;
  } catch (error) {
    console.error('Error selecting Windows QR code region:', error);
    return undefined;
  }
}
