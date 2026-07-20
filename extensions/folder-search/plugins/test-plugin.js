exports.FolderSearchPlugin = {
  title: "Test Plugin",
  shortcut: {
    modifiers: ["cmd", "shift"],
    key: "t"
  },
  icon: "🔍",
  appleScript: (result) => `
    -- Show notification with folder details
    display notification "Folder: ${result.kMDItemFSName}
Last Used: ${result.kMDItemLastUsedDate}
Size: ${result.kMDItemFSSize} bytes" with title "Folder Search Test"
    
    -- Open folder in Finder and show info
    tell application "Finder"
      activate
      set targetFolder to (POSIX file "${result.path}") as alias
      reveal targetFolder
      open information window of targetFolder
    end tell
    
    -- Log folder details to console
    do shell script "echo 'Test Plugin: ${result.kMDItemFSName} (${result.path})' >> ~/folder-search-test.log"
  `
}; 