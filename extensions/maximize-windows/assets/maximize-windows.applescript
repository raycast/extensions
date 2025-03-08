use framework "AppKit"
use scripting additions

set {screenPosition, screenSize} to (current application's NSScreen's mainScreen()'s frame())

tell application "System Events"
  set frontmostProcess to first process where it is frontmost -- this will set frontmostProcess to the frontmost process
  if background only of frontmostProcess is false then
    tell frontmostProcess
      set allWindows to every window
      repeat with i from 1 to count allWindows
        set thisWindow to item i of allWindows
        try
          tell thisWindow
            set position to screenPosition
            set size to screenSize
          end tell
        on error
          -- do nothing, just skip this window
        end try
      end repeat
    end tell
  end if
end tell
