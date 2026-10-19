import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { extractQRCodeFromImage } from '.';
import fs from 'fs/promises';
const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

async function getDisplayCount() {
  const { stdout } = await execAsync('/usr/sbin/system_profiler SPDisplaysDataType | grep Resolution: | wc -l');
  const count = parseInt(stdout.trim(), 10) || 1;
  return count;
}

export async function scanMacOsQRCodeAcrossDisplays(path: string): Promise<string | undefined> {
  let scannedData: string | undefined;
  const displayCount = await getDisplayCount();
  for (let i = 0; i < displayCount; i++) {
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

export async function selectMacOsQRCodeRegion(path: string): Promise<string | undefined> {
  await execAsync(`/usr/sbin/screencapture -xi ${path}`);
  const selectedData = await extractQRCodeFromImage(path);

  try {
    await fs.unlink(path);
  } catch (cleanUpError) {
    console.warn(`Could not delete temporary file ${path}:`, cleanUpError);
  }
  return selectedData;
}

// Reads an image copied to the clipboard, e.g. a screenshot taken with ⌃⇧⌘4.
export async function readMacOsClipboardImageQRCode(path: string): Promise<string | undefined> {
  const script = [
    'on run argv',
    'set png to the clipboard as «class PNGf»',
    'set handle to open for access (POSIX file (item 1 of argv)) with write permission',
    'set eof handle to 0',
    'write png to handle',
    'close access handle',
    'end run',
  ];
  try {
    await execFileAsync('/usr/bin/osascript', [...script.flatMap((line) => ['-e', line]), path]);
    return await extractQRCodeFromImage(path);
  } catch {
    return undefined;
  } finally {
    await fs.unlink(path).catch(() => undefined);
  }
}
