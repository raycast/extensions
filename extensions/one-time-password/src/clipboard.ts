import { Clipboard, getPreferenceValues } from '@raycast/api';
import { spawn } from 'child_process';

type Preferences = { clearClipboardAfter?: string };

const MAC_CLEAR = 'sleep "$OTP_DELAY"; [ "$(/usr/bin/pbpaste)" = "$OTP_VALUE" ] && /usr/bin/pbcopy < /dev/null';
const WINDOWS_CLEAR =
  'Start-Sleep -Seconds $env:OTP_DELAY; if ((Get-Clipboard -Raw) -ceq $env:OTP_VALUE) { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::Clear() }';

export function clearDelaySeconds(): number {
  const seconds = Number(getPreferenceValues<Preferences>().clearClipboardAfter);
  return Number.isInteger(seconds) && seconds > 0 ? seconds : 0;
}

// Raycast unloads the extension once its window closes, so a detached process does the delayed clear.
// The clipboard is only cleared if it still holds the same value; the value travels in the environment, not argv.
function scheduleClear(value: string): void {
  const seconds = clearDelaySeconds();
  if (!seconds) return;
  const env = { ...process.env, OTP_DELAY: String(seconds), OTP_VALUE: value };
  try {
    const child =
      process.platform === 'win32'
        ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-Command', WINDOWS_CLEAR], {
            env,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
          })
        : spawn('/bin/sh', ['-c', MAC_CLEAR], { env, detached: true, stdio: 'ignore' });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    /* Clearing is best-effort; the copy itself already succeeded. */
  }
}

export async function copySecret(value: string): Promise<void> {
  await Clipboard.copy(value, { concealed: true });
  scheduleClear(value);
}

export async function pasteSecret(value: string): Promise<void> {
  await Clipboard.paste(value);
  scheduleClear(value);
}
