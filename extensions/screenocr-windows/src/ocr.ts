import {
  Clipboard,
  Toast,
  closeMainWindow,
  environment,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CaptureMode = "area" | "fullscreen" | "clipboard";

// Preferences type comes from the auto-generated raycast-env.d.ts (created by
// `ray build` / `ray develop`), so it always matches package.json.

// Strict allow-list validation of the language tag before it is passed to
// PowerShell. BCP-47 shape only; anything else falls back to "auto".
const LANGUAGE_TAG = /^(auto|[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3})$/;

// Absolute path to Windows PowerShell — never resolved via PATH, so the
// binary cannot be shadowed by a malicious executable earlier in PATH.
function powershellPath(): string {
  const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
  return path.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

interface PsError extends Error {
  code?: number;
  stderr?: string;
}

export async function runRecognition(mode: CaptureMode): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const language = LANGUAGE_TAG.test(prefs.language) ? prefs.language : "auto";

  const scriptPath = path.join(environment.assetsPath, "ocr.ps1");
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-NoLogo",
    "-STA",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-Mode",
    mode,
    "-Language",
    language,
  ];
  if (prefs.ignoreLineBreaks) {
    args.push("-IgnoreLineBreaks");
  }

  // Hide Raycast so the selection overlay captures the screen underneath it.
  await closeMainWindow();

  let stdout: string;
  try {
    // execFile with an argument array: no shell is involved, so no injection
    // surface. windowsHide keeps the PowerShell console window invisible.
    const result = await execFileAsync(powershellPath(), args, {
      // Generous timeout: the user may keep the selection overlay open a while.
      timeout: 300_000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      encoding: "utf8",
    });
    stdout = result.stdout;
  } catch (rawError) {
    const error = rawError as PsError;
    switch (error.code) {
      case 2:
        // User cancelled the selection — stay silent, like the native snip.
        return;
      case 3:
        await showFailure(
          "No OCR language available",
          "Install the language pack for your selected language (Settings → Time & Language → Language & Region), or set Recognition Language to Auto.",
        );
        return;
      case 4:
        await showFailure(
          "No image in clipboard",
          "Copy an image first, then run this command again.",
        );
        return;
      default:
        await showFailure(
          "Text recognition failed",
          firstLine(error.stderr) ?? error.message,
        );
        return;
    }
  }

  const text = stdout.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  if (text.trim().length === 0) {
    if (prefs.showHud !== false) {
      await showHUD("❌ No text detected");
    }
    return;
  }

  if (prefs.resultAction === "copy" || prefs.resultAction === "both") {
    await Clipboard.copy(text);
  }
  if (prefs.resultAction === "paste" || prefs.resultAction === "both") {
    await Clipboard.paste(text);
  }

  if (prefs.showHud !== false) {
    const verb = prefs.resultAction === "paste" ? "Pasted" : "Copied";
    await showHUD(`✅ ${verb} ${text.length} characters`);
  }
}

function firstLine(value: string | undefined): string | undefined {
  const line = value?.split(/\r?\n/).find((l) => l.trim().length > 0);
  return line?.slice(0, 200);
}

async function showFailure(title: string, message?: string): Promise<void> {
  await showToast({ style: Toast.Style.Failure, title, message });
}
