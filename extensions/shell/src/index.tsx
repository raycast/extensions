import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  showHUD,
  Toast,
  showToast,
} from "@raycast/api";
import { shellHistory } from "shell-history";
import { shellEnv } from "shell-env";
import { ChildProcess, exec } from "child_process";
import { runAppleScript } from "run-applescript";
import { usePersistentState } from "raycast-toolkit";
import fs from "fs";

export interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

interface ShellArguments {
  command: string;
}
interface Preferences {
  arguments_terminal: boolean;
  arguments_terminal_type: string;
}

let cachedEnv: null | EnvType = null;

export const getCachedEnv = async () => {
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

const Result = ({ cmd }: { cmd: string }) => {
  const [output, setOutput] = useState<string>("");
  const [finished, setFinished] = useState<boolean>(false);

  useEffect(() => {
    let killed = false;
    let child: ChildProcess | null = null;

    const runCommand = async () => {
      const execEnv = await getCachedEnv();
      child = exec(`$SHELL -i -c "${cmd}"`, execEnv);
      child.stderr?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput(data);
        showToast({
          style: Toast.Style.Failure,
          title: "Error executing command",
        });
        return;
      });
      child.stdout?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        showToast({
          style: Toast.Style.Animated,
          title: "Executing command...",
        });
        setOutput(data);
      });
      child.on("exit", () => {
        showToast({
          style: Toast.Style.Success,
          title: "Command execution complete",
        });
        setFinished(true);
      });
    };
    runCommand();

    return function cleanup() {
      killed = true;
      if (child !== null) {
        child.kill("SIGTERM");
      }
    };
  }, [cmd, setOutput, setFinished]);

  return (
    <Detail
      markdown={"```\n$ " + cmd + " \n" + output + "\n```"}
      isLoading={!finished}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={output} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
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

export default function Command(props: { arguments?: ShellArguments }) {
  const [cmd, setCmd] = useState<string>("");
  const [history, setHistory] = useState<string[]>();
  const [recentlyUsed, setRecentlyUsed] = usePersistentState<string[]>("recently-used", []);
  const iTermInstalled = fs.existsSync("/Applications/iTerm.app");
  const kittyInstalled = fs.existsSync("/Applications/kitty.app");
  const WarpInstalled = fs.existsSync("/Applications/Warp.app");
  const GhosttyInstalled = fs.existsSync("/Applications/Ghostty.app");

  const addToRecentlyUsed = (command: string) => {
    setRecentlyUsed((list) => (list.find((x) => x === command) ? list : [command, ...list].slice(0, 10)));
  };

  useEffect(() => {
    setHistory([...new Set(shellHistory().reverse())] as string[]);
  }, [setHistory]);

  const { arguments_terminal_type: terminalType, arguments_terminal: openInTerminal } =
    getPreferenceValues<Preferences>();

  useEffect(() => {
    if (props.arguments?.command && openInTerminal) {
      addToRecentlyUsed(props.arguments.command);
      showHUD("Ran command in " + terminalType);
      popToRoot();
      closeMainWindow();
      switch (terminalType) {
        case "kitty":
          runInKitty(props.arguments.command);
          break;

        case "iTerm":
          runInIterm(props.arguments.command);
          break;

        case "Warp":
          runInWarp(props.arguments.command);
          break;

        case "Ghostty":
          runInGhostty(props.arguments.command);
          break;

        default:
          runInTerminal(props.arguments.command);
          break;
      }
    }
  }, [props.arguments]);

  if (props.arguments?.command) {
    if (openInTerminal) {
      return null;
    }
    return <Result cmd={props.arguments.command} />;
  }

  const categories = [];

  if (cmd) {
    categories.push({
      category: "New command",
      items: [cmd],
    });
  }

  if (recentlyUsed.length > 0) {
    categories.push({
      category: "Raycast History",
      items: recentlyUsed.filter((item) => item.includes(cmd)).slice(0, 50),
    });
  }

  if (history !== undefined && history.length > 0) {
    categories.push({
      category: "Bash History",
      items: history.filter((item) => item.includes(cmd)).slice(0, 50),
    });
  }

  return (
    <List
      isLoading={history === undefined}
      enableFiltering={false}
      onSearchTextChange={setCmd}
      navigationTitle="Shell command"
      searchBarPlaceholder="Enter shell-command"
    >
      {categories.map((category) => (
        <List.Section title={category.category} key={category.category}>
          {category.items.map((command, index) => (
            <List.Item
              icon={Icon.Terminal}
              title={command}
              key={index}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Execute"
                    icon={Icon.List}
                    onPush={() => addToRecentlyUsed(command)}
                    target={<Result cmd={command} />}
                  />
                  {kittyInstalled ? (
                    <Action
                      title="Execute in kitty.app"
                      icon={{ fileIcon: "/Applications/kitty.app" }}
                      onAction={() => {
                        closeMainWindow();
                        popToRoot();
                        addToRecentlyUsed(command);
                        runInKitty(command);
                      }}
                    />
                  ) : null}
                  {iTermInstalled ? (
                    <Action
                      title="Execute in iTerm.app"
                      icon={{ fileIcon: "/Applications/iTerm.app" }}
                      onAction={() => {
                        closeMainWindow();
                        popToRoot();
                        addToRecentlyUsed(command);
                        runInIterm(command);
                      }}
                    />
                  ) : null}
                  {GhosttyInstalled ? (
                    <Action
                      title="Execute in Ghostty.app"
                      icon={{ fileIcon: "/Applications/Ghostty.app" }}
                      onAction={() => {
                        closeMainWindow();
                        popToRoot();
                        addToRecentlyUsed(command);
                        runInGhostty(command);
                      }}
                    />
                  ) : null}
                  {WarpInstalled ? (
                    <Action
                      title="Execute in Warp.app"
                      icon={{ fileIcon: "/Applications/Warp.app" }}
                      onAction={() => {
                        closeMainWindow();
                        popToRoot();
                        addToRecentlyUsed(command);
                        runInWarp(command);
                      }}
                    />
                  ) : null}
                  <Action
                    title="Execute in Terminal.app"
                    icon={{ fileIcon: "/System/Applications/Utilities/Terminal.app" }}
                    onAction={() => {
                      closeMainWindow();
                      popToRoot();
                      addToRecentlyUsed(command);
                      runInTerminal(command);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy to Clipboard"
                    content={command}
                    onCopy={() => {
                      addToRecentlyUsed(command);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
