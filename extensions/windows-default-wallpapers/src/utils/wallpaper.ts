import { runPowerShellScript } from "@raycast/utils";

export default async function setWallpaper(path: string) {
  try {
    await runPowerShellScript(`
if (-Not (Test-Path "${path}")) {
    Write-Error "File not found: ${path}"
    exit 1
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@

$SPI_SETDESKWALLPAPER = 20
$SPIF_UPDATEINIFILE = 1
$SPIF_SENDCHANGE = 2
$flags = $SPIF_UPDATEINIFILE -bor $SPIF_SENDCHANGE

[Wallpaper]::SystemParametersInfo($SPI_SETDESKWALLPAPER, 0, "${path}", $flags)
`);
  } catch (error) {
    console.error(`Could not set Windows wallpaper '${path}'. Reason: ${error}`);
  }
}
