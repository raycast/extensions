import { Clipboard, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";


export default async () => {

    const preferences = getPreferenceValues();
    const selectedTerminal = preferences.preferedTerminalApp;

    const directory = await Clipboard.readText();

    var script: string;
    switch (selectedTerminal) {
        case "iTerm":
            script = `
                tell application "System Events"
                -- some versions might identify as "iTerm2" instead of "iTerm"
                set isRunning to (exists (processes where name is "iTerm")) or (exists (processes where name is "iTerm2"))
                end tell

                tell application "iTerm"
                activate
                set hasNoWindows to ((count of windows) is 0)
                if isRunning and hasNoWindows then
                    create window with default profile
                end if
                select first window

                tell the first window
                    if isRunning and hasNoWindows is false then
                    create tab with default profile
                    end if
                    set pathList to "${directory}"
                    set command to "cd " & pathList
                    tell current session to write text command
                    end tell
                end tell
            `;
            break;
        case "warp":
            console.log("jo")
            script = `
                set command to "open -a /Applications/Warp.app " & "${directory}"
                do shell script command
            `;
            break;
        default:
            script = `
                tell application "System Events"
                set pathList to "${directory}"
                if not (exists (processes where name is "Terminal")) then
                    do shell script "open -a Terminal " & pathList
                else
                    tell application "Terminal"
                    activate
                    if (count of windows) is 0 then
                        do script ("cd " & pathList)
                    else
                        tell application "System Events" to tell process "Terminal.app" to keystroke "t" using command down
                        delay 1
                        do script ("cd " & pathList) in first window
                    end if
                    end tell
                end if
                end tell
            `;
    }
    try {
        const result = await runAppleScript(script);
        await showToast(Toast.Style.Success, "Done", result);
    } catch (err) {
        await showToast(Toast.Style.Failure, "Something went wrong");
    }
};