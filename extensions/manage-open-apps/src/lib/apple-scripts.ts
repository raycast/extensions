export const activeApplicationsAppleScript = () => {
  return `
    set appInfoList to {}
    tell application "System Events"
      set appProcesses to every application process
      repeat with appProcess in appProcesses
        set appName to name of appProcess
        set appVisible to visible of appProcess
        if appVisible then
          set appBundleID to bundle identifier of appProcess
          set appPath to file of process appName
          set filePath to POSIX path of appPath
          if filePath starts with "/System/Applications" then
            -- System application
            set formattedPath to "/System" & text 18 thru -1 of filePath
          else
            -- Installed application
            set formattedPath to "/Applications" & text 14 thru -1 of filePath
          end if
          set end of appInfoList to {name: appName, identifier: appBundleID, path: formattedPath}
        end if
      end repeat
    end tell
    return appInfoList
  `;
};

export const closeApplicationAppleScript = (appName: string) => {
  return `
    tell application "${appName}"
    quit
    end tell
  `;
};

export const closeAllApplicationsAppleScript = (names: string[]) => {
  const scripts = names.map(
    (appName) => `
    tell application "System Events"
      if (count (every process whose name is "${appName}")) > 0 then
        tell application "${appName}" to quit
      end if
    end tell
  `,
  );

  return scripts.join("\n");
};

export const applicationIconAppleScript = (basePath: string) => {
  return `
      on getFirstICNSFile(basePath)
          set resourcesPath to basePath & "/Contents/Resources/"
          set icnsFiles to paragraphs of (do shell script "ls " & quoted form of resourcesPath & "*.icns")

          if length of icnsFiles is greater than 0 then
              return item 1 of icnsFiles
          else
              return ""
          end if
      end getFirstICNSFile

      getFirstICNSFile("${basePath}")
    `;
};

export const toggleFrontmostApplicationFullscreenAppleScript = () => {
  return `
    -- Get the bundle identifier of the frontmost application
    set frontAppID to id of application (path to frontmost application as text)

    -- Toggle fullscreen for the frontmost application
    tell application "System Events"
        set frontApp to (first application process whose bundle identifier is frontAppID)

        try
            set isFullScreen to value of attribute "AXFullScreen" of window 1 of frontApp
            set value of attribute "AXFullScreen" of window 1 of frontApp to (not isFullScreen)

            return "Toggled fullscreen"
        on error
            return "Failed to toggle fullscreen"
        end try
    end tell
  `;
};
