import { runAppleScript, runPowerShellScript } from "@raycast/utils";

const getCurrentFinderPathScript = `
try
    tell application "Finder"
        return POSIX path of (insertion location as alias)
    end tell
on error
    return ""
end try
`;
export const getCurrentFinderPath = async () => {
  return await runAppleScript(getCurrentFinderPathScript);
};

const getSelectedPathFinderItemsScript = `
tell application "Path Finder"
    set thePaths to {}
    repeat with pfItem in (get selection)
    set the end of thePaths to POSIX path of pfItem
    end repeat
    return thePaths
end tell
`;
export const getSelectedPathFinderItems = async () => {
  const paths = await runAppleScript(getSelectedPathFinderItemsScript);
  return paths.split(","); // Assuming the paths are comma-separated
};

const getActiveExplorerPathScript = `
$shell = New-Object -ComObject Shell.Application
$windows = $shell.Windows()
foreach ($window in $windows) {
  if ($window.Name -eq "File Explorer") {
    $path = $window.Document.Folder.Self.Path
    if ($path) {
      Write-Output $path
      exit 0
    }
  }
}

exit 1
`;
export const getActiveExplorerPath = async () => {
  try {
    const result = await runPowerShellScript(getActiveExplorerPathScript);
    return result.trim();
  } catch {
    throw new Error("Could not find Explorer window");
  }
};
