import { runAppleScript } from 'run-applescript';

/**
 * Executes an AppleScript that clones the active tab in an Incognito window.
 * @param [closeTab=false] - If `true`, the active tab will be closed
 */
const cloneTab = async (closeTab = false) => {
  await runAppleScript(`
    set chromiumVariants to {"Google Chrome", "Chromium", "Opera", "Vivaldi", "Brave Browser", "Microsoft Edge"}
    set webkitVariants to {"Safari", "Webkit"}

    tell application "System Events"
      set frontmostApp to name of first process whose frontmost is true
    end tell

    set chromeScript to "tell application \\"" & frontmostApp & "\\"
        if (count every tab of front window) > 0
          set theURL to URL of active tab of front window
          if ${closeTab} then close active tab of front window
          make new window with properties {mode:\\"incognito\\"}
          set URL of active tab of front window to theURL
        end if
      end tell"

    set webkitScript to "tell application \\"" & frontmostApp & "\\"
        if (count every tab of front window) > 0
          set theURL to URL of current tab of front window
          if ${closeTab} then close current tab of front window
          tell application \\"System Events\\"
            keystroke \\"n\\" using {command down, shift down}
          end tell
          activate
          set URL of current tab of front window to theURL
        end if
      end tell"

    if frontmostApp is in chromiumVariants then
      run script chromeScript
    else if frontmostApp is in webkitVariants then
      run script webkitScript
    else if frontmostApp is "Arc"
      tell application "Arc"
        if (count every tab of front window) > 0 then
          set theURL to URL of active tab of front window
          if ${closeTab} then close active tab of front window
          make new window with properties {incognito:true}
          tell front window to make new tab with properties {URL:theURL}
        end if
      end tell
    else
      error "You need a supported browser as your frontmost app."
    end if
`);
};

export default cloneTab;
