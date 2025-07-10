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

export const getCurrentExplorerPath = async () => {
  const script = `
        function Get-CurrentExplorerPathInternal {
            $shell = New-Object -ComObject Shell.Application
            $foundPath = ""

            foreach ($window in $shell.Windows()) {
                try {
                    if ($window.Document -and $window.Document.Folder -and $window.Document.Folder.Self.Path) {
                        $path = $window.Document.Folder.Self.Path
                        $foundPath = $path
                        break
                    }
                }
                catch { }
            }
            return $foundPath
        }
        Get-CurrentExplorerPathInternal
    `;
  const path = (await runPowerShellScript(script)).trim();

  return path;
};
