/**
 * Ghostty native AppleScript API scripts.
 * Uses the scripting layer from https://github.com/ghostty-org/ghostty/pull/11208
 * - new window, new tab, new surface configuration
 * - split, focus, input text, send key
 * - front window, selected tab, focused terminal (PR #11251)
 */

/** Open a new Ghostty window using the native `new window` command */
export const openGhosttyWindow = `
set wasRunning to application "Ghostty" is running
tell application "Ghostty"
    activate
    if wasRunning then
        set newWin to new window
        activate window newWin
    end if
end tell`;

/** Open a new Ghostty tab using the native `new tab` command */
export const openGhosttyTab = `
tell application "Ghostty"
    activate
    if (count of windows) is 0 then
        new window
    else
        new tab in front window
    end if
end tell`;

/** Open a new Ghostty window at the selected Finder folder using surface configuration */
export const openGhosttyWindowAtFinderLocation = `
on replaceTilde(theText)
    set AppleScript's text item delimiters to "~"
    set theTextItems to every text item of theText
    set AppleScript's text item delimiters to "~ "
    set newText to theTextItems as text
    set AppleScript's text item delimiters to ""
    return newText
end replaceTilde

on setGhosttyTitleAction(targetTerminal, actionName, titleValue)
    try
        tell application "Ghostty"
            perform action (actionName & ":" & titleValue) on targetTerminal
        end tell
    end try
end setGhosttyTitleAction

tell application "Finder"
    if (count of selection) is 1 and (class of item 1 of selection) is folder then
        set currentPath to POSIX path of (item 1 of selection as alias)
    else
        set currentPath to POSIX path of (insertion location as alias)
    end if
end tell

set currentPath to replaceTilde(currentPath)
set directoryName to do shell script "basename " & quoted form of currentPath

tell application "Ghostty"
    activate
    set cfg to new surface configuration
    set initial working directory of cfg to currentPath
    set win to new window with configuration cfg
    set term to focused terminal of selected tab of win
    my setGhosttyTitleAction(term, "set_tab_title", directoryName)
    my setGhosttyTitleAction(term, "set_window_title", directoryName)
    input text "clear" to term
    send key "enter" to term
    focus term
    activate window win
end tell`;

/** Open a new Ghostty tab at the selected Finder folder using surface configuration */
export const openGhosttyTabAtFinderLocation = `
on replaceTilde(theText)
    set AppleScript's text item delimiters to "~"
    set theTextItems to every text item of theText
    set AppleScript's text item delimiters to "~ "
    set newText to theTextItems as text
    set AppleScript's text item delimiters to ""
    return newText
end replaceTilde

on setGhosttyTitleAction(targetTerminal, actionName, titleValue)
    try
        tell application "Ghostty"
            perform action (actionName & ":" & titleValue) on targetTerminal
        end tell
    end try
end setGhosttyTitleAction

tell application "Finder"
    if (count of selection) is 1 and (class of item 1 of selection) is folder then
        set currentPath to POSIX path of (item 1 of selection as alias)
    else
        set currentPath to POSIX path of (insertion location as alias)
    end if
end tell

set currentPath to replaceTilde(currentPath)
set directoryName to do shell script "basename " & quoted form of currentPath

tell application "Ghostty"
    activate
    set cfg to new surface configuration
    set initial working directory of cfg to currentPath
    if (count of windows) is 0 then
        set win to new window with configuration cfg
    else
        set win to front window
        set newTab to new tab in win with configuration cfg
        select tab newTab
    end if
    set term to focused terminal of selected tab of win
    my setGhosttyTitleAction(term, "set_tab_title", directoryName)
    my setGhosttyTitleAction(term, "set_window_title", directoryName)
    input text "clear" to term
    send key "enter" to term
    focus term
    activate window win
end tell`;
