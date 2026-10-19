import { Clipboard } from '@raycast/api';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import os from 'os';
import { fileURLToPath } from 'url';
import { readMacOsClipboardImageQRCode, scanMacOsQRCodeAcrossDisplays, selectMacOsQRCodeRegion } from './apple-scripts';
import { readClipBoardFile, scanWindowsQRCodeAcrossDisplays, selectWindowsQRCodeRegion } from './win-scripts';

// example qrcodes https://gist.github.com/kcramer/c6148fb906e116d84e4bde7b2ab56992
const isWin = process.platform === 'win32';
const isMacOs = process.platform === 'darwin';

export type ScanType = 'scan' | 'select' | null;

const TEMP_DIR = os.tmpdir();

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

function isGoogleAuthenticatorMigration(str?: string) {
  return str?.startsWith('otpauth-migration://');
}

export async function extractQRCodeFromImage(path: string) {
  const image = await Jimp.read(path);
  const { data, width, height } = image.bitmap;
  const code = jsQR(Uint8ClampedArray.from(data), width, height);
  return code?.data;
}

type QRCodeReadOutput = {
  data?: string;
  isGoogleAuthenticatorMigration?: boolean;
};

export async function readDataFromQRCodeOnScreen(type: ScanType): Promise<QRCodeReadOutput> {
  const path = `${TEMP_DIR}/raycast-one-time-password-qr.png`;
  const output: QRCodeReadOutput = {};

  switch (type) {
    case 'scan':
      {
        if (isMacOs) {
          output.data = await scanMacOsQRCodeAcrossDisplays(path);
        } else if (isWin) {
          output.data = await scanWindowsQRCodeAcrossDisplays(path);
        }
      }

      break;
    case 'select':
      {
        if (isMacOs) {
          output.data = await selectMacOsQRCodeRegion(path);
        } else if (isWin) {
          output.data = await selectWindowsQRCodeRegion(path);
        }
      }
      break;
  }

  output.isGoogleAuthenticatorMigration = isGoogleAuthenticatorMigration(output.data);

  return output;
}

const SETUP_LINK = /^otpauth(-migration)?:\/\//i;
const IMAGE_FILE = /\.(png|jpe?g|gif|bmp|tiff?)$/i;

// A copied otpauth:// link, a copied image file, or copied image data (e.g. a screenshot).
export async function readDataFromClipboard(): Promise<string | undefined> {
  const { text, file } = await Clipboard.read();
  if (SETUP_LINK.test(text.trim())) return text.trim();
  if (file) {
    const path = file.startsWith('file://') ? fileURLToPath(file) : file;
    return IMAGE_FILE.test(path) ? extractQRCodeFromImage(path).catch(() => undefined) : undefined;
  }
  const path = `${TEMP_DIR}/raycast-one-time-password-clipboard.png`;
  if (isMacOs) return readMacOsClipboardImageQRCode(path);
  if (isWin) return readClipBoardFile(path);
}
