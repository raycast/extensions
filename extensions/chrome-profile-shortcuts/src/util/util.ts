import { runAppleScript } from "@raycast/utils";

export const openGoogleChrome = async (
  profileDirectory: string,
  link: string,
  willOpen: () => Promise<void>,
  profileName?: string,
) => {
  const appPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  const script = `
    set appPath to quoted form of "${appPath}"
    set theProfile to quoted form of "${profileDirectory}"
    set theLink to ${link ? `quoted form of "${link}"` : `""`}
    
    if "${profileName || ""}" is not "" then
        tell application "Google Chrome" to activate
        tell application "System Events"
            tell process "Google Chrome"
                set profileMenu to menu "Profiles" of menu bar 1
                set menuItems to name of menu items of profileMenu
                
                if "${profileName}" is in menuItems then
                    click menu item "${profileName}" of profileMenu
                else
                    set foundMatch to false
                    repeat with menuItemName in menuItems
                        if menuItemName is not missing value then
                            if menuItemName contains "${profileName}" then
                                click menu item menuItemName of profileMenu
                                set foundMatch to true
                                exit repeat
                            end if
                        end if
                    end repeat
                    
                    if foundMatch is false then
                        set AppleScript's text item delimiters to ", "
                        error "Profile '${profileName}' not found in menu. Available: " & (menuItems as string)
                    end if
                end if
            end tell
        end tell
        
        if theLink is not "" then
            delay 0.5
            tell application "Google Chrome"
                open location "${link}"
            end tell
        end if
    else
        error "Internal Error: No profile name provided"
    end if
  `;

  await willOpen();
  await runAppleScript(script);
};
