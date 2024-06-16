import { Shell, ShellHistory } from "../types/types";
import path from "path";
import os from "os";
import readLastLines from "read-last-lines";
import { maxLines, removeDuplicates } from "../types/preferences";
import { Application, captureException, open, showHUD } from "@raycast/api";
import { ITERM2, TERMINAL } from "./constants";
import { runAppleScript } from "@raycast/utils";
import shellQuote from "shell-quote";

export const zshHistoryFilePath = path.join(os.homedir(), ".zsh_history");
export const bashHistoryFilePath = path.join(os.homedir(), ".bash_history");

export const getShellHistoryFromFiles = async (shell: Shell, maxLineCount: number = parseInt(maxLines, 10)) => {
  let shellHistoryFilePath;
  if (shell === Shell.ZSH) {
    shellHistoryFilePath = zshHistoryFilePath;
  } else {
    shellHistoryFilePath = bashHistoryFilePath;
  }

  const lines = await readLastLines.read(shellHistoryFilePath, maxLineCount);
  const shellHistoryArray = parseShellHistory(lines, shell);
  return removeDuplicates ? removeArrayDuplicates(shellHistoryArray.reverse()) : shellHistoryArray.reverse();
};

function parseShellHistory(content: string, shell: Shell): ShellHistory[] {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  const history: ShellHistory[] = [];

  lines.forEach((line) => {
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

export const runShellCommand = async (command: string, terminal: Application) => {
  let ret;
  try {
    const script = runCommandInTerminalScript(command, terminal);
    await open(terminal.path);
    ret = await runAppleScript(script);
  } catch (e) {
    captureException(e);
    ret = e;
  }
  if (ret) {
    await showHUD(`🚨 ${ret}`);
  } else {
    await showHUD(`🚀 Run '${command}' executed in ${terminal.name}`);
  }
};

function runCommandInTerminalScript(command: string, terminal: Application) {
  let script: string;
  switch (terminal.path) {
    case TERMINAL:
      script = `
        tell application "${terminal.name}"
          do script "${command}"
          activate
        end tell
      `;
      break;
    case ITERM2:
      script = `
        tell application "${terminal.name}"
          create window with default profile
          tell the current session of current window
            write text "${command}"
          end tell
          activate
        end tell
      `;
      break;
    default:
      script = "";
      break;
  }
  return script;
}

export function extractCliTool(command: string): string {
  try {
    const parsedEntries = shellQuote.parse(command);
    if (parsedEntries.length > 0) {
      const shellCommand = parsedEntries[0];
      if (typeof shellCommand === "string") {
        return shellCommand;
      } else if ("op" in shellCommand) {
        return shellCommand.op;
      } else if ("comment" in shellCommand) {
        return shellCommand.comment;
      } else {
        return "";
      }
    }
  } catch (e) {
    console.error(e);
  }
  return "";
}
