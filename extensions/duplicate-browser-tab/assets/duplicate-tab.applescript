-- duplicate-tab.applescript
on duplicateTab(activeApp)
  tell application activeApp
    activate
    tell application "System Events"
      set frontWindow to front window of application process activeApp
      set activeTabIndex to 1
      repeat with i from 1 to (count of UI elements of frontWindow)
        if role description of UI element i of frontWindow is "tab" and value of attribute "AXSelected" of UI element i of frontWindow is true then
          set activeTabIndex to i
          log "Found active tab at index: " & activeTabIndex
          exit repeat
        end if
      end repeat

      set activeTab to UI element activeTabIndex of frontWindow
      tell activeTab
        perform action "AXShowMenu"
        set contextMenu to menu 1 of application process activeApp
        click menu item "Duplicate" of contextMenu
        log "Duplicated tab"
        return "Tab duplicated successfully"
      end tell
    end tell
  end tell
end duplicateTab

tell application "System Events"
  set activeApp to name of first application process whose frontmost is true
  log "Active application: " & activeApp
end tell

if activeApp is in {"Google Chrome", "Safari", "Firefox", "Google Chrome Canary", "Opera", "Arc"} then
  set result to duplicateTab(activeApp)
  log result
  return result
else
  set errorMessage to "The active application is not a recognized browser."
  log errorMessage
  return errorMessage
end if
