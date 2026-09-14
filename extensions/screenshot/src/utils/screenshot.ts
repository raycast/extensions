import { getPreferenceValues, showToast, Toast, environment, open, closeMainWindow } from '@raycast/api';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface Preferences {
  output?: 'save-and-copy' | 'save' | 'copy';
  saveLocation?: string;
  showMagnifier?: boolean;
}

export type CaptureMode = 'screen' | 'region' | 'window';

let cachedExePath: string | null = null;
let cachedDllPath: string | null = null;

/**
 * Safely removes the old test folder C:\Users\musht\Pictures\Screenshots if it is empty and
 * the official Windows shell Screenshots folder (e.g. Screenshots 1) is present.
 */
export function restoreRaycastFocus(): void {
  const exePath = getExePath();
  if (exePath && fs.existsSync(exePath)) {
    execFile(exePath, ['-Mode', 'focusraycast'], { windowsHide: true }, () => {});
  }
}

export async function openNativeFilePicker(): Promise<string | null> {
  const exePath = getExePath();
  if (!exePath || !fs.existsSync(exePath)) return null;

  try {
    const { stdout } = await execFileAsync(exePath, ['-Mode', 'pickfile'], { windowsHide: false });
    const output = stdout.trim();

    if (output.startsWith('SELECTED|')) {
      return output.substring('SELECTED|'.length).trim();
    }
  } catch {
    // Return null on cancel/error
  }
  return null;
}

export function cleanupOldTestFolder(): void {
  const picturesDir = path.join(os.homedir(), 'Pictures');
  const oldTestFolder = path.join(picturesDir, 'Screenshots');
  const officialFolder = path.join(picturesDir, 'Screenshots 1');

  if (fs.existsSync(oldTestFolder) && fs.existsSync(officialFolder)) {
    try {
      const files = fs.readdirSync(oldTestFolder);
      const userFiles = files.filter((f) => f.toLowerCase() !== 'desktop.ini');
      if (userFiles.length === 0) {
        fs.rmdirSync(oldTestFolder, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors safely
    }
  }
}

let cachedSaveDir: string | null = null;
let lastRawLocation: string | undefined = undefined;

/**
 * Resolves custom save directory if specified with zero-latency in-memory caching.
 */
export function resolveSaveDirectory(rawLocation?: string): string {
  if (cachedSaveDir && rawLocation === lastRawLocation) {
    return cachedSaveDir;
  }
  lastRawLocation = rawLocation;

  let target = rawLocation ? rawLocation.trim() : '';

  if (target && target !== '~/Pictures/Screenshots' && target !== '%USERPROFILE%\\Pictures\\Screenshots') {
    if (target.startsWith('~')) {
      target = path.join(os.homedir(), target.slice(1));
    }
    target = target.replace(/%([^%]+)%/g, (_, envVar) => process.env[envVar] || '');
    cachedSaveDir = path.normalize(target);
    return cachedSaveDir;
  }

  const picturesDir = path.join(os.homedir(), 'Pictures');

  if (fs.existsSync(picturesDir)) {
    const candidate1 = path.join(picturesDir, 'Screenshots 1');
    const candidate2 = path.join(picturesDir, 'Screenshots');

    if (fs.existsSync(candidate1)) {
      cachedSaveDir = candidate1;
      return candidate1;
    }
    if (fs.existsSync(candidate2)) {
      cachedSaveDir = candidate2;
      return candidate2;
    }
  }

  cachedSaveDir = path.join(picturesDir, 'Screenshots');
  return cachedSaveDir;
}

/**
 * Locates and caches capture.exe executable for instant direct launch (<5ms).
 */
export function getExePath(): string | null {
  if (cachedExePath) {
    return cachedExePath;
  }

  if (environment.assetsPath) {
    const assetExe = path.join(environment.assetsPath, 'bin', 'capture.exe');
    if (fs.existsSync(assetExe)) {
      cachedExePath = assetExe;
      return assetExe;
    }
  }

  const cwdExe = path.join(process.cwd(), 'assets', 'bin', 'capture.exe');
  if (fs.existsSync(cwdExe)) {
    cachedExePath = cwdExe;
    return cwdExe;
  }

  const candidate1 = path.join(__dirname, '..', 'assets', 'bin', 'capture.exe');
  if (fs.existsSync(candidate1)) {
    cachedExePath = candidate1;
    return candidate1;
  }

  const candidate2 = path.join(__dirname, '..', '..', 'assets', 'bin', 'capture.exe');
  if (fs.existsSync(candidate2)) {
    cachedExePath = candidate2;
    return candidate2;
  }

  const absoluteFallback = 'c:\\Coding\\MyProjects\\Raycast Screenshot Extention\\assets\\bin\\capture.exe';
  if (fs.existsSync(absoluteFallback)) {
    cachedExePath = absoluteFallback;
    return absoluteFallback;
  }

  return null;
}

/**
 * Fallback DLL path if exe is not found.
 */
export function getDllPath(): string {
  if (cachedDllPath && fs.existsSync(cachedDllPath)) {
    return cachedDllPath;
  }

  if (environment.assetsPath) {
    const assetDll = path.join(environment.assetsPath, 'bin', 'CaptureEngine.dll');
    if (fs.existsSync(assetDll)) {
      cachedDllPath = assetDll;
      return assetDll;
    }
  }

  const cwdDll = path.join(process.cwd(), 'assets', 'bin', 'CaptureEngine.dll');
  if (fs.existsSync(cwdDll)) {
    cachedDllPath = cwdDll;
    return cwdDll;
  }

  const candidate1 = path.join(__dirname, '..', 'assets', 'bin', 'CaptureEngine.dll');
  if (fs.existsSync(candidate1)) {
    cachedDllPath = candidate1;
    return candidate1;
  }

  const candidate2 = path.join(__dirname, '..', '..', 'assets', 'bin', 'CaptureEngine.dll');
  if (fs.existsSync(candidate2)) {
    cachedDllPath = candidate2;
    return candidate2;
  }

  const absoluteFallback = 'c:\\Coding\\MyProjects\\Raycast Screenshot Extention\\assets\\bin\\CaptureEngine.dll';
  cachedDllPath = absoluteFallback;
  return absoluteFallback;
}

export interface CaptureOptions {
  overrideSavePath?: string;
  forceSave?: boolean;
}

export interface CaptureResult {
  success: boolean;
  filePath?: string;
  actionType?: 'SAVED_AND_COPIED' | 'SAVED' | 'COPIED';
  cancelled?: boolean;
  error?: string;
}

/**
 * High-level capture function returning result object with explicit error details.
 */
export async function captureScreenshot(mode: CaptureMode, options?: CaptureOptions): Promise<CaptureResult> {
  const preferences = getPreferenceValues<Preferences>();
  const outputMode = preferences.output || 'save-and-copy';

  const shouldSave = options?.forceSave || outputMode === 'save-and-copy' || outputMode === 'save';
  const shouldCopy = outputMode === 'save-and-copy' || outputMode === 'copy';

  const appArgs: string[] = ['-Mode', mode, '-DelayMs', '0'];

  if (shouldSave) {
    const rawSaveLocation = options?.overrideSavePath || preferences.saveLocation;
    const saveDir = resolveSaveDirectory(rawSaveLocation);
    if (!fs.existsSync(saveDir)) {
      try {
        fs.mkdirSync(saveDir, { recursive: true });
      } catch {
        // Ignore directory creation error, C# handles fallback
      }
    }
    appArgs.push('-SavePath', saveDir);
  }

  if (shouldCopy) {
    appArgs.push('-CopyToClipboard');
  }

  const isMagnifierEnabled = preferences.showMagnifier === true;
  appArgs.push('-ShowMagnifier', isMagnifierEnabled ? 'true' : 'false');

  const exePath = getExePath();

  if (exePath && fs.existsSync(exePath)) {
    try {
      const { stdout } = await execFileAsync(exePath, appArgs, { windowsHide: false });
      const output = stdout.trim();

      if (output === 'CANCELLED') {
        return { success: false, cancelled: true };
      }

      if (output.startsWith('SUCCESS|')) {
        const parts = output.split('|');
        const statusType = parts[1] as 'SAVED_AND_COPIED' | 'SAVED' | 'COPIED';
        const savedPath = parts[2];
        return { success: true, actionType: statusType, filePath: savedPath };
      }

      if (output.startsWith('ERROR|')) {
        const errorMsg = output.replace('ERROR|', '');
        return {
          success: false,
          error: `Capture Engine Error: ${errorMsg}\nExecutable: ${exePath}`,
        };
      }

      return {
        success: false,
        error: `Unexpected output from capture engine: ${output || '(empty)'}`,
      };
    } catch {
      // Direct executable blocked or failed, fall back to PowerShell script seamlessly
    }
  }

  const scriptCandidates = [
    environment.assetsPath ? path.join(environment.assetsPath, 'scripts', 'capture.ps1') : '',
    path.join(process.cwd(), 'assets', 'scripts', 'capture.ps1'),
    path.join(__dirname, '..', 'assets', 'scripts', 'capture.ps1'),
    path.join(__dirname, '..', '..', 'assets', 'scripts', 'capture.ps1'),
  ];

  const actualScriptPath = scriptCandidates.find((p) => p && fs.existsSync(p));

  if (!actualScriptPath) {
    return {
      success: false,
      error: `Could not locate capture script (capture.ps1) on disk.`,
    };
  }

  const psArgs = [
    '-NoProfile',
    '-NoLogo',
    '-STA',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    actualScriptPath,
    '-Mode',
    mode,
    '-DelayMs',
    '0',
    '-ShowMagnifier',
    isMagnifierEnabled ? 'true' : 'false',
  ];

  if (shouldSave) {
    const rawSaveLocation = options?.overrideSavePath || preferences.saveLocation;
    const saveDir = resolveSaveDirectory(rawSaveLocation);
    psArgs.push('-SavePath', saveDir);
  }

  if (shouldCopy) {
    psArgs.push('-CopyToClipboard');
  }

  try {
    const { stdout } = await execFileAsync('powershell.exe', psArgs, { windowsHide: false });
    const output = stdout.trim();

    if (output === 'CANCELLED') {
      return { success: false, cancelled: true };
    }

    if (output.startsWith('SUCCESS|')) {
      const parts = output.split('|');
      const statusType = parts[1] as 'SAVED_AND_COPIED' | 'SAVED' | 'COPIED';
      const savedPath = parts[2];
      return { success: true, actionType: statusType, filePath: savedPath };
    }

    return {
      success: false,
      error: output.startsWith('ERROR|') ? output.replace('ERROR|', '') : `Capture error: ${output || '(empty)'}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Execution failed: ${errorMsg}`,
    };
  }
}

/**
 * Executes the screenshot capture process with sub-20ms instant responsiveness.
 */
export async function executeCapture(mode: CaptureMode): Promise<void> {
  closeMainWindow({ clearRootSearch: true }).catch(() => {});

  const result = await captureScreenshot(mode);

  if (result.cancelled) {
    return;
  }

  if (result.success) {
    if (result.actionType === 'SAVED_AND_COPIED' && result.filePath) {
      const fileName = path.basename(result.filePath);
      await showToast({
        style: Toast.Style.Success,
        title: '✓ Screenshot saved and copied',
        message: fileName,
        primaryAction: {
          title: 'Open Screenshot',
          onAction: () => open(result.filePath!),
        },
      });
    } else if (result.actionType === 'SAVED' && result.filePath) {
      const fileName = path.basename(result.filePath);
      await showToast({
        style: Toast.Style.Success,
        title: '✓ Screenshot saved',
        message: fileName,
        primaryAction: {
          title: 'Open Screenshot',
          onAction: () => open(result.filePath!),
        },
      });
    } else if (result.actionType === 'COPIED') {
      await showToast({
        style: Toast.Style.Success,
        title: '✓ Screenshot copied to clipboard',
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: '✓ Screenshot captured',
      });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Screenshot capture failed',
      message: result.error || 'Unknown error occurred during capture',
    });
  }
}
