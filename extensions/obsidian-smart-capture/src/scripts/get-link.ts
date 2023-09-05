export const GET_LINK_INFO_SCRIPT = `
tell application "System Events"
    set activeApp to name of application processes whose frontmost is true
end tell

if "Safari" is in activeApp then
    tell application "Safari"
        if (exists front document) then
            set frontDocument to front document
            set documentURL to URL of frontDocument
            set tabTitle to name of frontDocument
            return documentURL & "\\t" & tabTitle
        else
            error "Safari is not displaying a web page!"
        end if
    end tell
else if "Google Chrome" is in activeApp then
    tell application "Google Chrome"
        if (exists active tab of front window) then
            set activeTab to active tab of front window
            set tabURL to URL of activeTab
            set tabTitle to title of activeTab
            return tabURL & "\\t" & tabTitle
        else
            error "Chrome is not displaying a web page!"
        end if
    end tell
else
    error "Safari or Google Chrome is not in focus. Please switch to either Safari or Chrome and try again."
end if
`;
