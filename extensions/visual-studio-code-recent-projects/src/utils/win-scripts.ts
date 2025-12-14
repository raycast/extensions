import { runPowerShellScript } from "@raycast/utils";

export const getSelectedFileExplorerItems = async () => {
  const script = `
function Get-SelectedExplorerItemsInternal {
    [CmdletBinding()]
    Param()

    $shell = New-Object -ComObject Shell.Application
    $selectedPaths = @()

    foreach ($window in $shell.Windows()) {
        try {
            if ($window.Document -and $window.Document.Folder -and $window.Document.SelectedItems) {
                $items = $window.Document.SelectedItems()
                if ($items.Count -gt 0) {
                    foreach ($item in $items) {
                        $selectedPaths += $item.Path
                    }
                    return $selectedPaths
                }
            }
        }
        catch { }
    }
    return $selectedPaths
}

Get-SelectedExplorerItemsInternal | ForEach-Object { Write-Output $_ }
  `;

  const rawOutput = await runPowerShellScript(script);
  const paths = rawOutput.split(/\r?\n/).filter((line) => line.trim() !== "");
  return paths;
};

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
