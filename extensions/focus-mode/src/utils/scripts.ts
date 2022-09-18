/**
 * Change current Focus Mode
 *
 * @param selectedFocus selected focus name
 *
 * @returns "active" | "inactive" based on focus state
 */
export const getActiveSelectedFocus = (selectedFocus: string): string => `
  set focusName to "${selectedFocus}"
  set focusStatus to ""

  tell application "System Preferences"
    set current pane to pane "com.apple.preference.notifications"
  end tell
 
  tell application "System Events"
    tell application process "System Preferences"
      click radio button "Focus" of tab group 1 of window "Notifications & Focus"
      
      tell window "Notifications & Focus"
        
        select (first row ¬
          of table 1 ¬
          of scroll area 1 ¬
          of tab group 1 ¬
          whose value ¬
          of static text ¬
          of UI element 1 ¬
          contains focusName)
        
        click checkbox of group 1 of tab group 1
        
        set toggleStatus to value of checkbox 1 of group 1 of tab group 1 as boolean
        
        if toggleStatus is true then
          set focusStatus to "active"
        else
          set focusStatus to "inactive"
        end if

        return focusStatus
      end tell
    end tell
  end tell
 `;

export const getFocusListConfigScript = `set srcJson to read POSIX file (POSIX path of (path to home folder) & "Library/DoNotDisturb/DB/ModeConfigurations.json")`;

export const getFocusListAssertionsScript = `set srcJson to read POSIX file (POSIX path of (path to home folder) & "Library/DoNotDisturb/DB/Assertions.json")`;
