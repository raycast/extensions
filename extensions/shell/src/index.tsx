import { useEffect, useState } from "react";
import { ActionPanel, Detail, List, Action, Icon, closeMainWindow, popToRoot } from "@raycast/api";
import { shellHistory } from "shell-history";
import { shellEnv } from "shell-env";
import { exec, ChildProcess } from "child_process";
import { runAppleScript } from "run-applescript";
import { usePersistentState } from "raycast-toolkit";
import fs from "fs";
interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
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

const Result = ({ cmd }: { cmd: string }) => {
  const [output, setOutput] = useState<string>("");
  const [finished, setFinished] = useState<boolean>(false);

  useEffect(() => {
    let killed = false;
    let child: ChildProcess | null = null;

    const runCommand = async () => {
      const execEnv = await getCachedEnv();
      child = exec(cmd, execEnv);
      child.stderr?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput((out) => `${out}${data}`);
      });
      child.stdout?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput((out) => `${out}${data}`);
      });
      child.on("exit", () => {
        if (killed) {
          return;
        }
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
    	-- Open the command in the current session unless it has a running command, e.g., ssh or top
    	if is_processing() then
    		if open_in_new_window then
    			new_window()
    		else
    			new_tab()
    		end if
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

const runInTerminal = (command: string) => {
  const script = `
  tell application "Terminal"
    do script "${command.replaceAll('"', '\\"')}"
    activate
  end tell
  `;

  runAppleScript(script);
};

export default function Command() {
  const [cmd, setCmd] = useState<string>("");
  const [history, setHistory] = useState<string[]>();
  const [recentlyUsed, setRecentlyUsed] = usePersistentState<string[]>("recently-used", []);
  const iTermInstalled = fs.existsSync("/Applications/iTerm.app");

  const addToRecentlyUsed = (command: string) => {
    setRecentlyUsed((list) => (list.find((x) => x === command) ? list : [command, ...list].slice(0, 10)));
  };

  useEffect(() => {
    setHistory([...new Set(shellHistory().reverse())] as string[]);
  }, [setHistory]);

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
                  {iTermInstalled ? (
                    <Action
                      title="Execute in iTerm.app"
                      icon={Icon.Window}
                      onAction={() => {
                        closeMainWindow();
                        popToRoot();
                        addToRecentlyUsed(command);
                        runInIterm(command);
                      }}
                    />
                  ) : null}
                  <Action
                    title="Execute in Terminal.app"
                    icon={Icon.Window}
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
