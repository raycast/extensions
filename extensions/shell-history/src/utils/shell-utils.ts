import { CliToolType, Shell, ShellHistory, Terminal } from "../types/types";
import path from "path";
import os from "os";
import readLastLines from "read-last-lines";
import { maxLines, removeDuplicates } from "../types/preferences";
import { captureException, Icon, open, showHUD, trash } from "@raycast/api";
import { ITERM2, TERMINAL } from "./constants";
import { runAppleScript } from "@raycast/utils";
import shellQuote from "shell-quote";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const zshHistoryFilePath = path.join(os.homedir(), ".zsh_history");
export const bashHistoryFilePath = path.join(os.homedir(), ".bash_history");
export const fishHistoryFilePath = path.join(os.homedir(), ".local/share/fish/fish_history");

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
export const getShellHistoryFromFiles = async (shell: Shell, maxLineCount: number = parseInt(maxLines, 10)) => {
  let history: ShellHistory[] = [];
  switch (shell) {
    case Shell.ZSH: {
      const commands = await readLastLines.read(zshHistoryFilePath, maxLineCount);
      history = parseZshShellHistory(commands, shell);
      break;
    }
    case Shell.BASH: {
      const commands = await readLastLines.read(bashHistoryFilePath, maxLineCount);
      history = parseBashShellHistory(commands, shell);
      break;
    }
    case Shell.FISH: {
      const commands = await readLastLines.read(fishHistoryFilePath, maxLineCount * 2);
      history = parseFishShellHistory(commands, shell).reverse();
      break;
    }
    default:
      break;
  }
  return removeDuplicates ? removeArrayDuplicates(history.reverse()) : history.reverse();
};

function parseZshShellHistory(content: string, shell: Shell): ShellHistory[] {
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
    });
  }

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
  let firstCli = undefined;
  try {
    const parsedEntries = shellQuote.parse(command);
    if (parsedEntries.length > 0) {
      const shellCommand = parsedEntries[0];
      if (typeof shellCommand === "string") {
        firstCli = { type: CliToolType.COMMAND, value: shellCommand, icon: Icon.Stars };
      } else if ("op" in shellCommand) {
        firstCli = { type: CliToolType.OP, value: shellCommand.op, icon: Icon.PlusMinusDivideMultiply };
      } else if ("comment" in shellCommand) {
        firstCli = { type: CliToolType.COMMENT, value: shellCommand.comment, icon: Icon.Hashtag };
      }
    }
    return { cli: parsedEntries, firstCli: firstCli };
  } catch (e) {
    console.error(e);
  }
  return { cli: [], firstCli: firstCli };
}

export function parseCli(command: string) {
  try {
    const parsedEntries = shellQuote.parse(command);
    return parsedEntries;
  } catch (e) {
    console.error(e);
  }
  return [];
}
