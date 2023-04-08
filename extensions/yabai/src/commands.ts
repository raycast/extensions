import { execSync } from "child_process";
import loadHotkeys from "./hotkeys";
import os from "os";
import * as commandsJSON from "./commands/commands.json";
import * as devCommandsJSON from "./commands/dev_commands.json";
import { Command, ExecResult } from "./types";

export function loadCommands(): Command[] {
  const commands = JSON.parse(JSON.stringify(commandsJSON)).default as Command[];

  if (process.env.NODE_ENV !== "production") {
    const devCommands = JSON.parse(JSON.stringify(devCommandsJSON)).default as Command[];
    commands.push(...devCommands);
  }

  const hotkeys = loadHotkeys();
  for (const command of commands) {
    const hotkey = hotkeys.find((hotkey) => hotkey.shellCommand === command.shellCommand);
    if (hotkey) {
      command.key = hotkey.key;
    }
  }

  return commands;
}

function assertSafeCommand(command: string): boolean {
  const unsafeCharsPattern = /[|&;$!'"`<>]/g;
  const allowedCommands = ["echo", "cat", "ls", "cd", "open", "yabai", "skhd"];

  // Check for unsafe characters in the command
  if (command.match(unsafeCharsPattern)) {
    throw new Error("Unsafe characters detected in command");
  }

  // Check for multiple statements in the command
  const multipleStatements = ["|", "$( ... )", "` ... `", ">", "<", "&"];
  if (multipleStatements.some((statement) => command.includes(statement))) {
    throw new Error("Multiple statements not allowed in command");
  }

  // Split the command by semicolons or && to check for multiple commands
  const commands = command.split(/;|&&/);

  // Check if any of the commands are not allowed
  for (const cmd of commands) {
    const commandName = cmd.trim().split(" ")[0];
    if (!allowedCommands.includes(commandName)) {
      throw new Error(`Command not allowed: ${commandName}`);
    }
  }

  return true;
}

export function execCommand(command: string): ExecResult {
  let error_ = false;
  let detail = "";

  try {
    assertSafeCommand(command);
    const stdout = execSync(command, {
      shell: "/bin/zsh",
      env: {
        PATH: os.arch() === "arm64" ? "/opt/homebrew/bin" : "/usr/local/bin",
        USER: os.userInfo().username,
      },
    });

    detail = stdout.toString();
  } catch (error) {
    detail = "Command failed.";
    if (error instanceof Error) {
      detail = error.message;
    }
    error_ = true;
  }

  return {
    error: error_,
    detail: detail,
  };
}

export function assertYabai(): boolean {
  const result = execCommand("yabai -v");
  return !result.error;
}
