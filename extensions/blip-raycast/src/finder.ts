import { getSelectedFinderItems } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import { fileManagerName, isMac } from "./platform";

export async function getFirstSelectedFilePath(): Promise<string> {
  if (isMac) {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length === 0) {
      throw new Error(`No ${fileManagerName} item is selected.`);
    }
    return selectedItems[0].path;
  }

  return getFirstSelectedExplorerPath();
}

async function getFirstSelectedExplorerPath(): Promise<string> {
  const script = `
try {
  $shell = New-Object -ComObject Shell.Application
  $windows = @($shell.Windows())
  $exp = @($windows | Where-Object { $_ -ne $null -and $_.Name -match 'Explorer' })
  if ($exp.Count -eq 0) { throw 'no_window' }
  $items = @($exp[0].Document.SelectedItems())
  if ($items.Count -eq 0) { throw 'no_selection' }
  Write-Output $items[0].Path
} catch {
  Write-Error $_.Exception.Message
  exit 1
}`;

  try {
    const path = (await runPowerShellScript(script)).trim();
    if (!path) throw new Error();
    return path;
  } catch {
    throw new Error(`No ${fileManagerName} item is selected.`);
  }
}
