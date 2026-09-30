import { runPowerShellScript } from "@raycast/utils";

export async function getCurrentExplorerPath(): Promise<string> {
  const script = `
Add-Type -Namespace Win32 -Name Foreground -MemberDefinition '[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();' | Out-Null
$foreground = [Win32.Foreground]::GetForegroundWindow().ToInt32()
$windows = (New-Object -ComObject Shell.Application).Windows() |
  Where-Object { $_.LocationName -ne $null -and $_.LocationName -ne "Desktop" }
# Prefer the foreground Explorer window so a second, unrelated window doesn't win;
# fall back to the first one (e.g. Raycast itself is foreground when this runs).
$match = $windows | Where-Object { $_.HWND -eq $foreground } | Select-Object -First 1
if ($null -eq $match) {
  $match = $windows | Select-Object -First 1
}

Write-Output $match.LocationURL
`;
  const rawUrl = (await runPowerShellScript(script)).trim();
  if (!rawUrl) {
    return "";
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "file:") {
      return "";
    }
    // Decode each segment fully: decodeURI leaves reserved escapes such as %23 (#)
    // untouched, so a folder like C:\work#1 would come back with a literal %23 and
    // fail to resolve. decodeURIComponent on '+'-safe segments is correct here because
    // '+' is a literal plus in file URLs, not a space.
    const pathname = url.pathname
      .split("/")
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part;
        }
      })
      .join("/");
    if (url.host) {
      // UNC share, e.g. file://server/share/folder -> \\server\share\folder
      return `\\\\${url.host}\\${pathname.replace(/^\/+/, "").replace(/\//g, "\\")}`;
    }
    // Local drive, e.g. file:///C:/Users/foo -> C:/Users/foo
    return pathname.replace(/^\/([A-Za-z]:)/, "$1");
  } catch {
    return "";
  }
}
