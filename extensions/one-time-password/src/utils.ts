import { exec } from 'child_process';
import Jimp from 'jimp';
import jsQR from 'jsqr';
import { closeMainWindow, Clipboard } from '@raycast/api';
import { Monitor } from './lib/node-screenshots';
import fs from 'fs/promises';
import { promisify } from 'util';
import os from 'os';

// example qrcodes https://gist.github.com/kcramer/c6148fb906e116d84e4bde7b2ab56992

const isWin = process.platform === 'win32';
const isMacOs = process.platform === 'darwin';

export type ScanType = 'scan' | 'select' | null;

const execAsync = promisify(exec);
const TEMP_DIR = os.tmpdir();

async function getDisplayCount() {
  const { stdout } = await execAsync('/usr/sbin/system_profiler SPDisplaysDataType | grep Resolution: | wc -l');
  const count = parseInt(stdout.trim(), 10) || 1;
  return count;
}

async function extractQRCodeFromImage(path: string) {
  const image = await Jimp.read(path);
  const { data, width, height } = image.bitmap;
  const code = jsQR(Uint8ClampedArray.from(data), width, height);
  return code?.data;
}

function isGoogleAuthenticatorMigration(str?: string) {
  return str?.startsWith('otpauth-migration://');
}

type QRCodeReadOutput = {
  data?: string;
  isGoogleAuthenticatorMigration?: boolean;
};

async function scanMacOsQRCodeAcrossDisplays(path: string): Promise<string | undefined> {
  let scannedData: string | undefined;
  for (let i = 0; i < (await getDisplayCount()); i++) {
    await execAsync(`/usr/sbin/screencapture -xD ${i + 1} ${path}`);
    scannedData = await extractQRCodeFromImage(path);
    if (scannedData) break;
  }

  try {
    await fs.unlink(path);
  } catch (cleanUpError) {
    console.warn(`Could not delete temporary file ${path}:`, cleanUpError);
  }

  return scannedData;
}

async function selectMacOsQRCodeRegion(path: string): Promise<string | undefined> {
  await execAsync(`/usr/sbin/screencapture -xi ${path}`);
  const selectedData = await extractQRCodeFromImage(path);

  try {
    await fs.unlink(path);
  } catch (cleanUpError) {
    console.warn(`Could not delete temporary file ${path}:`, cleanUpError);
  }
  return selectedData;
}

async function scanWindowsQRCodeAcrossDisplays(path: string): Promise<string | undefined> {
  let scannedData: string | undefined;

  try {
    const displays = await Monitor.all();

    // we hide raycast to capture qr code
    await closeMainWindow();
    for (const display of displays) {
      // Capture each display individually
      let image = await display.captureImage();
      let data = await image.toPng();
      await fs.writeFile(path, data);
      console.log(path);
      scannedData = await extractQRCodeFromImage(path);
      if (scannedData) {
        break; // Stop if a QR code is found
      }
    }

    // relaunch for progress
    await execAsync(`start raycast:`).catch(() => {});
  } catch (error) {
    console.error('Error scanning screens on Windows:', error);
    // You might want to handle this error more gracefully, e.g., throw it or return undefined.
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
  // TODO: clipboard api not supported on windows right now
  const { file } = await Clipboard.read();

  if (file) {
    await fs.writeFile(path, file);
    scannedData = await extractQRCodeFromImage(path);
  }

  try {
    await fs.unlink(path);
  } catch (cleanUpError) {
    console.warn(`Could not delete temporary file ${path}:`, cleanUpError);
  }

  return scannedData;
}

async function selectWindowsQRCodeRegion(path: string): Promise<string | undefined> {
  try {
    // We hide raycast
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

export async function readDataFromQRCodeOnScreen(type: ScanType): Promise<QRCodeReadOutput> {
  const path = `${TEMP_DIR}/raycast-one-time-password-qr.png`;
  const output: QRCodeReadOutput = {};

  switch (type) {
    case 'scan':
      {
        if (isMacOs) {
          output.data = await scanMacOsQRCodeAcrossDisplays(path);
        }

        if (isWin) {
          output.data = await scanWindowsQRCodeAcrossDisplays(path);
        }
      }

      break;
    case 'select': {
      if (isMacOs) {
        output.data = await selectMacOsQRCodeRegion(path);
      }

      if (isWin) {
        output.data = await selectWindowsQRCodeRegion(path);
      }

      break;
    }
  }

  output.isGoogleAuthenticatorMigration = isGoogleAuthenticatorMigration(output.data);

  return output;
}

export function getCurrentSeconds() {
  return Math.round(new Date().getTime() / 1000);
}

export function splitStrToParts(str: string, partLength = 3) {
  const regex = new RegExp(`(.{${partLength}})`, 'g');
  return str.replace(regex, '$1 ').trim();
}

export function parseUrl<T extends string>(url: string) {
  const qs = url.slice(url.indexOf('?'));
  const searchParams = new URLSearchParams(qs);
  return Object.fromEntries(searchParams.entries()) as { [K in T]: string };
}
