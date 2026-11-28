on run argv
  set targetMenu to item 1 of argv
  set targetItem to item 2 of argv
  tell application "System Events"
    if UI elements enabled is false then return "permission"
    repeat 50 times
      if exists (first application process whose bundle identifier is "com.sunflower.app") then exit repeat
      delay 0.1
    end repeat
    if not (exists (first application process whose bundle identifier is "com.sunflower.app")) then return "not-running"
    set targetProcess to first application process whose bundle identifier is "com.sunflower.app"
    tell targetProcess
      set frontmost to true
      repeat 20 times
        if exists menu bar 1 then exit repeat
        delay 0.1
      end repeat
      if not (exists menu bar item targetMenu of menu bar 1) then return "missing"
      set targetMenuItem to menu bar item targetMenu of menu bar 1
      if not (exists menu item targetItem of menu 1 of targetMenuItem) then return "missing"
      set targetAction to menu item targetItem of menu 1 of targetMenuItem
      if enabled of targetAction is false then return "disabled"
      click targetAction
      return "ok"
    end tell
  end tell
end run
