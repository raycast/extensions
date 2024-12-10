on run argv
  set appName to item 1 of argv as text
  tell application "System Events"
    tell process "Dock"
      set dockItems to UI elements of list 1
      repeat with dockItem in dockItems
        try
          if value of attribute "AXTitle" of dockItem is appName then
            set badgeCount to value of attribute "AXStatusLabel" of dockItem
            if badgeCount is not missing value then
              return badgeCount
            end if
          end if
        end try
      end repeat
    end tell
  end tell
end run
