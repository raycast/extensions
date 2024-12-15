import { Cli, CliType, Shell, ShellHistory, Terminal } from "../types/types";
import path from "path";
import os from "os";
import readLastLines from "read-last-lines";
import { maxLines, removeDuplicates, historyTimestamp } from "../types/preferences";
import { captureException, Icon, open, showToast, Toast, trash } from "@raycast/api";
import { ITERM2, TERMINAL } from "./constants";
import { runAppleScript } from "@raycast/utils";
import shellQuote from "shell-quote";
import { showCustomHud, truncate } from "./common-utils";

export const zshHistoryFilePath = path.join(os.homedir(), ".zsh_history");
export const bashHistoryFilePath = path.join(os.homedir(), ".bash_history");
export const fishHistoryFilePath = path.join(os.homedir(), ".local/share/fish/fish_history");

export function getShellHistoryPath(shell: Shell) {
  if (shell === Shell.ZSH) {
    return zshHistoryFilePath;
  } else if (shell === Shell.BASH) {
    return bashHistoryFilePath;
  } else if (shell === Shell.FISH) {
    return fishHistoryFilePath;
  }
}

export async function clearShellHistory(shell: Shell) {
  if (shell === Shell.ZSH) {
    await trash(zshHistoryFilePath);
  } else if (shell === Shell.BASH) {
    await trash(bashHistoryFilePath);
  } else if (shell === Shell.FISH) {
    await trash(fishHistoryFilePath);
  }
}

export const getShellIcon = (shell: Shell) => {
  switch (shell) {
    case Shell.ZSH:
      return "zsh.png";
    case Shell.BASH:
      return "bash.png";
    case Shell.FISH:
      return "fish.png";
    default:
      return "shell-history-icon.png";
  }
};

export async function getShellHistoryZshFromFiles(maxLineCount: number = parseInt(maxLines, 10)) {
  try {
    const commands = await readLastLines.read(zshHistoryFilePath, maxLineCount);
    const history = parseZshShellHistory(commands, Shell.ZSH);
    return removeDuplicates ? removeArrayDuplicates(history.reverse()) : history.reverse();
  } catch (e) {
    console.error(`${Shell.ZSH} ${e}`);
  }
  return [];
}

export async function getShellHistoryBashFromFiles(maxLineCount: number = parseInt(maxLines, 10)) {
  try {
    const commands = await readLastLines.read(bashHistoryFilePath, maxLineCount);
    const history = parseBashShellHistory(commands, Shell.BASH);
    return removeDuplicates ? removeArrayDuplicates(history.reverse()) : history.reverse();
  } catch (e) {
    console.error(`${Shell.BASH} ${e}`);
  }
  return [];
}

export async function getShellHistoryFishFromFiles(maxLineCount: number = parseInt(maxLines, 10)) {
  try {
    const commands = await readLastLines.read(fishHistoryFilePath, maxLineCount);
    const history = parseFishShellHistory(commands, Shell.FISH);
    return removeDuplicates ? removeArrayDuplicates(history.reverse()) : history.reverse();
  } catch (e) {
    console.error(`${Shell.FISH} ${e}`);
  }
  return [];
}

function parseZshShellHistory(content: string, shell: Shell): ShellHistory[] {
  let history: ShellHistory[] = [];

  if (historyTimestamp) {
    history = parseZshShellHistoryWithTimestamp(content, shell);
  } else {
    history = parseZshShellHistoryWithoutTimestamp(content, shell);
  }

  // double check if the history is not parsed correctly
  if (history.length === 1 && content.split("\n").length > 1) {
    history = parseZshShellHistoryWithoutTimestamp(content, shell);
  }

  return history;
}

function parseZshShellHistoryWithTimestamp(content: string, shell: Shell): ShellHistory[] {
  const history: ShellHistory[] = [];
  let commandBuffer: string = "";
  let timestamp: number | undefined = undefined;

  const lines = content.split("\n").filter((line) => line.trim() !== "");
  lines.forEach((line) => {
    const match = line.match(/^:\s*(\d+):\d+;(.*)$/);

    if (match) {
      if (commandBuffer) {
        history.push({
          command: commandBuffer.trim(),
          timestamp: timestamp,
          shell: shell,
          cli: parseCliTool(commandBuffer.trim()),
        });
      }
      timestamp = parseInt(match[1], 10) * 1000;
      commandBuffer = match[2];
    } else {
      commandBuffer += "\n" + line;
    }
  });

  if (commandBuffer) {
    history.push({
      command: commandBuffer.trim(),
      timestamp: timestamp,
      shell: shell,
      cli: parseCliTool(commandBuffer.trim()),
    });
  }
  return history;
}

function parseZshShellHistoryWithoutTimestamp(content: string, shell: Shell): ShellHistory[] {
  const history: ShellHistory[] = [];
  content
    .split("\n")
    .filter((line) => line.trim() !== "")
    .forEach((line) => {
      const match = line.match(/^:\s*(\d+):\d+;(.*)$/);
      if (match) {
        history.push({
          command: match[2].trim(),
          timestamp: parseInt(match[1], 10) * 1000,
          shell: shell,
          cli: parseCliTool(match[2].trim()),
        });
      } else {
        history.push({
          command: line.trim(),
          timestamp: undefined,
          shell: shell,
          cli: parseCliTool(line.trim()),
        });
      }
    });
  return history;
}

function parseBashShellHistory(content: string, shell: Shell): ShellHistory[] {
  const history: ShellHistory[] = [];
  const commands = content.split("\n").filter((line) => line.trim() !== "");

  commands.forEach((line) => {
    history.push({
      command: line.trim(),
      timestamp: undefined,
      shell: shell,
      cli: parseCliTool(line.trim()),
    });
  });

  return history;
}

function parseFishShellHistory(content: string, shell: Shell): ShellHistory[] {
  const history: ShellHistory[] = [];

  const entries = content.trim().split(/(?=- cmd:)/);

  for (const entry of entries) {
    const cmdMatch = /- cmd: (.+)/.exec(entry);
    const whenMatch = /when: (\d+)/.exec(entry);

    if (cmdMatch && whenMatch) {
      const command = cmdMatch[1].trim();
      const timestamp = parseInt(whenMatch[1], 10) * 1000;

      const commandHistory = {
        command: command,
        timestamp: timestamp,
        shell: shell,
        cli: parseCliTool(command.trim()),
      };

      history.push(commandHistory);
    }
  }

  return removeDuplicates ? removeArrayDuplicates(history.reverse()) : history.reverse();
}

function removeArrayDuplicates(history: ShellHistory[]) {
  const uniqueCommands = new Set<string>();
  return history.filter((entry) => {
    if (uniqueCommands.has(entry.command)) {
      return false;
    } else {
      uniqueCommands.add(entry.command);
      return true;
    }
  });
}

export const runShellCommand = async (command: string, terminal: Terminal) => {
  let ret;
  try {
    await open(terminal.application.path);
    if (terminal.supportInput) {
      const script = runCommandInTerminalScript(command, terminal);
      ret = await runAppleScript(script);
    } else {
      ret = await runAppleScript(pressDownEnterScript(command, terminal));
    }
  } catch (e) {
    captureException(e);
    ret = e;
  }
  if (ret) {
    await showToast({ title: String(ret), style: Toast.Style.Failure });
  } else {
    await showCustomHud(`🚀 Run '${command}' in ${terminal.application.name}`);
  }
};

function runCommandInTerminalScript(command: string, terminal: Terminal) {
  let script: string;
  switch (terminal.application.path) {
    case TERMINAL:
      script = `
try
	tell application "${terminal.application.name}"
		activate
		if (count of windows) is 0 then
			do script "${command}"
		else
			do script "${command}" in window 1
		end if
	end tell
	return ""
on error errMsg
	return errMsg
end try
      `;
      break;
    case ITERM2:
      script = `
tell application "${terminal.application.name}"
	activate
	try
		set currentWindow to current window
		tell current session of currentWindow
			write text "${command}"
		end tell
	on error
		create window with default profile
		tell current session of current window
			write text "${command}"
		end tell
	end try
end tell
      `;
      break;
    default:
      script = "";
      break;
  }
  return script;
}

function pressDownEnterScript(command: string, term: Terminal) {
  return `
tell application "${term.application.name}"
  activate
  delay 0.5
  tell application "System Events"
    keystroke "${command}" 
    key code 36
  end tell
end tell
  `;
}

export const getCliIcon = (cliType: CliType | undefined) => {
  switch (cliType) {
    case CliType.CliTool:
      return Icon.Stars;
    case CliType.Operation:
      return Icon.PlusMinusDivideMultiply;
    case CliType.Comment:
      return Icon.Hashtag;
    default:
      return Icon.QuestionMark;
  }
};

export function parseCliTool(command: string): Cli[] {
  try {
    const parsedEntries = shellQuote.parse(command);
    return parseToCliArray(parsedEntries);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function parseToCliArray(arr: (string | { op?: string; comment?: string })[]): Cli[] {
  return arr.map((item) => {
    if (typeof item === "string") {
      return {
        type: CliType.CliTool,
        command: truncate(item),
      };
    } else if (typeof item === "object" && item !== null) {
      if (item.op) {
        return {
          type: CliType.Operation,
          command: truncate(item.op),
        };
      } else if (item.comment) {
        return {
          type: CliType.Comment,
          command: truncate(item.comment),
        };
      }
    }
    return {
      type: CliType.Unknown,
      command: String(item),
    };
  });
}
