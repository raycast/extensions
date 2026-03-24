import { useEffect, useState } from "react";
import { runAppleScript } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";

/** Escape a string for use inside an AppleScript double-quoted literal. */
function appleScriptStringLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function useStickiesMenu() {
  const [stickies, setStickies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStickies = async () => {
    setIsLoading(true);
    try {
      const script = `
        tell application "System Events"
          if not (exists process "Stickies") then
            return ""
          end if
          tell process "Stickies"
            set allItems to name of every menu item of menu 1 of menu bar item "Window" of menu bar 1
            
            set windowNames to {}
            set startIdx to 1
            repeat with i from 1 to count of allItems
              set currentItem to item i of allItems
              -- In AppleScript, the separator menu item name is often missing value
              if currentItem is missing value then
                set startIdx to i + 1
              end if
            end repeat
            
            if startIdx > (count of allItems) then
              return ""
            end if
            
            repeat with i from startIdx to count of allItems
              set end of windowNames to item i of allItems
            end repeat
            
            set oldDelims to AppleScript's text item delimiters
            set AppleScript's text item delimiters to "|||"
            set resultStr to windowNames as string
            set AppleScript's text item delimiters to oldDelims
            return resultStr
          end tell
        end tell
      `;
      const result = await runAppleScript(script, {
        timeout: 5000,
      });
      if (!result.trim()) {
        setStickies([]);
      } else {
        setStickies(result.split("|||"));
      }
    } catch (error) {
      console.error(error);
      showToast({
        title: "Could not fetch Stickies",
        message: String(error),
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStickies();
  }, []);

  return { stickies, isLoading, refetch: fetchStickies };
}

export async function switchToSticky(stickyName: string) {
  try {
    const targetName = appleScriptStringLiteral(stickyName);
    const script = `
      tell application "System Events"
        if not (exists process "Stickies") then
          return
        end if
        set targetName to "${targetName}"
        tell process "Stickies"
          set frontmost to true
          repeat with mi in menu items of menu 1 of menu bar item "Window" of menu bar 1
            try
              if (name of mi as string) is equal to targetName then
                click mi
                exit repeat
              end if
            end try
          end repeat
        end tell
      end tell
    `;
    await runAppleScript(script);
  } catch (error) {
    showToast({
      title: "Could not switch to Stickies note",
      message: String(error),
      style: Toast.Style.Failure,
    });
  }
}
