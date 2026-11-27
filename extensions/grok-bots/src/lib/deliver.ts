import {
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  open,
  PopToRootType,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { runAppleScript } from "@raycast/utils";
import type { Bot } from "./roster";
import { postWebhook, type Webhook } from "./webhooks";

/** Grok Bot ignores deep-link text longer than this. */
export const PROMPT_LIMIT = 1000;

const GROK_BOT_BUNDLE_ID = "com.anysphere.sand";

export function promptLink(botId: string, text: string): string {
  return `grokbot://app/v1/prompt?id=${encodeURIComponent(botId)}&text=${encodeURIComponent(text)}`;
}

export function chatLink(botId: string): string {
  return `grokbot://app/v1/agent?id=${encodeURIComponent(botId)}`;
}

/** Raycast Quicklink that asks for a prompt and opens it in this Bot. */
export function quicklinkFor(bot: Bot): string {
  return `grokbot://app/v1/prompt?id=${encodeURIComponent(bot.id)}&text={argument name="Prompt"}`;
}

export interface DeliverOptions {
  webhook?: Webhook;
  sendOnModEnter: boolean;
  /** Force opening Grok Bot even when a webhook is set. */
  viaApp?: boolean;
}

const done = (message: string) => showHUD(message, { popToRootType: PopToRootType.Immediate, clearRootSearch: true });

/**
 * Sends `prompt` to `bot`: through its routine webhook when one is set,
 * otherwise by opening Grok Bot with the prompt in the message box.
 * Returns false when nothing was delivered, so the caller can keep the window open.
 */
export async function deliver(bot: Bot, prompt: string, options: DeliverOptions): Promise<boolean> {
  const { autoSend, useWebhooks } = getPreferenceValues<Preferences.ChatWithBot>();
  const text = prompt.trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Write a prompt first" });
    return false;
  }

  if (options.webhook && useWebhooks && !options.viaApp) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Sending to ${bot.firstName}…` });
    try {
      await postWebhook(options.webhook, text);
      await done(`Sent to ${bot.firstName}. The reply will show in Grok Bot.`);
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Webhook didn't start a run";
      toast.message = error instanceof Error ? error.message : String(error);
      toast.primaryAction = {
        title: "Open in Grok Bot Instead",
        onAction: () => void deliver(bot, text, { ...options, viaApp: true }),
      };
      return false;
    }
  }

  if (text.length > PROMPT_LIMIT) {
    await Clipboard.copy(text);
    await open(chatLink(bot.id));
    await done(`Prompt is over ${PROMPT_LIMIT.toLocaleString()} characters. Copied it, so paste it into the chat.`);
    return true;
  }

  if (!autoSend) {
    await open(promptLink(bot.id, text));
    await done(`Opened ${bot.firstName} in Grok Bot`);
    return true;
  }

  // Close Raycast first: closing it later hands focus back to the previous app,
  // which would pull Grok Bot out of the front before the send keystroke.
  // On Windows, popping to root right away ends the command before it can press Enter,
  // so the view is suspended and popped once the prompt has been handled.
  const isWindows = process.platform === "win32";
  await closeMainWindow({
    clearRootSearch: true,
    popToRootType: isWindows ? PopToRootType.Suspended : PopToRootType.Immediate,
  });
  await open(promptLink(bot.id, text));
  try {
    const trace = await pressSend(text, options.sendOnModEnter);
    await writeLog(`sent to ${bot.id}: ${trace}`);
    await showHUD(`Sent to ${bot.firstName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeLog(`FAILED for ${bot.id}: ${message}`);
    if (message.includes(DRAFT_MISMATCH)) {
      await showHUD(`${bot.firstName}'s message box holds different text, so nothing was sent. Check it in Grok Bot.`);
    } else if (message.includes(UNVERIFIED)) {
      await showHUD("Prompt is in Grok Bot, but auto-send couldn't confirm it, so press Return there to send it.");
    } else if (/-1743|Not authorized to send Apple events/i.test(message)) {
      await showHUD(
        "Prompt is in Grok Bot. To auto-send, allow Raycast → System Events in Privacy & Security → Automation.",
      );
    } else if (/not allowed|assistive|\(1002\)|-25211/i.test(message)) {
      await showHUD("Prompt is in Grok Bot. To auto-send, allow Raycast in Privacy & Security → Accessibility.");
    } else {
      await showHUD("Prompt is in Grok Bot, but auto-send didn't press Return. Details are in auto-send.log.");
    }
  }
  if (isWindows) await popToRoot({ clearSearchBar: true });
  return true;
}

const DRAFT_MISMATCH = "grok-bots:draft-mismatch";
const UNVERIFIED = "grok-bots:unverified";

/** Appends a line to auto-send.log in the extension's support folder, keeping the last 200 lines. */
async function writeLog(line: string): Promise<void> {
  try {
    const file = path.join(environment.supportPath, "auto-send.log");
    const previous = await fs.readFile(file, "utf8").catch(() => "");
    const lines = [...previous.split("\n").filter(Boolean), `${new Date().toISOString()} ${line.replace(/\s+/g, " ")}`];
    await fs.mkdir(environment.supportPath, { recursive: true });
    await fs.writeFile(file, `${lines.slice(-200).join("\n")}\n`);
  } catch (error) {
    console.error(error);
  }
}

/**
 * The prompt with all whitespace removed. Grok Bot's message box may lay out spaces and line
 * breaks differently, so both sides are compared without them; every other character must match.
 */
function withoutWhitespace(text: string): string {
  return text.replace(/[\s\u200b]/g, "");
}

/**
 * Presses Grok Bot's send shortcut once the prompt is really in the message box.
 *
 * Opening a prompt link fills the box after a short delay, and not at all when the Bot
 * already has an unsent draft (Grok Bot keeps the draft). So this brings Grok Bot to the
 * front and reads the focused text box through Accessibility until it holds exactly the
 * prompt, and only then presses Return. If the box holds anything else, or can't be read,
 * it presses nothing, so an old draft is never sent by mistake.
 * Returns a short trace for auto-send.log. The trace never includes the box's text.
 */
async function pressSend(text: string, withCommand: boolean): Promise<string> {
  return process.platform === "win32"
    ? pressSendWindows(withoutWhitespace(text), withCommand)
    : pressSendMacOS(text, withCommand);
}

const execFileAsync = promisify(execFile);

/**
 * Windows version of the AppleScript below, using UI Automation from PowerShell.
 * The expected text goes in through an environment variable, so it never has to be escaped.
 * Errors are written as one plain line to stderr; the trace goes to stdout.
 */
const WINDOWS_PRESS_SEND_SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Fail($message) { [Console]::Error.WriteLine($message); exit 1 }
try {
  Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class GrokBotsWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  // Windows only lets a background process take the foreground right after an input event, so send
  // one first. F24 is used because practically no app binds it (Alt would open menus).
  public static void Activate(IntPtr hWnd) {
    keybd_event(0x87, 0, 0, UIntPtr.Zero);
    keybd_event(0x87, 0, 2, UIntPtr.Zero);
    SetForegroundWindow(hWnd);
  }
}
"@
} catch { Fail $_.Exception.Message }

$expected = $env:GROK_BOTS_EXPECTED
$withCommand = $env:GROK_BOTS_MOD_ENTER -eq '1'
$trace = ''

$grok = $null
for ($i = 0; $i -lt 100; $i++) {
  $grok = @(Get-Process -Name 'Grok Bot' -ErrorAction SilentlyContinue)
  if ($grok | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }) { break }
  Start-Sleep -Milliseconds 100
}
$window = $grok | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
if (-not $window) { Fail "Grok Bot didn't open" }
$grokIds = @($grok | ForEach-Object { [uint32]$_.Id })

function Test-Front {
  $foregroundId = [uint32]0
  [GrokBotsWindow]::GetWindowThreadProcessId([GrokBotsWindow]::GetForegroundWindow(), [ref]$foregroundId) | Out-Null
  return $grokIds -contains $foregroundId
}

# Make sure Grok Bot, not the app you were in, has the keyboard.
$waited = 0
for (; $waited -lt 50; $waited++) {
  if (Test-Front) { break }
  if ($waited % 5 -eq 0) {
    $hwnd = $window.MainWindowHandle
    if ([GrokBotsWindow]::IsIconic($hwnd)) { [GrokBotsWindow]::ShowWindow($hwnd, 9) | Out-Null }
    [GrokBotsWindow]::Activate($hwnd)
  }
  Start-Sleep -Milliseconds 100
}
$trace += "front after $($waited / 10)s; "
if (-not (Test-Front)) { Fail "Grok Bot didn't come to the front | $trace" }

$isReady = $false
$wasReadable = $false
$boxLength = 0
for ($attempt = 1; $attempt -le 60; $attempt++) {
  try {
    $element = [System.Windows.Automation.AutomationElement]::FocusedElement
    if ($element -and ($grokIds -contains [uint32]$element.Current.ProcessId)) {
      $boxText = $null
      $pattern = $null
      if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) {
        $boxText = $pattern.Current.Value
      } elseif ($element.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern, [ref]$pattern)) {
        $boxText = $pattern.DocumentRange.GetText(-1)
      }
      if ($null -ne $boxText) {
        $wasReadable = $true
        $squeezed = [regex]::Replace($boxText, '[\\s\\u200b]', '')
        $boxLength = $squeezed.Length
        if ([string]::Equals($squeezed, $expected, [StringComparison]::Ordinal)) { $isReady = $true; break }
      }
    }
  } catch {}
  Start-Sleep -Milliseconds 100
}
# Lengths only: the box may hold an unrelated private draft, which must not reach the log.
$trace += "box readable=$wasReadable matched=$isReady after $($attempt / 10)s (box $boxLength chars, prompt $($expected.Length)); "

if (-not $isReady) {
  if (-not $wasReadable) { Fail "${UNVERIFIED} | $trace" }
  if ($boxLength -gt 0) { Fail "${DRAFT_MISMATCH} | $trace" }
  Fail "${UNVERIFIED} | $trace"
}
Start-Sleep -Milliseconds 150
if (-not (Test-Front)) { Fail "Grok Bot lost focus before sending | $trace" }
if ($withCommand) { [System.Windows.Forms.SendKeys]::SendWait('^{ENTER}') } else { [System.Windows.Forms.SendKeys]::SendWait('{ENTER}') }
Write-Output "$trace pressed $(if ($withCommand) { 'ctrl-enter' } else { 'enter' })"
`;

async function pressSendWindows(expected: string, withModifier: boolean): Promise<string> {
  const encodedScript = Buffer.from(WINDOWS_PRESS_SEND_SCRIPT, "utf16le").toString("base64");
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript],
      {
        env: { ...process.env, GROK_BOTS_EXPECTED: expected, GROK_BOTS_MOD_ENTER: withModifier ? "1" : "0" },
        windowsHide: true,
        timeout: 25000,
      },
    );
    return stdout.trim();
  } catch (error) {
    // The default message repeats the whole encoded command line; use the script's own error instead.
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr).trim().split(/\r?\n/)[0] : "";
    throw new Error(stderr || "PowerShell couldn't press Enter in Grok Bot");
  }
}

async function pressSendMacOS(text: string, withCommand: boolean): Promise<string> {
  return runAppleScript(
    `
on squeeze(t)
  set saved to AppleScript's text item delimiters
  repeat with ch in {space, tab, linefeed, return, character id 160, character id 8203}
    set AppleScript's text item delimiters to (contents of ch)
    set parts to text items of t
    set AppleScript's text item delimiters to ""
    set t to parts as text
  end repeat
  set AppleScript's text item delimiters to saved
  return t
end squeeze

on run argv
  set expected to item 1 of argv
  set trace to ""
  tell application "System Events"
    set grokProcess to missing value
    repeat 100 times
      set matches to (every process whose bundle identifier is "${GROK_BOT_BUNDLE_ID}")
      if (count of matches) > 0 then
        set grokProcess to item 1 of matches
        exit repeat
      end if
      delay 0.1
    end repeat
    if grokProcess is missing value then error "Grok Bot didn't open"
  end tell

  -- Make sure Grok Bot, not the app you were in, has the keyboard.
  set waited to 0
  repeat 50 times
    tell application "System Events" to set isFront to frontmost of grokProcess
    if isFront then exit repeat
    if waited mod 5 = 0 then
      try
        tell application id "${GROK_BOT_BUNDLE_ID}" to activate
      end try
    end if
    set waited to waited + 1
    delay 0.1
  end repeat
  set trace to trace & "front after " & (waited / 10) & "s; "
  tell application "System Events"
    if not (frontmost of grokProcess) then error "Grok Bot didn't come to the front | " & trace

    -- Electron apps only build their accessibility tree when asked.
    try
      set value of attribute "AXManualAccessibility" of grokProcess to true
    end try

    set isReady to false
    set wasReadable to false
    set boxLength to 0
    repeat with attempt from 1 to 60
      try
        set focusedElement to value of attribute "AXFocusedUIElement" of grokProcess
        set boxText to value of attribute "AXValue" of focusedElement
        if boxText is not missing value then
          set wasReadable to true
          set squeezed to my squeeze(boxText as text)
          set boxLength to length of squeezed
          considering case
            if squeezed is expected then set isReady to true
          end considering
          if isReady then exit repeat
        end if
      end try
      delay 0.1
    end repeat
    -- Lengths only: the box may hold an unrelated private draft, which must not reach the log.
    set trace to trace & "box readable=" & wasReadable & " matched=" & isReady & " after " & (attempt / 10) & "s (box " & boxLength & " chars, prompt " & (length of expected) & "); "

    if not isReady then
      if not wasReadable then error "${UNVERIFIED} | " & trace
      if boxLength > 0 then error "${DRAFT_MISMATCH} | " & trace
      error "${UNVERIFIED} | " & trace
    end if
    delay 0.15

    if not (frontmost of grokProcess) then error "Grok Bot lost focus before sending | " & trace
    ${withCommand ? "keystroke return using command down" : "key code 36"}
  end tell
  return trace & "pressed " & "${withCommand ? "cmd-return" : "return"}"
end run
`,
    [withoutWhitespace(text)],
    { timeout: 25000 },
  );
}
