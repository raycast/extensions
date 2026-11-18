// Verify real SendInput delivery through the production script in a disposable desktop window.
jest.mock("@raycast/utils", () => ({ runPowerShellScript: jest.fn() }));
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPowerShellScript } from "./windows-shortcut-runner";
import { decodePowerShellJson, powerShellProgram } from "./windows-native";
import { Modifiers } from "../model/internal/modifiers";
import type { WindowsExecutionTarget } from "./execution-target";

const nativeTest = process.platform === "win32" ? it : it.skip;
interface FixtureState {
  processId: number;
  windowHandle: string;
  text: string;
  selectionLength: number;
  keys: string[];
  heldModifiers: boolean;
  keyboardLayout: number;
  digitOneModifiers: number;
}

nativeTest.each([
  { name: "US", id: "00000409" },
  { name: "French AZERTY", id: "0000040c" },
])(
  "delivers unshifted number accelerators, Ctrl+A, punctuation and multiple chords on $name",
  async ({ id: keyboardLayoutId }) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hotkys-input-"));
    const statePath = path.join(directory, "state.json");
    const fixture = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-Command", "-"], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let errors = "";
    fixture.stderr.on("data", (chunk) => {
      errors += chunk.toString();
    });
    const state = (): FixtureState | undefined => {
      try {
        return JSON.parse(fs.readFileSync(statePath, "utf8")) as FixtureState;
      } catch {
        return undefined;
      }
    };
    const waitFor = async (accept: (value: FixtureState) => boolean) => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const value = state();
        if (value && accept(value)) return value;
        if (fixture.exitCode !== null) throw new Error(`Desktop fixture exited: ${errors}`);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`Desktop fixture did not receive expected input. State: ${JSON.stringify(state())}. ${errors}`);
    };
    fixture.stdin.end(
      powerShellProgram(`${decodePowerShellJson("statePath", statePath)}
${decodePowerShellJson("layoutId", keyboardLayoutId)}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class HotkysInputProbe {
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr LoadKeyboardLayout(string id, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr GetKeyboardLayout(uint thread);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern short VkKeyScanEx(char key, IntPtr layout);
  public static int DigitOneModifiers() { return ((ushort)VkKeyScanEx('1', GetKeyboardLayout(0))) >> 8; }
  public static bool Held() {
    foreach (int key in new int[] { 16, 17, 18, 91, 92 }) if ((GetAsyncKeyState(key) & 0x8000) != 0) return true;
    return false;
  }
}
'@
$form = [System.Windows.Forms.Form]::new()
$form.Text = 'Hotkys disposable input fixture'
$form.KeyPreview = $true
$box = [System.Windows.Forms.TextBox]::new()
$box.Multiline = $true
$box.Dock = [System.Windows.Forms.DockStyle]::Fill
$box.Text = 'scratch document'
$form.Controls.Add($box)
$events = [Collections.Generic.List[string]]::new()
$form.Add_KeyDown({ param($sender, $event)
  $events.Add($event.Modifiers.ToString() + '+' + $event.KeyCode.ToString())
  if ($event.Control -and $event.KeyCode -in @([System.Windows.Forms.Keys]::K, [System.Windows.Forms.Keys]::S, [System.Windows.Forms.Keys]::D1, [System.Windows.Forms.Keys]::D9, [System.Windows.Forms.Keys]::D0)) { $event.SuppressKeyPress = $true }
})
$form.Add_Shown({
  $form.Activate()
  $box.Focus() | Out-Null
  # Windows 8+ activates a layout only when this process owns keyboard focus.
  [HotkysInputProbe]::LoadKeyboardLayout($layoutId, 1) | Out-Null
})
$timer = [System.Windows.Forms.Timer]::new()
$timer.Interval = 50
$timer.Add_Tick({
  $snapshot = @{ processId = $PID; windowHandle = $form.Handle.ToInt64().ToString(); text = $box.Text; selectionLength = $box.SelectionLength; keys = @($events.ToArray()); heldModifiers = [HotkysInputProbe]::Held(); keyboardLayout = [HotkysInputProbe]::GetKeyboardLayout(0).ToInt64() -band 65535; digitOneModifiers = [HotkysInputProbe]::DigitOneModifiers() } | ConvertTo-Json -Compress
  [IO.File]::WriteAllText($statePath, $snapshot)
})
$timer.Start()
try { [System.Windows.Forms.Application]::Run($form) }
finally { $timer.Stop(); $timer.Dispose(); $form.Dispose() }
`)
    );
    try {
      const ready = await waitFor((value) => value.text === "scratch document");
      expect(ready.keyboardLayout).toBe(parseInt(keyboardLayoutId.slice(-4), 16));
      // Prove the French target really requires Shift to type "1" before testing its Ctrl+1 accelerator.
      expect(ready.digitOneModifiers).toBe(keyboardLayoutId === "0000040c" ? 1 : 0);
      const target: WindowsExecutionTarget = {
        kind: "desktop",
        windowsProcessName: "powershell",
        processId: ready.processId,
        windowHandle: ready.windowHandle,
      };
      const apply = (sequence: Parameters<typeof buildPowerShellScript>[2]) => {
        const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "-"], {
          input: buildPowerShellScript(target, 0, sequence),
          timeout: 20000,
          encoding: "utf8",
        });
        expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
      };
      apply([{ base: "a", modifiers: [Modifiers.control] }]);
      await waitFor((value) => value.selectionLength === "scratch document".length);
      apply([{ base: "+", modifiers: [] }]);
      await waitFor((value) => value.text === "+");
      apply([
        { base: "1", modifiers: [Modifiers.control] },
        { base: "9", modifiers: [Modifiers.control] },
        { base: "0", modifiers: [Modifiers.control] },
      ]);
      const numberKeys = await waitFor((value) => value.keys.some((key) => key.endsWith("+D0")));
      expect(numberKeys.keys.filter((key) => /\+D[190]$/.test(key))).toEqual([
        "Control+D1",
        "Control+D9",
        "Control+D0",
      ]);
      apply([
        { base: "k", modifiers: [Modifiers.control] },
        { base: "s", modifiers: [Modifiers.control] },
      ]);
      const received = await waitFor((value) => value.keys.includes("Control+S"));
      expect(received.keys.filter((key) => key === "Control+K" || key === "Control+S")).toEqual([
        "Control+K",
        "Control+S",
      ]);
      expect(received.text).toBe("+");
      expect(received.heldModifiers).toBe(false);
    } finally {
      fixture.kill();
      await new Promise<void>((resolve) => {
        if (fixture.exitCode !== null) resolve();
        else fixture.once("exit", () => resolve());
      });
      fs.rmSync(directory, { recursive: true, force: true });
    }
  },
  90000
);
