import {
  Clipboard,
  environment,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
} from '@raycast/api';
import { fileTypeFromFile } from 'file-type';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

async function showFailureToast(
  title: string,
  message: string,
  showPrefs = true,
  customAction?: { title: string; onAction: () => void },
) {
  return await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: customAction
      ? customAction
      : showPrefs
        ? {
            title: 'Open Preferences',
            onAction: () => openCommandPreferences(),
          }
        : undefined,
  });
}

async function scanClipboardForImages(maxDepth: number): Promise<string[]> {
  const images: string[] = [];

  for (let i = 0; i < maxDepth; i++) {
    try {
      const clipboardItem = await Clipboard.read({ offset: i });
      if (!clipboardItem?.file) break;

      const localPath = fileURLToPath(clipboardItem.file);
      const type = await fileTypeFromFile(localPath);

      if (type?.mime.startsWith('image/')) {
        images.push(localPath);
      } else {
        console.log(`Offset ${i}: Found non-image file. Stopping.`);
        break;
      }
    } catch {
      console.log(`Offset ${i}: Error or end of history reached.`);
      break;
    }
  }

  return images;
}

function parseTimeout(timeoutStr: string): number | undefined {
  const seconds = parseInt(timeoutStr, 10);
  if (isNaN(seconds) || seconds < 0) return undefined;
  return seconds > 0 ? seconds * 1000 : undefined;
}

async function runShortcut(
  shortcutName: string,
  files: string[],
  timeoutMs?: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const imagePathArgsString = files.map(p => `"${p}"`).join(' ');
    const command = `/usr/bin/shortcuts run "${shortcutName}" -i ${imagePathArgsString}`;
    console.log(`Executing command: ${command}`);

    execSync(command, { encoding: 'utf-8', timeout: timeoutMs });
    return {
      success: true,
      message: `Shortcut "${shortcutName}" processed ${files.length} image(s).`,
    };
  } catch (error) {
    const errorDetails = error as ShortcutError;
    const stderrMessage = errorDetails.stderr?.toString().trim();

    if (
      stderrMessage?.includes('Error: Running was cancelled') ||
      errorDetails.message?.includes('Error: Running was cancelled')
    ) {
      console.log('Shortcut execution was cancelled by the user.');
      return { success: false, message: 'Cancelled' };
    }

    const errorMessage =
      stderrMessage ||
      errorDetails.message?.toString().trim() ||
      'Shortcut failed. Check Raycast logs (⌘L) for details.';
    return { success: false, message: errorMessage };
  }
}

export default async function main() {
  const prefs = getPreferenceValues<Preferences.MergeClipboardImages>();

  const timeoutMs = parseTimeout(prefs.shortcutTimeoutSeconds);
  if (timeoutMs === undefined && prefs.shortcutTimeoutSeconds) {
    await showFailureToast(
      'Invalid Shortcut Timeout',
      'Please set a valid number (0 or positive) for Shortcut Timeout.',
    );
    return;
  }

  if (!environment.canAccess(Clipboard)) {
    await showFailureToast(
      'Clipboard Access Denied',
      'Raycast needs clipboard access. Please grant in System Settings.',
      false,
    );
    return;
  }

  let toast = await showToast({ style: Toast.Style.Animated, title: 'Scanning clipboard...' });
  const files = await scanClipboardForImages(parseInt(prefs.maxHistoryDepth, 10));
  await toast.hide();

  if (files.length <= 1) {
    await showToast({
      style: Toast.Style.Failure,
      title: files.length === 0 ? 'No Images Found' : 'Not Enough Images',
      message:
        files.length === 0
          ? 'No images in clipboard history.'
          : 'Need at least two images to merge.',
    });
    return;
  }

  const filesToProcess = prefs.reverseOrder === 'oldest' ? [...files].reverse() : files;
  toast = await showToast({
    style: Toast.Style.Animated,
    title: `Running ${prefs.shortcutName}...`,
    message: `Processing ${filesToProcess.length} images`,
  });

  const result = await runShortcut(prefs.shortcutName, filesToProcess, timeoutMs);
  await toast.hide();

  if (result.success) {
    await showToast({ style: Toast.Style.Success, title: 'Success', message: result.message });
    await Clipboard.clear();
    await Clipboard.copy({ text: '' }, { concealed: true });
  } else if (result.message === 'Cancelled') {
    await Clipboard.clear();
    await Clipboard.copy({ text: '' }, { concealed: true });
  } else {
    await showToast({ style: Toast.Style.Failure, title: 'Failed', message: result.message });
  }
}

interface ShortcutError extends Error {
  stderr?: string | Buffer;
  status?: number | null;
  signal?: NodeJS.Signals | null;
  output?: (Buffer | string)[] | null;
  pid?: number;
  stdout?: string | Buffer;
}
