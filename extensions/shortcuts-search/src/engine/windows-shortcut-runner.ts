import { runPowerShellScript } from "@raycast/utils";
import type { AtomicShortcut } from "../model/internal/internal-models";
import { Modifiers } from "../model/internal/modifiers";
import { parseDelay, validateTarget, type WindowsExecutionTarget } from "./execution-target";
import { decodePowerShellJson, windowsNativeScript, powerShellProgram } from "./windows-native";

const modifiers = new Map<Modifiers, number>([
  [Modifiers.control, 0x11],
  [Modifiers.option, 0x12],
  [Modifiers.shift, 0x10],
  [Modifiers.win, 0x5b],
]);
const specialKeys: Record<string, number> = {
  ctrl: 0x11,
  shift: 0x10,
  alt: 0x12,
  opt: 0x12,
  win: 0x5b,
  enter: 0x0d,
  tab: 0x09,
  escape: 0x1b,
  esc: 0x1b,
  backspace: 0x08,
  delete: 0x2e,
  del: 0x2e,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  pgup: 0x21,
  pgdn: 0x22,
  left: 0x25,
  right: 0x27,
  up: 0x26,
  down: 0x28,
  space: 0x20,
  insert: 0x2d,
  pause: 0x13,
  scrolllock: 0x91,
  numlock: 0x90,
  capslock: 0x14,
  printscreen: 0x2c,
  break: 0x13,
};
for (let index = 1; index <= 24; index++) specialKeys[`f${index}`] = 0x6f + index;
export function validateWindowsSequence(sequence: AtomicShortcut[]) {
  if (!sequence.length || sequence.length > 32) throw new Error("Shortcut has no executable key sequence");
  return sequence.map(({ base, modifiers: chordModifiers }) => {
    base = base === "plus" ? "+" : base === "hyphen" ? "-" : base;
    // Letter/digit shortcut tokens name virtual keys, not characters to type.
    // Mapping French "1" as text would silently add Shift to Ctrl+1.
    const code = /^[a-z0-9]$/i.test(base)
      ? base.toUpperCase().charCodeAt(0)
      : Object.prototype.hasOwnProperty.call(specialKeys, base.toLowerCase())
        ? specialKeys[base.toLowerCase()]
        : undefined;
    const character = code === undefined && base.length === 1 && /^[\x21-\x7e]$/.test(base) ? base : undefined;
    if ((!code && !character) || chordModifiers.some((modifier) => !modifiers.has(modifier)))
      throw new Error("Shortcut contains an unsupported key or modifier");
    return {
      code: code ?? 0,
      character: character ?? "",
      modifiers: [...new Set(chordModifiers.map((modifier) => modifiers.get(modifier)!))],
    };
  });
}

export function buildPowerShellScript(
  target: WindowsExecutionTarget,
  delayMilliseconds: number,
  sequence: AtomicShortcut[]
): string {
  validateTarget(target);
  const delaySeconds = parseDelay(delayMilliseconds / 1000);
  const chords = validateWindowsSequence(sequence);
  return powerShellProgram(`${windowsNativeScript}
${decodePowerShellJson("target", target)}
${decodePowerShellJson("chords", chords)}
if ($target.windowHandle) { $handle = [IntPtr]([long]$target.windowHandle) }
else { $handle = Get-HotkysWindow $target.windowsProcessName }
$owner = [uint32]0
[void][HotkysWindows]::GetWindowThreadProcessId($handle, [ref]$owner)
if ($target.processId -and $owner -ne $target.processId) { throw 'Application window changed; no keys were sent' }
[HotkysWindows]::CheckWindow($handle, $owner, $target.windowsProcessName, $false)
# Resolve the entire sequence on the target keyboard layout before sending any input.
$resolved = @()
foreach ($chord in $chords) {
  $resolved += ,([HotkysWindows]::ResolveKeys($handle, $chord.code, $chord.character, [int[]]@($chord.modifiers)))
}
if ([HotkysWindows]::IsIconic($handle)) { [void][HotkysWindows]::ShowWindow($handle, 9) }
[void][HotkysWindows]::SetForegroundWindow($handle)
$deadline = [DateTime]::UtcNow.AddSeconds(5)
while ([HotkysWindows]::GetForegroundWindow() -ne $handle) {
  if ([DateTime]::UtcNow -gt $deadline) { throw 'Application did not become ready; no keys were sent' }
  Start-Sleep -Milliseconds 50
}
Start-Sleep -Milliseconds ${Math.round(delaySeconds * 1000)}
foreach ($keys in $resolved) {
  [HotkysWindows]::CheckWindow($handle, $owner, $target.windowsProcessName, $true)
  if ($target.kind -eq 'browser') {
    $page = Get-HotkysBrowserUrl $handle $true
    if ($page.addressValue -cne $target.addressValue -or $page.url -cne $target.documentUrl) { throw 'Web page changed; remaining keys were cancelled' }
  }
  [HotkysWindows]::SendChord($handle, $owner, $target.windowsProcessName, [System.UInt16[]]$keys)
}
`);
}

export async function runWindowsShortcuts(
  target: WindowsExecutionTarget,
  delaySeconds: number,
  sequence: AtomicShortcut[]
): Promise<void> {
  const script = buildPowerShellScript(target, parseDelay(delaySeconds) * 1000, sequence);
  try {
    await runPowerShellScript(script, { timeout: 20000 });
  } catch {
    throw new Error(
      "Shortcut execution stopped. Check the target window, held modifiers, and application elevation. Earlier chords may have run; retry manually."
    );
  }
}
