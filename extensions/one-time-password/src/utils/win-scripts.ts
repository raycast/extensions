import { exec } from 'child_process';
import { closeMainWindow } from '@raycast/api';
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
  outputPath: string,
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

async function saveClipboardImage(outputPath: string): Promise<void> {
  const singleScreenCaptureScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing # Required for ImageFormat


$savePath = "${outputPath}"

if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
    try {
        # Get the image from the clipboard
        $clipboardImage = [System.Windows.Forms.Clipboard]::GetImage()

        # Save the image as PNG to the specified file path
        $clipboardImage.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)

        Write-Host "Clipboard image successfully saved as PNG to: $($savePath)" -ForegroundColor Green
    }
    catch {
        throw "Error saving clipboard image: $($_.Exception.Message)" # Throw error if saving fails
    }
    finally {
        # Dispose of the image object to free up resources
        if ($clipboardImage) {
            $clipboardImage.Dispose()
        }
    }
} else {
    # Throw an error if no image is found in the clipboard
    throw "No image found in the clipboard. Please ensure an image is copied before running the script."
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

interface ExecError extends Error {
  code?: number;
}

async function isProcessRunning(processName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}"`);
    const isRunning =
      stdout.toLowerCase().includes(processName.toLowerCase()) && !stdout.toLowerCase().startsWith('image name');
    return isRunning;
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && (error as ExecError).code === 1) {
        return false;
      }
      console.error(`Error executing tasklist for ${processName}: ${error.message}`);
      throw error;
    } else {
      console.error(`An unexpected error occurred for ${processName}:`, error);
      throw new Error(`Unknown error type in isProcessRunning: ${String(error)}`);
    }
  }
}

async function openUriSchemeAndWaitForExit(uri: string, processNames: string[], pollInterval: number = 500) {
  console.log(`Attempting to open URI scheme: ${uri}`);
  return new Promise<void>((resolve, reject) => {
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
    const intervalId = setInterval(() => {
      let anyProcessRunning = false;
      (async () => {
        for (const pName of processNames) {
          try {
            const running = await isProcessRunning(pName);
            if (running) {
              anyProcessRunning = true;
              break; // Found one running, no need to check others
            }
          } catch (checkError) {
            if (checkError instanceof Error) {
              if ('code' in checkError && (checkError as ExecError).code !== undefined) {
                console.error(
                  `Error checking process ${pName}: ${checkError.message} (Code: ${(checkError as ExecError).code})`,
                );
              } else {
                console.error(`Error checking process ${pName}: ${checkError.message}`);
              }
              clearInterval(intervalId);
              return reject(checkError);
            } else {
              console.error(`An unexpected non-Error object occurred while checking process ${pName}:`, checkError);
              clearInterval(intervalId);
              return reject(new Error(`Unknown error type in polling for ${pName}: ${String(checkError)}`));
            }
          }
        }

        if (!anyProcessRunning) {
          clearInterval(intervalId);
          console.log(`All monitored processes (${processNames.join(', ')}) have exited.`);
          resolve();
        } else {
          // console.log(`Processes ${processNames.join(', ')} still running. Polling again...`);
        }
      })();
    }, pollInterval);
  });
}

async function readClipBoardFile(path: string) {
  let scannedData: string | undefined;

  try {
    await saveClipboardImage(path);
    scannedData = await extractQRCodeFromImage(path);
    await fs.unlink(path);
  } catch (error) {
    console.log('Failed to read scanned image', error);

    return undefined;
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
