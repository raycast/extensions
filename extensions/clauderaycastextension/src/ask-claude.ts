import { Clipboard, LaunchProps, Toast, closeMainWindow, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const EXEC_TIMEOUT_MS = 60_000;

// Claude's `/new` deep link pre-fills the composer from `?q=`, but the in-app
// handler truncates it. Prompts longer than this are pasted from the clipboard
// instead so nothing is lost.
const Q_MAX_CHARS = 1000;

type Props = LaunchProps<{ arguments: Arguments.AskClaude }>;

export default async function Command(props: Props) {
  const prefs = getPreferenceValues<Preferences>();
  // Filled by the inline argument (Tab on the command) or by fallback text
  // (Tab on a typed query when this is the first fallback command).
  const prompt = (props.arguments?.prompt ?? props.fallbackText ?? "").trim();

  if (!prompt) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to send",
      message: "Type your prompt first, then press Tab.",
    });
    return;
  }

  const submitDelayMs = parseDelay(prefs.submitDelay, 1500);
  const isLong = prompt.length > Q_MAX_CHARS;

  // The deep link does the heavy lifting: `/new` is Claude's CHAT route (the
  // router classifies /, /new, /chat, /chats as "chat" — never Cowork or Code),
  // and `?q=` pre-fills the composer. Because the text rides in the URL, it also
  // survives a cold start, where keystroke-based pasting used to fire too early.
  // Long prompts skip `q` (which would be truncated) and are pasted instead.
  const deepLink = isLong ? "claude://claude.ai/new" : `claude://claude.ai/new?q=${encodeURIComponent(prompt)}`;

  let previousClipboard: string | undefined;
  if (prefs.preserveClipboard) {
    try {
      previousClipboard = await Clipboard.readText();
    } catch {
      // nothing usable on the clipboard; skip restoring later
    }
  }

  try {
    // Always stage the prompt on the clipboard: required for the long-prompt
    // paste path, and a handy manual Cmd/Ctrl+V fallback otherwise.
    await Clipboard.copy(prompt);
    await closeMainWindow({ clearRootSearch: true });

    if (process.platform === "darwin") {
      await sendOnMac(prefs, deepLink, isLong, submitDelayMs);
    } else if (process.platform === "win32") {
      await sendOnWindows(prefs, deepLink, isLong, submitDelayMs);
    } else {
      throw new Error("Only macOS and Windows are supported.");
    }

    await showHUD(prefs.autoSubmit ? "Sent to Claude" : "Opened in Claude — press Enter to send");
  } catch (error) {
    await showHUD(`Could not reach Claude: ${errorMessage(error)}`);
  } finally {
    // By the time the scripts return, any paste has happened, so it is safe to
    // restore the user's previous clipboard text.
    if (prefs.preserveClipboard && previousClipboard !== undefined) {
      try {
        await Clipboard.copy(previousClipboard);
      } catch {
        // best effort
      }
    }
  }
}

async function sendOnMac(prefs: Preferences, deepLink: string, isLong: boolean, submitDelayMs: number) {
  const app = (prefs.macAppName?.trim() || "Claude").replace(/["\\]/g, "");
  const settle = (Math.max(submitDelayMs, 200) / 1000).toFixed(2);

  // `open <url>` launches Claude if needed, brings it forward, and routes the
  // deep link to a new chat.
  const script: string[] = [
    `do shell script "open " & quoted form of "${deepLink}"`,
    `tell application "${app}" to activate`,
    `tell application "System Events"`,
    `repeat 150 times`,
    `if exists process "${app}" then exit repeat`,
    `delay 0.1`,
    `end repeat`,
    `tell process "${app}" to set frontmost to true`,
    `delay ${settle}`,
  ];
  if (isLong) {
    // Empty composer (no q): paste the full prompt from the clipboard.
    script.push(`keystroke "v" using {command down}`, `delay 0.4`);
  }
  if (prefs.autoSubmit) {
    // Press Return a few times across the load window; once the prefilled text
    // is submitted, later Returns hit an empty composer and do nothing.
    script.push(`key code 36`, `delay 1.3`, `key code 36`, `delay 1.3`, `key code 36`);
  }
  script.push(`end tell`);

  const args = script.map((line) => `-e ${posixQuote(line)}`).join(" ");
  await execAsync(`osascript ${args}`, { timeout: EXEC_TIMEOUT_MS });
}

async function sendOnWindows(prefs: Preferences, deepLink: string, isLong: boolean, submitDelayMs: number) {
  const settleMs = Math.max(submitDelayMs, 200);

  const lines: string[] = [
    `$ErrorActionPreference = 'SilentlyContinue'`,
    // Win32 helpers: restore a minimized window and steal foreground reliably so
    // the Enter keystroke lands in Claude (AppActivate alone is not enough).
    `Add-Type @'`,
    `using System;`,
    `using System.Runtime.InteropServices;`,
    `public class ClaudeWin {`,
    `  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);`,
    `  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);`,
    `  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);`,
    `  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);`,
    `  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();`,
    `  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr p);`,
    `  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);`,
    `  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();`,
    `}`,
    `'@`,
    `function Get-ClaudeWin { Get-Process -Name 'claude' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1 }`,
    // The claude:// protocol is registered by every Claude installer (Store and
    // legacy), so this launches the app if closed, focuses it if open, and routes
    // the deep link to a new chat — no exe path or AppUserModelID needed.
    `Start-Process '${psQuote(deepLink)}'`,
    // Wait for the window (a cold start of the Store app can take a few seconds).
    `$proc = $null`,
    `$deadline = (Get-Date).AddSeconds(25)`,
    `while ((Get-Date) -lt $deadline) { $proc = Get-ClaudeWin; if ($proc) { break }; Start-Sleep -Milliseconds 200 }`,
    `if (-not $proc) { exit 2 }`,
    `$h = $proc.MainWindowHandle`,
    `$shell = New-Object -ComObject WScript.Shell`,
    // Restore + foreground, then VERIFY Claude is frontmost before sending keys,
    // retrying past the Windows foreground lock.
    `$focused = $false`,
    `for ($i = 0; $i -lt 8 -and -not $focused; $i++) {`,
    `  $fg = [ClaudeWin]::GetForegroundWindow()`,
    `  $ft = [ClaudeWin]::GetWindowThreadProcessId($fg, [IntPtr]::Zero)`,
    `  $ct = [ClaudeWin]::GetCurrentThreadId()`,
    `  [void][ClaudeWin]::AttachThreadInput($ct, $ft, $true)`,
    `  if ([ClaudeWin]::IsIconic($h)) { [void][ClaudeWin]::ShowWindow($h, 9) } else { [void][ClaudeWin]::ShowWindow($h, 5) }`,
    `  [void][ClaudeWin]::BringWindowToTop($h)`,
    `  [void][ClaudeWin]::SetForegroundWindow($h)`,
    `  [void][ClaudeWin]::AttachThreadInput($ct, $ft, $false)`,
    `  [void]$shell.AppActivate($proc.Id)`,
    `  Start-Sleep -Milliseconds 200`,
    `  if ([ClaudeWin]::GetForegroundWindow() -eq $h) { $focused = $true }`,
    `}`,
    `if (-not $focused) { exit 3 }`,
    `Start-Sleep -Milliseconds ${settleMs}`,
  ];
  if (isLong) {
    // Empty composer (no q): paste the full prompt from the clipboard.
    lines.push(`[void]$shell.SendKeys('^v')`, `Start-Sleep -Milliseconds 400`);
  }
  if (prefs.autoSubmit) {
    // Press Enter a few times across the load window; once the prefilled text is
    // submitted, later Enters hit an empty composer and are harmless no-ops.
    lines.push(
      `[void]$shell.SendKeys('{ENTER}')`,
      `Start-Sleep -Milliseconds 1300`,
      `[void]$shell.SendKeys('{ENTER}')`,
      `Start-Sleep -Milliseconds 1300`,
      `[void]$shell.SendKeys('{ENTER}')`,
    );
  }

  // -EncodedCommand sidesteps cmd.exe quoting entirely.
  const encoded = Buffer.from(lines.join("\r\n"), "utf16le").toString("base64");
  try {
    await execAsync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${encoded}`,
      { timeout: EXEC_TIMEOUT_MS, windowsHide: true },
    );
  } catch (error) {
    const code = (error as { code?: number | string })?.code;
    if (code === 2) {
      throw new Error("Claude Desktop didn't open a window in time. Raise the submit delay and try again.");
    }
    if (code === 3) {
      throw new Error("Couldn't bring Claude to the foreground (is the screen locked?). Try again.");
    }
    throw error;
  }
}

function parseDelay(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 15_000);
}

function errorMessage(error: unknown): string {
  const stderr = (error as { stderr?: string })?.stderr ?? "";
  if (process.platform === "darwin" && /assistive|not authorized|1002/i.test(stderr)) {
    return "grant Raycast Accessibility access in System Settings → Privacy & Security → Accessibility.";
  }
  return error instanceof Error ? error.message : String(error);
}

function posixQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function psQuote(value: string): string {
  return value.replaceAll("'", "''");
}
