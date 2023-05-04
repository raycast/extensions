import { exec } from 'child_process';
import Jimp from 'jimp';
import jsQR from 'jsqr';
import { promisify } from 'util';
import os from 'os';

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
export async function readDataFromQRCodeOnScreen(type: ScanType) {
  try {
    const path = `${TEMP_DIR}/raycast-one-time-password-qr.png`;
    let outputCode: string | undefined;

    switch (type) {
      case 'scan': {
        for (let i = 0; i < (await getDisplayCount()); i++) {
          await execAsync(`/usr/sbin/screencapture -xD ${i + 1} ${path}`);
          outputCode = await extractQRCodeFromImage(path);
          if (outputCode) break;
        }
        break;
      }
      case 'select': {
        await execAsync(`/usr/sbin/screencapture -xi ${path}`);
        outputCode = await extractQRCodeFromImage(path);
        break;
      }
    }

    await execAsync(`rm ${path}`);

    return outputCode;
  } catch {
    /* empty */
  }
}

export function getCurrentSeconds() {
  return Math.round(new Date().getTime() / 1000);
}

export function splitStrToParts(str: string, partLength = 3) {
  const regex = new RegExp(`(.{${partLength}})`, 'g');
  return str.replace(regex, '$1 ').trim();
}
