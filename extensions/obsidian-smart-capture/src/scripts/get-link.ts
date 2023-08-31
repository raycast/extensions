export const GET_LINK_INFO_SCRIPT = `
tell application "System Events"
    set activeApp to name of application processes whose frontmost is true
end tell

if "Safari" is in activeApp then
    tell application "Safari"
        if (exists front document) then
            return URL of front document & "\\t" & name of front document
        else
            error "Safari is not displaying a web page!"
        end if
    end tell
else if "Google Chrome" is in activeApp then
    tell application "Google Chrome"
        if (exists active tab of front window) then
            return URL of active tab of front window & "\\t" & title of active tab of front window
        else
            error "Chrome is not displaying a web page!"
        end if
    end tell
else if "Brave Browser" is in activeApp then
    tell application "Brave Browser"
        if (exists active tab of front window) then
            return URL of active tab of front window & "\\t" & title of active tab of front window
        else
            error "Brave Browser is not displaying a web page!"
        end if
    end tell
else if "Arc" is in activeApp then
    tell application "Arc"
	    return URL of active tab of front window & "\\t" & title of active tab of front window
    end tell
else if "Firefox" is in activeApp then
    tell application "Firefox"
	    return URL of active tab of front window & "\\t" & title of active tab of front window
    end tell
else if "Microsoft Edge" is in activeApp then
    tell application "Microsoft Edge"
	    return URL of active tab of front window & "\\t" & title of active tab of front window
    end tell
else if "Opera" is in activeApp then
    tell application "Opera"
	    return URL of active tab of front window & "\\t" & title of active tab of front window
    end tell
else
    error "Supported browser not in focus. Please switch to a supported browser and try again."
end if
`;
