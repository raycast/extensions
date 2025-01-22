import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Toast,
  showToast,
  getPreferenceValues,
  closeMainWindow,
  updateCommandMetadata,
} from "@raycast/api";
import { shellEnv } from "shell-env";
import { exec } from "child_process";
import { runAppleScript } from "run-applescript";
import fs from "fs";
import { promisify } from "util";

interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

interface Preferences {
  arguments_terminal: string;
  arguments_terminal_type: string;
  documentation_source: string;
}

let cachedEnv: null | EnvType = null;

const getCachedEnv = async () => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = {
    env: env,
    cwd: env.HOME || `/Users/${process.env.USER}`,
    shell: env.SHELL,
  };
  return cachedEnv;
};

const execAsync = promisify(exec);

// Check if cppman is installed
const checkCppman = async () => {
  try {
    const execEnv = await getCachedEnv();
    await execAsync("which cppman", { env: execEnv.env });
    return true;
  } catch {
    try {
      // Fallback to check common installation paths
      const paths = ["/usr/local/bin/cppman", "/usr/bin/cppman", "/opt/homebrew/bin/cppman"];
      for (const path of paths) {
        if (fs.existsSync(path)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
};

const runInKitty = (command: string) => {
  const escaped_command = command.replaceAll('"', '\\"');
  const script = `
    tell application "System Events"
      do shell script "/Applications/kitty.app/Contents/MacOS/kitty -1 kitten @ launch --hold ${escaped_command}"
    end tell
  `;

  runAppleScript(script);
};

const runInIterm = (command: string) => {
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

const runInWarp = (command: string) => {
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

const runInGhostty = (command: string) => {
  const script = `
      -- Set this property to true to always open in a new window
      property open_in_new_window : true

      -- Set this property to true to always open in a new tab
      property open_in_new_tab : false

      -- Reset this property to false
      property opened_new_window : false

      -- Handlers
      on new_window()
          tell application "System Events" to tell process "Ghostty"
              click menu item "New Window" of menu "File" of menu bar 1
              set frontmost to true
          end tell
      end new_window

      on new_tab()
          tell application "System Events" to tell process "Ghostty"
              click menu item "New Tab" of menu "File" of menu bar 1
              set frontmost to true
          end tell
      end new_tab

      on call_forward()
          tell application "Ghostty" to activate
      end call_forward

      on is_running()
          application "Ghostty" is running
      end is_running

      on has_windows()
          if not is_running() then return false
          tell application "System Events"
              if windows of process "Ghostty" is {} then return false
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

const runInTerminal = (command: string) => {
  const script = `
  tell application "Terminal"
    do script "${command.replaceAll('"', '\\"')}"
    activate
  end tell
  `;

  runAppleScript(script);
};

const SearchResult = ({ query }: { query: string }) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { arguments_terminal, arguments_terminal_type, documentation_source } = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        // Set the documentation source first
        const execEnv = await getCachedEnv();
        await execAsync(`cppman -s "${documentation_source}"`, { env: execEnv.env });

        if (arguments_terminal === "Terminal") {
          // Handle terminal execution based on preference
          const command = `cppman "${query}"`;
          switch (arguments_terminal_type) {
            case "iTerm":
              runInIterm(command);
              break;
            case "kitty":
              runInKitty(command);
              break;
            case "Warp":
              runInWarp(command);
              break;
            case "ghostty":
              runInGhostty(command);
              break;
            default:
              runInTerminal(command);
          }
          // Close the Raycast window since we're using terminal
          closeMainWindow();
        } else {
          // Show in Raycast
          const { stdout } = await execAsync(`cppman "${query}"`, { env: execEnv.env });
          setContent("```cpp\n" + stdout + "\n```");
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch documentation",
          message: "Make sure cppman is installed and the query is valid",
        });
        setContent("No documentation found for: " + query);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoc();
  }, [query, arguments_terminal, arguments_terminal_type, documentation_source]);

  // If using terminal, we don't need to render anything
  if (arguments_terminal === "Terminal") {
    return null;
  }

  // Otherwise show in Raycast
  return (
    <Detail
      markdown={content}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={content} />
        </ActionPanel>
      }
    />
  );
};

export default async function Command(props: { arguments?: { query?: string } }) {
  const { documentation_source } = getPreferenceValues<Preferences>();
  await updateCommandMetadata({ subtitle: documentation_source });

  const [searchText, setSearchText] = useState<string>("");
  const [isCppmanInstalled, setIsCppmanInstalled] = useState<boolean>(true);

  useEffect(() => {
    checkCppman().then(setIsCppmanInstalled);
  }, []);

  // If cppman is not installed, show installation instructions
  if (!isCppmanInstalled) {
    return (
      <Detail
        markdown={`
# cppman is not installed

Please install cppman to use this extension:

## Using pip
\`\`\`bash
pip install cppman
\`\`\`

## Using Homebrew
\`\`\`bash
brew install cppman
\`\`\`
        `}
      />
    );
  }

  // If query is provided via arguments, show results directly
  if (props.arguments?.query) {
    return <SearchResult query={props.arguments.query} />;
  }

  // Otherwise show search interface
  return (
    <List searchBarPlaceholder="std::vector, std::string, ..." onSearchTextChange={setSearchText} throttle>
      {searchText && (
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={`Search for "${searchText}"`}
          actions={
            <ActionPanel>
              <Action.Push title="Search" target={<SearchResult query={searchText} />} icon={Icon.MagnifyingGlass} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
