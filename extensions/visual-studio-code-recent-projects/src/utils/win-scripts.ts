import { runPowerShellScript } from "@raycast/utils";

export async function getCurrentExplorerPath() {
  const script = `
$url = (New-Object -ComObject Shell.Application).Windows() |
  Where-Object { $_.LocationName -ne $null -and $_.LocationName -ne "Desktop" } |
  Select-Object -First 1 -ExpandProperty LocationURL

Write-Output $url
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
    const pathname = decodeURI(url.pathname);
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
