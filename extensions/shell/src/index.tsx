import { useEffect, useRef, useState } from "react";
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
import { usePersistentState } from "raycast-toolkit";
import fs from "fs";
import { runAppleScript } from "run-applescript";

const isWindows = process.platform === "win32";
const envProgramFiles = "${env:ProgramFiles}";
const envProgramFilesX86 = "${env:ProgramFiles(x86)}";
const envLocalAppData = "${env:LocalAppData}";

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

const escapePosixCommand = (command: string) => command.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

const encodePowerShellString = (command: string) => Buffer.from(command, "utf16le").toString("base64");

const escapeForPowerShellSingleQuotes = (command: string) => command.replaceAll("'", "''");

const getPowerShellArgumentList = (escapedCommand: string) =>
  `'-NoLogo','-NoProfile','-NoExit','-Command','${escapedCommand}'`;

const runDetachedPowerShellScript = (script: string) => {
  if (!isWindows) {
    return;
  }

  exec(`powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodePowerShellString(script)}`);
};

const runInPowerShellConsole = (command: string) => {
  const escaped = escapeForPowerShellSingleQuotes(command);
  runDetachedPowerShellScript(`Start-Process PowerShell -ArgumentList ${getPowerShellArgumentList(escaped)}`);
};

const runInCommandPrompt = (command: string) => {
  const escaped = escapeForPowerShellSingleQuotes(command);
  runDetachedPowerShellScript(`Start-Process cmd -ArgumentList '/d','/k','${escaped}'`);
};

const runInPowerShell7Console = (command: string) => {
  const escaped = escapeForPowerShellSingleQuotes(command);
  runDetachedPowerShellScript(`
    $candidatePaths = @(
      "${envProgramFiles}\\PowerShell\\7\\pwsh.exe",
      "${envProgramFiles}\\PowerShell\\7-preview\\pwsh.exe",
      "${envProgramFilesX86}\\PowerShell\\7\\pwsh.exe",
      "${envLocalAppData}\\Microsoft\\WindowsApps\\pwsh.exe"
    )
    $pwshExecutable = $candidatePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $pwshExecutable) {
      $pwshCommand = Get-Command pwsh -ErrorAction SilentlyContinue
      if ($pwshCommand) {
        $pwshExecutable = $pwshCommand.Source
      }
    }
    if ($pwshExecutable) {
      Start-Process -FilePath $pwshExecutable -ArgumentList ${getPowerShellArgumentList(escaped)}
    } else {
      Start-Process PowerShell -ArgumentList ${getPowerShellArgumentList(escaped)}
    }
  `);
};

const WINDOWS_RUNNERS = {
  powershell: {
    runner: runInPowerShellConsole,
    label: "PowerShell",
  },
  powershell7: {
    runner: runInPowerShell7Console,
    label: "PowerShell 7",
  },
  commandprompt: {
    runner: runInCommandPrompt,
    label: "Command Prompt",
  },
} as const;

const WINDOWS_ACTION_ORDER: Array<keyof typeof WINDOWS_RUNNERS> = ["powershell7", "powershell", "commandprompt"];

const getWindowsRunner = (type: string) =>
  WINDOWS_RUNNERS[type as keyof typeof WINDOWS_RUNNERS]?.runner ?? WINDOWS_RUNNERS.powershell.runner;

const getWindowsDisplayName = (type: string) =>
  WINDOWS_RUNNERS[type as keyof typeof WINDOWS_RUNNERS]?.label ?? WINDOWS_RUNNERS.powershell.label;

const resolveShellExecutable = (env: Record<string, string>) => {
  if (isWindows) {
    return env.ComSpec || env.COMSPEC || "cmd.exe";
  }

  return env.SHELL || "/bin/zsh";
};

const resolveWorkingDirectory = (env: Record<string, string>) => {
  return (
    env.PWD ||
    env.HOME ||
    env.USERPROFILE ||
    process.env.PWD ||
    process.env.HOME ||
    process.env.USERPROFILE ||
    (isWindows ? process.cwd() : `/Users/${process.env.USER ?? "raycast"}`)
  );
};

export const getCachedEnv = async () => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = {
    env: env,
    cwd: resolveWorkingDirectory(env),
    shell: resolveShellExecutable(env),
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
      const execOptions = {
        env: execEnv.env,
        cwd: execEnv.cwd,
        shell: isWindows ? execEnv.shell : undefined,
      };
      const shellExecutable = execEnv.shell || process.env.SHELL || "/bin/zsh";
      const commandToRun = isWindows
        ? cmd
        : `"${shellExecutable.replaceAll('"', '\\"')}" -i -c "${escapePosixCommand(cmd)}"`;

      child = exec(commandToRun, execOptions);
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
      markdown={`\`\`\`\n$ ${cmd} \n ${output}\n\`\`\``}
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
  const executedArgumentRef = useRef<string | null>(null);
  const iTermInstalled = fs.existsSync("/Applications/iTerm.app");
  const kittyInstalled = fs.existsSync("/Applications/kitty.app");
  const WarpInstalled = fs.existsSync("/Applications/Warp.app");
  const GhosttyInstalled = fs.existsSync("/Applications/Ghostty.app");

  const addToRecentlyUsed = (command: string) => {
    setRecentlyUsed((list) => (list.find((x) => x === command) ? list : [command, ...list].slice(0, 10)));
  };

  useEffect(() => {
    try {
      const historyEntries = shellHistory().reverse();
      const uniqueHistory = Array.from(new Set(historyEntries)).filter((entry) => entry.trim().length > 0);
      setHistory(uniqueHistory as string[]);
    } catch (error) {
      console.error("Failed to load shell history", error);
      setHistory([]);
    }
  }, []);

  const { arguments_terminal_type: terminalType, arguments_terminal: openInTerminal } =
    getPreferenceValues<Preferences>();
  const normalizedTerminalType = (terminalType?.toLowerCase?.() ?? (isWindows ? "powershell" : "terminal")) as string;

  const getTerminalDisplayName = () => {
    if (isWindows) {
      return getWindowsDisplayName(normalizedTerminalType);
    }

    switch (normalizedTerminalType) {
      case "iterm":
        return "iTerm";
      case "kitty":
        return "Kitty";
      case "warp":
        return "Warp";
      case "ghostty":
        return "Ghostty";
      default:
        return "Terminal";
    }
  };

  const openCommandInPreferredTerminal = (command: string) => {
    if (isWindows) {
      const runner = getWindowsRunner(normalizedTerminalType);
      runner(command);
      return;
    }

    switch (normalizedTerminalType) {
      case "kitty":
        runInKitty(command);
        break;
      case "iterm":
        runInIterm(command);
        break;
      case "warp":
        runInWarp(command);
        break;
      case "ghostty":
        runInGhostty(command);
        break;
      default:
        runInTerminal(command);
        break;
    }
  };

  const handleExternalRun = (command: string, runner: (value: string) => void) => {
    closeMainWindow();
    popToRoot();
    addToRecentlyUsed(command);
    runner(command);
  };

  useEffect(() => {
    if (!props.arguments?.command || !openInTerminal) {
      return;
    }

    const commandArgument = props.arguments.command;
    const executionKey = `${normalizedTerminalType}:${commandArgument}`;
    if (executedArgumentRef.current === executionKey) {
      return;
    }
    executedArgumentRef.current = executionKey;

    addToRecentlyUsed(commandArgument);
    showHUD(`Ran command in ${getTerminalDisplayName()}`);
    openCommandInPreferredTerminal(commandArgument);
    closeMainWindow();
    popToRoot();
  }, [props.arguments?.command, openInTerminal, normalizedTerminalType]);

  if (props.arguments?.command) {
    if (openInTerminal) {
      return null;
    }
    return <Result cmd={props.arguments.command} />;
  }

  const categories: { category: string; items: string[] }[] = [];

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
      category: "Shell History",
      items: history.filter((item) => item.includes(cmd)).slice(0, 50),
    });
  }

  return (
    <List
      isLoading={history === undefined}
      onSearchTextChange={setCmd}
      searchText={cmd}
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
                  {recentlyUsed.length >= index ? (
                    <Action
                      title="Edit executed command"
                      icon={Icon.Pencil}
                      onAction={() => {
                        setCmd(command);
                      }}
                    />
                  ) : null}
                  {!isWindows && (
                    <>
                      {kittyInstalled ? (
                        <Action
                          title="Execute in kitty.app"
                          icon={{ fileIcon: "/Applications/kitty.app" }}
                          onAction={() => handleExternalRun(command, runInKitty)}
                        />
                      ) : null}
                      {iTermInstalled ? (
                        <Action
                          title="Execute in iTerm.app"
                          icon={{ fileIcon: "/Applications/iTerm.app" }}
                          onAction={() => handleExternalRun(command, runInIterm)}
                        />
                      ) : null}
                      {GhosttyInstalled ? (
                        <Action
                          title="Execute in Ghostty.app"
                          icon={{ fileIcon: "/Applications/Ghostty.app" }}
                          onAction={() => handleExternalRun(command, runInGhostty)}
                        />
                      ) : null}
                      {WarpInstalled ? (
                        <Action
                          title="Execute in Warp.app"
                          icon={{ fileIcon: "/Applications/Warp.app" }}
                          onAction={() => handleExternalRun(command, runInWarp)}
                        />
                      ) : null}
                      <Action
                        title="Execute in Terminal.app"
                        icon={{ fileIcon: "/System/Applications/Utilities/Terminal.app" }}
                        onAction={() => handleExternalRun(command, runInTerminal)}
                      />
                    </>
                  )}
                  {isWindows &&
                    WINDOWS_ACTION_ORDER.map((key) => {
                      const option = WINDOWS_RUNNERS[key];
                      return (
                        <Action
                          key={key}
                          title={`Execute in ${option.label}`}
                          icon={Icon.Terminal}
                          onAction={() => handleExternalRun(command, option.runner)}
                        />
                      );
                    })}
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
