import { CliToolType, Shell, ShellHistory, Terminal } from "../types/types";
import path from "path";
import os from "os";
import readLastLines from "read-last-lines";
import { maxLines, removeDuplicates } from "../types/preferences";
import { captureException, Icon, open, showHUD } from "@raycast/api";
import { ITERM2, TERMINAL } from "./constants";
import { runAppleScript } from "@raycast/utils";
import shellQuote from "shell-quote";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const zshHistoryFilePath = path.join(os.homedir(), ".zsh_history");
export const bashHistoryFilePath = path.join(os.homedir(), ".bash_history");
export const fishHistoryFilePath = path.join(os.homedir(), ".local/share/fish/fish_history");

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
export const getShellHistoryFromFiles = async (shell: Shell, maxLineCount: number = parseInt(maxLines, 10)) => {
  let shellHistoryFilePath;

  switch (shell) {
    case Shell.ZSH:
      shellHistoryFilePath = zshHistoryFilePath;
      break;
    case Shell.BASH:
      shellHistoryFilePath = bashHistoryFilePath;
      break;
    case Shell.FISH:
      shellHistoryFilePath = fishHistoryFilePath;
      break;
    default:
      shellHistoryFilePath = "";
  }
  if (shell === Shell.ZSH || shell === Shell.BASH) {
    const commands = await readLastLines.read(shellHistoryFilePath, maxLineCount);
    const shellHistoryArray = parseShellHistory(commands, shell);
    return removeDuplicates ? removeArrayDuplicates(shellHistoryArray.reverse()) : shellHistoryArray.reverse();
  } else {
    const commands = await readLastLines.read(shellHistoryFilePath, maxLineCount * 2);
    return parseFishShellHistory(commands, shell).reverse();
  }
};

function parseShellHistory(content: string, shell: Shell): ShellHistory[] {
  const history: ShellHistory[] = [];
  const commands = content.split("\n").filter((line) => line.trim() !== "");

  commands.forEach((line) => {
    const match = line.match(/^:\s*(\d+):\d+;(.*)$/);
    if (match) {
      const [, timestamp, command] = match;
      history.push({
        command: command.trim(),
        timestamp: parseInt(timestamp, 10) * 1000,
        shell: shell,
      });
    } else {
      history.push({
        command: line.trim(),
        timestamp: undefined,
        shell: shell,
      });
    }
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
      };

      history.push(commandHistory);
    }
  }

  return history;
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
    await showHUD(`🚨 ${ret}`);
  } else {
    await showHUD(`🚀 Run '${command}' in ${terminal.application.name}`);
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

export function extractCliTool(command: string) {
  try {
    const parsedEntries = shellQuote.parse(command);
    if (parsedEntries.length > 0) {
      const shellCommand = parsedEntries[0];
      if (typeof shellCommand === "string") {
        return { type: CliToolType.COMMAND, value: shellCommand, icon: Icon.Stars };
      } else if ("op" in shellCommand) {
        return { type: CliToolType.OP, value: shellCommand.op, icon: Icon.PlusMinusDivideMultiply };
      } else if ("comment" in shellCommand) {
        return { type: CliToolType.COMMENT, value: shellCommand.comment, icon: Icon.Hashtag };
      } else {
        return undefined;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return undefined;
}
