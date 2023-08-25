import { runAppleScript } from "@raycast/utils";
import { execSync } from "child_process";
import { scrollBarOutputToValueMap } from "../data/constants";

function setScrollBarsVisibility(value: number) {
  return runAppleScript(`
    tell application "System Settings"
      activate
      set current pane to pane id "com.apple.Appearance-Settings.extension"
    end tell

    delay 0.5

    tell application "System Events" to tell application process "System Settings"
      set frontmost to true
      tell window 1
        tell group 1
          tell splitter group 1
            tell group 2
              tell group 1
                tell scroll area 1
                  tell group 2
                    tell radio group 1
                      set targetUIElement to a reference to radio button ${value}
                      if targetUIElement exists then
                        click targetUIElement
                      end if
                    end tell
                  end tell
                end tell
              end tell
            end tell
          end tell
        end tell
      end tell
    end tell

    tell application "System Settings" to quit
  `);
}

function getCurrentScrollBarsVisibility() {
  const buffer = execSync("defaults read NSGlobalDomain AppleShowScrollBars");
  const output = buffer.toString().replace(/[\r\n]/gm, "");
  return scrollBarOutputToValueMap[output];
}

export { setScrollBarsVisibility, getCurrentScrollBarsVisibility };
