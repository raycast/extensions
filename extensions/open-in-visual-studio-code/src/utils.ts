import { runAppleScript, runPowerShellScript } from "@raycast/utils";

export const isMac = process.platform === "darwin";

export const getSelectedFinderWindow = async (): Promise<string> => {
  const appleScript = `
  if application "Finder" is running and frontmost of application "Finder" then
    tell app "Finder"
      set finderWindow to window 1
      set finderWindowPath to (POSIX path of (target of finderWindow as alias))
      return finderWindowPath
    end tell
  else 
    error "Could not get the selected Finder window"
  end if
 `;

  try {
    const result = await runAppleScript(appleScript);
    return result.trim();
  } catch {
    throw new Error("Could not get the selected Finder window");
  }
};

export const getActiveExplorerWindow = async (): Promise<string> => {
  const powerShellscript = `
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

  try {
    const result = await runPowerShellScript(powerShellscript);
    return result.trim();
  } catch {
    throw new Error("Could not get the selected File Manager window");
  }
};
