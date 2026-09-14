import { getPreferenceValues, environment } from '@raycast/api';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { captureScreenshot, CaptureMode } from './screenshot';

const execFileAsync = promisify(execFile);

export interface OcrResult {
  success: boolean;
  text?: string;
  message?: string;
}

let cachedOcrExePath: string | null = null;

export function getOcrExePath(): string | null {
  if (cachedOcrExePath && fs.existsSync(cachedOcrExePath)) {
    return cachedOcrExePath;
  }

  if (environment.assetsPath) {
    const assetExe = path.join(environment.assetsPath, 'bin', 'ocr.exe');
    if (fs.existsSync(assetExe)) {
      cachedOcrExePath = assetExe;
      return assetExe;
    }
  }

  const cwdExe = path.join(process.cwd(), 'assets', 'bin', 'ocr.exe');
  if (fs.existsSync(cwdExe)) {
    cachedOcrExePath = cwdExe;
    return cwdExe;
  }

  const candidate1 = path.join(__dirname, '..', 'assets', 'bin', 'ocr.exe');
  if (fs.existsSync(candidate1)) {
    cachedOcrExePath = candidate1;
    return candidate1;
  }

  const candidate2 = path.join(__dirname, '..', '..', 'assets', 'bin', 'ocr.exe');
  if (fs.existsSync(candidate2)) {
    cachedOcrExePath = candidate2;
    return candidate2;
  }

  const absoluteFallback = 'c:\\Coding\\MyProjects\\Raycast Screenshot Extention\\assets\\bin\\ocr.exe';
  if (fs.existsSync(absoluteFallback)) {
    cachedOcrExePath = absoluteFallback;
    return absoluteFallback;
  }

  return null;
}

export function getOcrScriptPath(): string | null {
  if (environment.assetsPath) {
    const assetScript = path.join(environment.assetsPath, 'scripts', 'ocr.ps1');
    if (fs.existsSync(assetScript)) {
      return assetScript;
    }
  }

  const cwdScript = path.join(process.cwd(), 'assets', 'scripts', 'ocr.ps1');
  if (fs.existsSync(cwdScript)) {
    return cwdScript;
  }

  const candidate1 = path.join(__dirname, '..', 'assets', 'scripts', 'ocr.ps1');
  if (fs.existsSync(candidate1)) {
    return candidate1;
  }

  const candidate2 = path.join(__dirname, '..', '..', 'assets', 'scripts', 'ocr.ps1');
  if (fs.existsSync(candidate2)) {
    return candidate2;
  }

  const absoluteFallback = 'c:\\Coding\\MyProjects\\Raycast Screenshot Extention\\assets\\scripts\\ocr.ps1';
  if (fs.existsSync(absoluteFallback)) {
    return absoluteFallback;
  }

  return null;
}

export async function processImageOcr(imagePath: string): Promise<OcrResult> {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return {
      success: false,
      message: `Image file not found at path: ${imagePath || '(empty)'}`,
    };
  }

  const ocrExePath = getOcrExePath();

  if (ocrExePath && fs.existsSync(ocrExePath)) {
    try {
      const { stdout } = await execFileAsync(ocrExePath, ['-ImagePath', imagePath], {
        windowsHide: true,
        timeout: 15000,
      });

      const output = stdout.trim();

      if (output.startsWith('SUCCESS|TEXT|')) {
        const text = output.substring('SUCCESS|TEXT|'.length).trim();
        return {
          success: true,
          text,
        };
      }

      if (output.startsWith('SUCCESS|NO_TEXT')) {
        return {
          success: true,
          text: '',
          message: 'No readable text found in image',
        };
      }

      if (output.startsWith('ERROR|')) {
        const errorMsg = output.substring('ERROR|'.length).trim();
        return {
          success: false,
          message: errorMsg || 'Failed to extract text from image',
        };
      }
    } catch {
      // Fall back to ocr.ps1 if native execution fails
    }
  }

  const scriptPath = getOcrScriptPath();
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    return {
      success: false,
      message: `OCR engine binary and script not found.`,
    };
  }

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-ImagePath', imagePath],
      { timeout: 30000 },
    );

    const output = stdout.trim();

    if (output.startsWith('SUCCESS|TEXT|')) {
      const text = output.substring('SUCCESS|TEXT|'.length).trim();
      return {
        success: true,
        text,
      };
    }

    if (output.startsWith('SUCCESS|NO_TEXT')) {
      return {
        success: true,
        text: '',
        message: 'No readable text found in image',
      };
    }

    if (output.startsWith('ERROR|')) {
      const errorMsg = output.substring('ERROR|'.length).trim();
      return {
        success: false,
        message: errorMsg || 'Failed to extract text from image',
      };
    }

    return {
      success: false,
      message: `Unexpected output from OCR process: ${output || '(empty stdout)'}`,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `PowerShell OCR execution error: ${err.message}`,
    };
  }
}

export async function captureAndExtractText(
  mode: CaptureMode = 'region',
): Promise<OcrResult & { cancelled?: boolean }> {
  const preferences = getPreferenceValues<{ output?: string }>();
  const outputMode = preferences.output || 'save-and-copy';
  const isCopyOnly = outputMode === 'copy';

  const captureRes = await captureScreenshot(mode, {
    forceSave: true,
    overrideSavePath: isCopyOnly ? os.tmpdir() : undefined,
  });

  if (captureRes.cancelled) {
    return { success: false, cancelled: true };
  }

  if (!captureRes.success || !captureRes.filePath) {
    return {
      success: false,
      message: captureRes.error || 'Failed to capture screenshot for OCR',
    };
  }

  const tempFilePath = captureRes.filePath;

  try {
    if (fs.existsSync(tempFilePath)) {
      const ocrRes = await processImageOcr(tempFilePath);
      return ocrRes;
    }

    return {
      success: false,
      message: `Captured image file not found on disk: ${tempFilePath}`,
    };
  } finally {
    if (isCopyOnly && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // Safe cleanup of temporary OCR file
      }
    }
  }
}
