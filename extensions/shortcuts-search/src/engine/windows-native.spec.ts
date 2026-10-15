// Exercise the production native helpers on Windows, outside Raycast.
import { spawnSync } from "node:child_process";
import { windowsNativeScript, powerShellProgram } from "./windows-native";
const nativeTest = process.platform === "win32" ? it : it.skip;
nativeTest(
  "compiles Win32/UIA helpers and verifies keyboard layouts, window ownership and missing/non-browser windows",
  () => {
    const script = powerShellProgram(`${windowsNativeScript}
Add-Type -AssemblyName System.Windows.Forms
$form = [System.Windows.Forms.Form]::new()
$form.Text = 'Hotkys native fixture'
$form.ShowInTaskbar = $false
$form.Show()
[System.Windows.Forms.Application]::DoEvents()
$handle = $form.Handle
$name = (Get-Process -Id $PID).ProcessName
try {
  [HotkysWindows]::CheckWindow($handle, $PID, $name, $false)
  $keys = [HotkysWindows]::ResolveKeys($handle, 0, '+', [int[]]@(17))
  if ($keys.Length -lt 2 -or $keys[0] -ne 17 -or $keys[$keys.Length-1] -eq 0) { throw 'Punctuation mapping failed' }
  $win = [HotkysWindows]::ResolveKeys($handle, 37, '', [int[]]@(91))
  if ($win[0] -ne 91 -or $win[1] -ne 37) { throw 'Win modifier mapping failed' }
  $failed = $false
  try { [HotkysWindows]::CheckWindow($handle, ($PID + 1), $name, $false) } catch { $failed = $true }
  if (-not $failed) { throw 'Window ownership check failed' }
  $failed = $false
  try { [HotkysWindows]::CheckWindow([IntPtr]::Zero, $PID, $name, $true) } catch { $failed = $true }
  if (-not $failed) { throw 'Missing window check failed' }
  $failed = $false
  try { Get-HotkysWindow 'hotkys_nonexistent_fixture' } catch { $failed = $true }
  if (-not $failed) { throw 'Missing process check failed' }
  $failed = $false
  try { Get-HotkysBrowserUrl $handle } catch { $failed = $true }
  if (-not $failed) { throw 'Non-browser must not supply a browser URL' }
  $size = [Runtime.InteropServices.Marshal]::SizeOf([Activator]::CreateInstance([HotkysWindows].GetNestedType('INPUT', [Reflection.BindingFlags]::NonPublic)))
  $expected = if ([IntPtr]::Size -eq 8) { 40 } else { 28 }
  if ($size -ne $expected) { throw "Invalid INPUT size: $size" }
  Write-Output 'NATIVE_CHECKS_PASSED'
} finally { $form.Close(); $form.Dispose() }
`);
    // Match the stdin transport used by @raycast/utils, including terminating errors.
    const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-Command", "-"], {
      input: script,
      timeout: 30000,
      encoding: "utf8",
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("NATIVE_CHECKS_PASSED");
  },
  40000
);

nativeTest("aborts the entire stdin program after a native failure", () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "-"], {
    input: powerShellProgram("throw 'Expected fixture failure'\nWrite-Output 'MUST_NOT_RUN'"),
    timeout: 10000,
    encoding: "utf8",
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Expected fixture failure");
  expect(result.stdout).not.toContain("MUST_NOT_RUN");
});

nativeTest("returns Unicode capture data over the same UTF-8 stdout transport", () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "-"], {
    input: powerShellProgram(
      "$url = 'https://example.com/' + [char]0x043F + [char]0x00E9\n@{ url = $url } | ConvertTo-Json -Compress"
    ),
    timeout: 10000,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout).url).toBe("https://example.com/пé");
});

nativeTest(
  "corroborates browser display URLs using Windows URI rules and known Chromium elisions",
  () => {
    const script = powerShellProgram(`${windowsNativeScript}
$unicode = 'https://example.com/' + [char]0x043F
foreach ($pair in @(
  @('example.com/page', 'https://www.example.com/page'),
  @('example.com/~user?q=A', 'https://example.com/%7Euser?q=%41'),
  @('example.com/page', 'http://example.com/page'),
  @($unicode, 'https://example.com/%D0%BF')
)) {
  try { Assert-HotkysBrowserAddress $pair[0] $pair[1] }
  catch { throw ('Equivalent URL fixture rejected: ' + $pair[0] + ' / ' + $pair[1]) }
}
foreach ($pair in @(
  @('example.com/page', 'https://example.com/other'),
  @('example.com/page?q=2', 'https://example.com/page?q=1'),
  @('example.com/a%2Fb', 'https://example.com/a/b'),
  @('example.com/page?q=a%26b', 'https://example.com/page?q=a&b'),
  @('evil.example/page', 'https://www.example.com/page'),
  @('https://example.com/page', 'http://example.com/page'),
  @('https://user@example.com/page', 'https://example.com/page')
)) {
  $failed = $false
  try { Assert-HotkysBrowserAddress $pair[0] $pair[1] } catch { $failed = $true }
  if (-not $failed) { throw 'Mismatched browser address accepted' }
}
Write-Output 'URL_CHECKS_PASSED'
`);
    const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "-"], {
      input: script,
      timeout: 30000,
      encoding: "utf8",
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("URL_CHECKS_PASSED");
  },
  40000
);
