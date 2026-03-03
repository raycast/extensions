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
import { ChildProcess, exec, spawnSync } from "child_process";
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

const CMUX_APP_PATH = "/Applications/cmux.app";
const CMUX_CLI_PATH = "/Applications/cmux.app/Contents/Resources/bin/cmux";
const CMUX_DEFAULT_SOCKET_PATH = "/tmp/cmux.sock";
const CMUX_BUNDLE_ID = "com.cmuxterm.app";
const CMUX_SOCKET_MODES = {
  cmuxOnly: "cmuxonly",
  password: "password",
  external: "external",
} as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isSocketPath = (path: string) => {
  try {
    return fs.statSync(path).isSocket();
  } catch {
    return false;
  }
};

const redactSecrets = (text: string, secrets: Array<string | undefined>) => {
  let sanitized = text;
  for (const secret of secrets) {
    if (!secret) {
      continue;
    }
    sanitized = sanitized.split(secret).join("[REDACTED]");
  }
  return sanitized;
};

const getCommandError = (result: { stderr?: string; stdout?: string; status: number | null }, secrets: string[] = []) => {
  const stderr = result?.stderr?.toString().trim() || "";
  if (stderr) {
    return redactSecrets(stderr, secrets);
  }

  const stdout = result?.stdout?.toString().trim() || "";
  if (stdout) {
    return redactSecrets(stdout, secrets);
  }

  return `Process exited with code ${result?.status ?? "unknown"}`;
};

const showCmuxFailure = (title: string, message: string) => {
  showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
};

const resolveCmuxSocketPath = (configuredSocketPath?: string) => {
  const preferredSocketPath = configuredSocketPath?.trim();
  if (preferredSocketPath) {
    return preferredSocketPath;
  }
  if (process.env.CMUX_SOCKET_PATH?.trim()) {
    return process.env.CMUX_SOCKET_PATH.trim();
  }
  return CMUX_DEFAULT_SOCKET_PATH;
};

const readCmuxSocketMode = () => {
  const result = spawnSync("/usr/bin/defaults", ["read", CMUX_BUNDLE_ID, "socketControlMode"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return "";
  }
  return result.stdout.trim().toLowerCase();
};

const runCmuxCli = (
  args: string[],
  options?: {
    socketPath?: string;
    password?: string;
    json?: boolean;
  },
) => {
  const fullArgs: string[] = [];
  if (options?.socketPath) {
    fullArgs.push("--socket", options.socketPath);
  }
  if (options?.json) {
    fullArgs.push("--json");
  }
  fullArgs.push(...args);

  const env = { ...process.env };
  if (options?.password) {
    env.CMUX_SOCKET_PASSWORD = options.password;
  }
  return spawnSync(CMUX_CLI_PATH, fullArgs, { encoding: "utf8", env });
};

const getCmuxAuthAttempts = (socketMode: string, extensionPassword?: string) => {
  const password = extensionPassword?.trim() || "";
  if (socketMode === CMUX_SOCKET_MODES.password) {
    return [{ password: undefined as string | undefined }, ...password ? [{ password }] : []];
  }
  return [{ password: undefined as string | undefined }];
};

const waitForCmuxConnection = async (socketPath: string, authAttempts: Array<{ password?: string }>) => {
  let lastError = "";
  for (let i = 0; i < 20; i++) {
    if (isSocketPath(socketPath)) {
      for (const authAttempt of authAttempts) {
        const pingResult = runCmuxCli(["ping"], { socketPath, password: authAttempt.password });
        if (pingResult.status === 0) {
          return { ok: true as const, authPassword: authAttempt.password };
        }
        lastError = getCommandError(pingResult, [authAttempt.password ?? ""]);
      }
    }
    await sleep(200);
  }

  return {
    ok: false as const,
    error: lastError || `Unable to connect to cmux socket at ${socketPath}`,
  };
};

const readWorkspaceFromOutput = (rawOutput: string) => {
  const text = rawOutput.trim();
  if (!text) {
    return "";
  }

  const refMatch = text.match(/workspace:\d+/);
  if (refMatch?.[0]) {
    return refMatch[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "";
  }

  const candidates: string[] = [];
  const collectValues = (value: unknown) => {
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === "string") {
      candidates.push(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        collectValues(entry);
      }
      return;
    }
    if (typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === "string" && ["workspace", "workspaceRef", "workspaceId", "id", "ref"].includes(key)) {
          candidates.push(entry.trim());
        }
        collectValues(entry);
      }
    }
  };
  collectValues(parsed);

  const workspaceRef = candidates.find((value) => value.startsWith("workspace:"));
  if (workspaceRef) {
    return workspaceRef;
  }

  const uuidValue = candidates.find((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
  return uuidValue || "";
};

const getCurrentWorkspace = (socketPath: string, authPassword?: string) => {
  const workspaceResult = runCmuxCli(["current-workspace"], { socketPath, password: authPassword, json: true });
  if (workspaceResult.status !== 0) {
    return {
      ok: false as const,
      error: getCommandError(workspaceResult, [authPassword ?? ""]),
    };
  }
  const workspace = readWorkspaceFromOutput(workspaceResult.stdout || "");
  if (!workspace) {
    return {
      ok: false as const,
      error: "Could not resolve active workspace from cmux output.",
    };
  }
  return { ok: true as const, workspace };
};

const runInCmux = async (
  command: string,
  options?: {
    runMode?: "activeWorkspace" | "newWorkspace";
    socketPathPreference?: string;
    socketPassword?: string;
  },
) => {
  if (!fs.existsSync(CMUX_APP_PATH) || !fs.existsSync(CMUX_CLI_PATH)) {
    showCmuxFailure("cmux is not installed", `Install cmux at ${CMUX_APP_PATH} before using this terminal target.`);
    return false;
  }

  const socketMode = readCmuxSocketMode();
  const socketPath = resolveCmuxSocketPath(options?.socketPathPreference);
  if (socketMode === CMUX_SOCKET_MODES.cmuxOnly) {
    showCmuxFailure(
      "cmux socket mode blocks external clients",
      "Set cmux socket mode to external or password in cmux settings.",
    );
    return false;
  }

  const launchResult = spawnSync("/usr/bin/open", ["-a", "cmux"], { encoding: "utf8" });
  if (launchResult.status !== 0) {
    showCmuxFailure("Could not launch cmux", getCommandError(launchResult));
    return false;
  }

  const authAttempts = getCmuxAuthAttempts(socketMode, options?.socketPassword);
  const connectionResult = await waitForCmuxConnection(socketPath, authAttempts);
  if (!connectionResult.ok) {
    showCmuxFailure(
      "cmux is not ready",
      connectionResult.error ||
        "Could not authenticate to cmux. If password mode is enabled, verify keychain access or set extension password override.",
    );
    return false;
  }

  if ((options?.runMode ?? "activeWorkspace") === "newWorkspace") {
    const newWorkspaceResult = runCmuxCli(["new-workspace", "--command", command], {
      socketPath,
      password: connectionResult.authPassword,
    });
    if (newWorkspaceResult.status !== 0) {
      showCmuxFailure(
        "Failed to run command in new cmux workspace",
        getCommandError(newWorkspaceResult, [connectionResult.authPassword ?? ""]),
      );
      return false;
    }
    return true;
  }

  const workspaceResult = getCurrentWorkspace(socketPath, connectionResult.authPassword);
  if (!workspaceResult.ok) {
    showCmuxFailure(
      "Failed to resolve active cmux workspace",
      `${workspaceResult.error} Try switching run mode to 'New Workspace'.`,
    );
    return false;
  }

  const sendResult = runCmuxCli(["send", "--workspace", workspaceResult.workspace, command], {
    socketPath,
    password: connectionResult.authPassword,
  });
  if (sendResult.status !== 0) {
    showCmuxFailure(
      "Failed to send command to active cmux workspace",
      `${getCommandError(sendResult, [connectionResult.authPassword ?? ""])}. Try switching run mode to 'New Workspace' or adjust cmux socket mode.`,
    );
    return false;
  }

  const enterResult = runCmuxCli(["send-key", "--workspace", workspaceResult.workspace, "enter"], {
    socketPath,
    password: connectionResult.authPassword,
  });
  if (enterResult.status !== 0) {
    showCmuxFailure(
      "Failed to submit command in cmux",
      getCommandError(enterResult, [connectionResult.authPassword ?? ""]),
    );
    return false;
  }
  return true;
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
  const cmuxInstalled = fs.existsSync(CMUX_APP_PATH);

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

  const {
    arguments_terminal_type: terminalType,
    arguments_terminal: openInTerminal,
    cmux_run_mode: cmuxRunModePreference,
    cmux_socket_path: cmuxSocketPathPreference,
    cmux_socket_password: cmuxSocketPassword,
  } = getPreferenceValues<Preferences>();
  const cmuxRunMode = cmuxRunModePreference === "newWorkspace" ? "newWorkspace" : "activeWorkspace";
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
      case "cmux":
        return "cmux";
      default:
        return "Terminal";
    }
  };

  const openCommandInPreferredTerminal = async (command: string) => {
    if (isWindows) {
      const runner = getWindowsRunner(normalizedTerminalType);
      runner(command);
      return true;
    }

    switch (normalizedTerminalType) {
      case "kitty":
        runInKitty(command);
        return true;
      case "iterm":
        runInIterm(command);
        return true;
      case "warp":
        runInWarp(command);
        return true;
      case "ghostty":
        runInGhostty(command);
        return true;
      case "cmux":
        return await runInCmux(command, {
          runMode: cmuxRunMode,
          socketPathPreference: cmuxSocketPathPreference,
          socketPassword: cmuxSocketPassword,
        });
      default:
        runInTerminal(command);
        return true;
    }
  };

  const handleExternalRun = async (command: string, runner: (value: string) => void | Promise<boolean>) => {
    closeMainWindow();
    popToRoot();
    addToRecentlyUsed(command);
    await Promise.resolve(runner(command));
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
    (async () => {
      const didRun = await openCommandInPreferredTerminal(commandArgument);
      if (didRun) {
        showHUD(`Ran command in ${getTerminalDisplayName()}`);
      }
      closeMainWindow();
      popToRoot();
    })();
  }, [
    props.arguments?.command,
    openInTerminal,
    normalizedTerminalType,
    cmuxRunMode,
    cmuxSocketPathPreference,
    cmuxSocketPassword,
  ]);

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
                      {cmuxInstalled ? (
                        <Action
                          title="Execute in cmux.app"
                          icon={{ fileIcon: CMUX_APP_PATH }}
                          onAction={() =>
                            handleExternalRun(command, (cmd) =>
                              runInCmux(cmd, {
                                runMode: cmuxRunMode,
                                socketPathPreference: cmuxSocketPathPreference,
                                socketPassword: cmuxSocketPassword,
                              }),
                            )
                          }
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
