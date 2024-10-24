import { runAppleScript } from "run-applescript";
import type { ShellArguments } from "./types";

export const runInKitty = (command: string) => {
  const escaped_command = command.replaceAll('"', '\\"');
  const script = `
      tell application "System Events"
        do shell script "/Applications/kitty.app/Contents/MacOS/kitty -1 kitten @ launch --hold ${escaped_command}"
      end tell
    `;

  runAppleScript(script);
};

export const runInIterm = (command: string) => {
  const script = `
      -- Set this property to true to open in a new window instead of a new tab
      property open_in_new_window : false
  
      on new_window()
          tell application "iTerm" to create window with default profile
      end new_window
  
      on new_tab()
          tell application "iTerm" to tell the first window to create tab with default profile
      end new_tab
  
      on call_forward()
          tell application "iTerm" to activate
      end call_forward
  
      on is_running()
          application "iTerm" is running
      end is_running
  
      on is_processing()
          tell application "iTerm" to tell the first window to tell current session to get is processing
      end is_processing
  
      on has_windows()
          if not is_running() then return false
          if windows of application "iTerm" is {} then return false
          true
      end has_windows
  
      on send_text(custom_text)
          tell application "iTerm" to tell the first window to tell current session to write text custom_text
      end send_text
  
      -- Main
      if has_windows() then
        if open_in_new_window then
          new_window()
        else
          new_tab()
        end if
      else
          -- If iTerm is not running and we tell it to create a new window, we get two
          -- One from opening the application, and the other from the command
          if is_running() then
              new_window()
          else
              call_forward()
          end if
      end if
  
  
      -- Make sure a window exists before we continue, or the write may fail
      repeat until has_windows()
          delay 0.01
      end repeat
  
      send_text("${command.replaceAll('"', '\\"')}")
      call_forward()
    `;

  runAppleScript(script);
};

export const runInWarp = (command: string) => {
  const script = `
        -- For the latest version:
        -- https://github.com/DavidMChan/custom-alfred-warp-scripts
  
        -- Set this property to true to always open in a new window
        property open_in_new_window : true
  
        -- Set this property to true to always open in a new tab
        property open_in_new_tab : false
  
        -- Don't change this :)
        property opened_new_window : false
  
        -- Handlers
        on new_window()
            tell application "System Events" to tell process "Warp"
                click menu item "New Window" of menu "File" of menu bar 1
                set frontmost to true
            end tell
        end new_window
  
        on new_tab()
            tell application "System Events" to tell process "Warp"
                click menu item "New Tab" of menu "File" of menu bar 1
                set frontmost to true
            end tell
        end new_tab
  
        on call_forward()
            tell application "Warp" to activate
        end call_forward
  
        on is_running()
            application "Warp" is running
        end is_running
  
        on has_windows()
            if not is_running() then return false
            tell application "System Events"
                if windows of process "Warp" is {} then return false
            end tell
            true
        end has_windows
  
        on send_text(custom_text)
            tell application "System Events"
                keystroke custom_text
            end tell
        end send_text
  
  
        -- Main
        if not is_running() then
            call_forward()
            set opened_new_window to true
        else
            call_forward()
            set opened_new_window to false
        end if
  
        if has_windows() then
            if open_in_new_window and not opened_new_window then
                new_window()
            else if open_in_new_tab and not opened_new_window then
                new_tab()
            end if
        else
            new_window()
        end if
  
  
        -- Make sure a window exists before we continue, or the write may fail
        repeat until has_windows()
            delay 0.5
        end repeat
        delay 0.5
  
        send_text("${command}")
        call_forward()
    `;

  runAppleScript(script);
};

export const runInTerminal = (command: string) => {
  const script = `
    tell application "Terminal"
      do script "${command.replaceAll('"', '\\"')}"
      activate
    end tell
    `;

  runAppleScript(script);
};

export const runInShell = (terminalType: string, shellArguments: ShellArguments) => {
  switch (terminalType) {
    case "kitty":
      runInKitty(shellArguments.command);
      break;

    case "iTerm":
      runInIterm(shellArguments.command);
      break;

    case "Warp":
      runInWarp(shellArguments.command);
      break;

    default:
      runInTerminal(shellArguments.command);
      break;
  }
};
