import { runPowerShellScript } from "@raycast/utils";

export async function getCurrentExplorerPath() {
  const script = `
$url = (New-Object -ComObject Shell.Application).Windows() |
  Where-Object { $_.LocationName -ne $null -and $_.LocationName -ne "Desktop" } |
  Select-Object -First 1 -ExpandProperty LocationURL

Write-Output $url
`;
  const path = decodeURI(await runPowerShellScript(script))
    .trim()
    .replace("file:///", "");

  return path;
}
