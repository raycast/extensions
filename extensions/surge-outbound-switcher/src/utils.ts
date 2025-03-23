import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

/**
 * Executes an AppleScript to switch Surge outbound mode
 * @param mode The outbound mode to switch to ("Direct", "Proxy", or "Rule")
 * @returns Promise<void>
 */
export async function switchSurgeOutboundMode(mode: "Direct" | "Proxy" | "Rule"): Promise<void> {
  try {
    // Using more precise menu access method
    const script = `
    tell application "System Events"
      tell process "Surge"
        -- Activate Surge to ensure correct focus
        set frontmost to true
        delay 0.5

        -- Use menu bar 2 (status bar menu)
        tell menu bar 2
          tell menu bar item 1
            perform action "AXPress" -- Open menu
            delay 0.5 -- Wait for menu to expand

            -- Search for "Outbound Mode" item in the menu
            set foundOutboundMode to false
            repeat with i from 1 to 10 -- Try up to 10 menu items
              try
                set menuItem to menu item i of menu 1
                if name of menuItem is "出站模式" or name of menuItem is "Outbound Mode" then
                  tell menuItem
                    perform action "AXPress" -- Open submenu
                    delay 0.3 -- Wait for submenu to expand

                    -- Click the corresponding mode option (supports both Chinese and English)
                    tell menu 1
                      if "${mode}" is "Direct" then
                        try
                          click menu item "直接连接"
                        on error
                          try
                            click menu item "Direct"
                          on error
                            try
                              click menu item "Direct Connection"
                            on error
                              click menu item "Direct Outbound"
                            end try
                          end try
                        end try
                      else if "${mode}" is "Proxy" then
                        try
                          click menu item "全局代理"
                        on error
                          try
                            click menu item "Proxy"
                          on error
                            click menu item "Global Proxy"
                          end try
                        end try
                      else if "${mode}" is "Rule" then
                        try
                          click menu item "规则判定"
                        on error
                          try
                            click menu item "Rule"
                          on error
                            try
                              click menu item "Rule-Based"
                            on error
                              click menu item "Rule-Based Proxy"
                            end try
                          end try
                        end try
                      end if
                    end tell

                    set foundOutboundMode to true
                    exit repeat
                  end tell
                end if
              on error
                -- Ignore errors, continue searching for the next menu item
              end try
            end repeat

            if not foundOutboundMode then
              -- Second attempt: if not found, may need to adjust menu index or name
              try
                tell menu 1
                  repeat with i from 1 to count of menu items
                    set menuItem to menu item i
                    set menuName to name of menuItem

                    if menuName contains "出站" or menuName contains "Outbound" then
                      tell menuItem
                        perform action "AXPress"
                        delay 0.3

                        -- Click the corresponding mode option (supports both Chinese and English)
                        tell menu 1
                          if "${mode}" is "Direct" then
                            try
                              click menu item "直接连接"
                            on error
                              try
                                click menu item "Direct"
                              on error
                                try
                                  click menu item "Direct Connection"
                                on error
                                  click menu item "Direct Outbound"
                                end try
                              end try
                            end try
                          else if "${mode}" is "Proxy" then
                            try
                              click menu item "全局代理"
                            on error
                              try
                                click menu item "Proxy"
                              on error
                                click menu item "Global Proxy"
                              end try
                            end try
                          else if "${mode}" is "Rule" then
                            try
                              click menu item "规则判定"
                            on error
                              try
                                click menu item "Rule"
                              on error
                                try
                                  click menu item "Rule-Based"
                                on error
                                  click menu item "Rule-Based Proxy"
                                end try
                              end try
                            end try
                          end if
                        end tell
                      end tell
                      set foundOutboundMode to true
                      exit repeat
                    end if
                  end repeat
                end tell
              end try
            end if
          end tell
        end tell
      end tell
    end tell
    return "${mode}"
    `;

    await runAppleScript(script);
    await showHUD(`🌐 Switched to ${getModeName(mode)} Mode`);
  } catch (error) {
    console.error(`🔴 Error switching to ${mode} mode:`, error);
    await showHUD(`🔴 Switch failed: ${error}`);
  }
}

/**
 * Returns the translated name for the outbound mode
 * @param mode The outbound mode in English
 * @returns The translated name of the mode
 */
function getModeName(mode: string): string {
  switch (mode) {
    case "Direct":
      return "Direct";
    case "Proxy":
      return "Global";
    case "Rule":
      return "Rule-Based";
    default:
      return mode;
  }
}
