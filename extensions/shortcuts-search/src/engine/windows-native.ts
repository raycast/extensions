// Shared native helpers for capture and execution. Script data is always encoded JSON.
export const windowsNativeScript = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class HotkysWindows {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
  delegate bool EnumWindow(IntPtr h, IntPtr data);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindow callback, IntPtr data);
  [DllImport("user32.dll")] static extern IntPtr GetKeyboardLayout(uint thread);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern short VkKeyScanEx(char key, IntPtr layout);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint count, INPUT[] inputs, int size);
  [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION data; }
  [StructLayout(LayoutKind.Explicit)] struct UNION {
    [FieldOffset(0)] public KEYBDINPUT keyboard;
    [FieldOffset(0)] public MOUSEINPUT mouse;
  }
  [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT {
    public ushort vk, scan; public uint flags, time; public UIntPtr extra;
  }
  [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT {
    public int x, y; public uint data, flags, time; public UIntPtr extra;
  }
  public static string ComparableUrl(Uri uri) {
    // Decode only RFC 3986 unreserved ASCII escapes, preserving path/query delimiters.
    return System.Text.RegularExpressions.Regex.Replace(uri.AbsoluteUri, "%([0-9a-fA-F]{2})", delegate(System.Text.RegularExpressions.Match m) {
      char c = (char)Convert.ToInt32(m.Groups[1].Value, 16);
      bool unreserved = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '.' || c == '_' || c == '~';
      return unreserved ? c.ToString() : m.Value.ToUpperInvariant();
    });
  }
  public static IntPtr[] WindowsFor(string name) {
    var windows = new List<IntPtr>();
    EnumWindows(delegate(IntPtr h, IntPtr data) {
      uint pid; GetWindowThreadProcessId(h, out pid);
      try {
        if (IsWindowVisible(h) && GetWindowTextLength(h) > 0 &&
            String.Equals(Process.GetProcessById((int)pid).ProcessName, name, StringComparison.OrdinalIgnoreCase)) windows.Add(h);
      } catch (ArgumentException) { }
      return true;
    }, IntPtr.Zero);
    return windows.ToArray();
  }
  public static void CheckWindow(IntPtr h, int expectedPid, string name, bool foreground) {
    uint pid; GetWindowThreadProcessId(h, out pid);
    if (!IsWindow(h) || pid != expectedPid ||
        !String.Equals(Process.GetProcessById((int)pid).ProcessName, name, StringComparison.OrdinalIgnoreCase))
      throw new Exception("Application window changed; no further keys were sent");
    if (foreground && GetForegroundWindow() != h) throw new Exception("Application focus changed; remaining keys were cancelled");
  }
  static INPUT Key(ushort vk, bool up) {
    // Navigation keys use the extended-key flag, except Pause and function keys.
    bool extended = (vk >= 0x21 && vk <= 0x28) || vk == 0x2D || vk == 0x2E || vk == 0x5B || vk == 0x5C || vk == 0x2C || vk == 0x6F;
    return new INPUT { type = 1, data = new UNION { keyboard = new KEYBDINPUT { vk = vk, flags = (up ? 2u : 0u) | (extended ? 1u : 0u) } } };
  }
  public static ushort[] ResolveKeys(IntPtr h, int code, string character, int[] modifiers) {
    var keys = new List<ushort>();
    foreach (int m in modifiers) if (!keys.Contains((ushort)m)) keys.Add((ushort)m);
    // Only symbol tokens use character mapping; alphanumeric accelerators arrive as VK codes.
    if (!String.IsNullOrEmpty(character)) {
      uint pid; uint thread = GetWindowThreadProcessId(h, out pid);
      short mapped = VkKeyScanEx(character[0], GetKeyboardLayout(thread));
      if (mapped == -1) throw new Exception("Key is unavailable on the target keyboard layout");
      int state = ((ushort)mapped) >> 8;
      if ((state & ~7) != 0) throw new Exception("Unsupported keyboard layout mapping");
      if ((state & 1) != 0 && !keys.Contains(0x10)) keys.Add(0x10);
      if ((state & 2) != 0 && !keys.Contains(0x11)) keys.Add(0x11);
      if ((state & 4) != 0 && !keys.Contains(0x12)) keys.Add(0x12);
      code = mapped & 0xFF;
    }
    keys.Add((ushort)code);
    return keys.ToArray();
  }
  public static void SendChord(IntPtr h, int pid, string name, ushort[] keys) {
    foreach (int modifier in new int[] { 0x10, 0x11, 0x12, 0x5B, 0x5C })
      if ((GetAsyncKeyState(modifier) & 0x8000) != 0) throw new Exception("Release held modifier keys and retry manually");
    var inputs = new List<INPUT>();
    foreach (ushort key in keys) inputs.Add(Key(key, false));
    for (int i = keys.Length - 1; i >= 0; i--) inputs.Add(Key(keys[i], true));
    CheckWindow(h, pid, name, true);
    uint sent = SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf(typeof(INPUT)));
    if (sent != inputs.Count) {
      // Release our own keys only. Never retry a partially delivered chord.
      if (sent > 0) {
        var releases = new List<INPUT>();
        for (int i = keys.Length - 1; i >= 0; i--) releases.Add(Key(keys[i], true));
        SendInput((uint)releases.Count, releases.ToArray(), Marshal.SizeOf(typeof(INPUT)));
      }
      throw new Exception("Windows blocked input; earlier keys may have run. Check application elevation and retry manually.");
    }
  }
}
'@
function Assert-HotkysBrowserAddress([string]$address, [string]$documentUrl) {
  $documentUri = [Uri]$documentUrl
  if ($documentUri.Scheme -notin @('http', 'https') -or $documentUri.UserInfo) { throw 'Unsupported browser document URL' }
  if ($address -notmatch '^https?://') { $address = $documentUri.Scheme + '://' + $address }
  $addressUri = [Uri]$address
  if ($addressUri.UserInfo) { throw 'Unsupported browser address' }
  # Chromium's unfocused omnibox may omit the Document URL's leading www.
  $expected = [UriBuilder]::new($documentUri)
  if ($documentUri.Host.StartsWith('www.', [StringComparison]::OrdinalIgnoreCase) -and
      $addressUri.Host -eq $documentUri.Host.Substring(4)) { $expected.Host = $documentUri.Host.Substring(4) }
  if ([HotkysWindows]::ComparableUrl($addressUri) -cne [HotkysWindows]::ComparableUrl($expected.Uri)) { throw 'Address bar does not match the loaded page' }
}
function Get-HotkysBrowserUrl([IntPtr]$handle, [bool]$requireDocumentFocus = $false) {
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  $condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Edit)
  $edits = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
  $values = @()
  foreach ($edit in $edits) {
    $id = $edit.Current.AutomationId
    $name = $edit.Current.Name
    $address = $id -eq 'urlbar' -or $id -eq 'omnibox' -or $name -eq 'Address and search bar' -or $name -eq 'Search or enter address'
    $parent = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($edit)
    $inDocument = $false
    while ($null -ne $parent -and $parent -ne $root) {
      if ($parent.Current.ControlType -eq [System.Windows.Automation.ControlType]::Document) { $inDocument = $true }
      if ($parent.Current.ControlType -eq [System.Windows.Automation.ControlType]::ToolBar) { $address = $true }
      $parent = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($parent)
    }
    # Web content can imitate address labels and toolbars. It must never supply a target URL.
    if ($address -and -not $inDocument) {
      $pattern = $null
      if ($edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) {
        $value = $pattern.Current.Value
        if ($value -and $value -notmatch '\s' -and $value -match '^(https?://|[a-zA-Z0-9-]+\.)') { $values += $value }
      }
    }
  }
  if ($values.Count -ne 1) { throw 'Could not verify the browser address bar' }
  $docCondition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document)
  $documents = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $docCondition)
  $urls = @()
  foreach ($document in $documents) {
    if ($document.Current.IsOffscreen) { continue }
    $parent = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($document)
    $nested = $false
    while ($null -ne $parent -and $parent -ne $root) {
      if ($parent.Current.ControlType -eq [System.Windows.Automation.ControlType]::Document) { $nested = $true }
      $parent = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($parent)
    }
    if ($nested) { continue }
    $pattern = $null
    $documentUrl = $null
    if ($document.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) {
      $documentUrl = $pattern.Current.Value
    } elseif ($document.TryGetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern, [ref]$pattern)) {
      $documentUrl = $pattern.Current.Value
    }
    if ($documentUrl -match '^https?://') { $urls += $documentUrl }
  }
  if ($urls.Count -ne 1) { throw 'Could not verify the active browser document' }
  Assert-HotkysBrowserAddress $values[0] $urls[0]
  if ($requireDocumentFocus) {
    $focused = [System.Windows.Automation.AutomationElement]::FocusedElement
    $inPage = $false
    while ($null -ne $focused -and $focused -ne $root) {
      if ($focused.Current.ControlType -eq [System.Windows.Automation.ControlType]::Document) { $inPage = $true }
      $focused = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($focused)
    }
    if (-not $inPage) { throw 'Focus the web page content and retry manually' }
  }
  return @{ url = $urls[0]; addressValue = $values[0] }
}
function Get-HotkysWindow([string]$name) {
  $windows = @([HotkysWindows]::WindowsFor($name))
  $front = [HotkysWindows]::GetForegroundWindow()
  if ($windows -contains $front) { return $front }
  if ($windows.Count -ne 1) { throw 'Open a single target window, focus it, and retry manually' }
  return $windows[0]
}
`;

export function encodedJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}
export function decodePowerShellJson(variable: string, value: unknown): string {
  return `$${variable} = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedJson(value)}')) | ConvertFrom-Json`;
}

// PowerShell's stdin transport can continue with later statements after a failed
// top-level command. One guarded block makes every failure terminate the process.
export function powerShellProgram(body: string): string {
  return `$ErrorActionPreference = 'Stop'\n[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)\ntry {\n${body}\n} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }\n\n`;
}
