on run argv
  set bundleId to item 1 of argv as text
  tell application "System Events"
    return (exists (application processes where bundle identifier is bundleId))
  end tell
end run
