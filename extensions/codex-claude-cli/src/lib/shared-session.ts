import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

import { buildResumeCommand, shellQuote } from "./commands";
import { ChatSession } from "./types";

const executeFile = promisify(execFile);

export interface SharedSessionCommand {
  executable: string;
  arguments: string[];
  display: string;
  sessionName: string;
  isAttach: boolean;
}

function sharedSessionName(session: ChatSession): string {
  return `raycast-${session.provider}-${session.id}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

function tmuxExecutable(): string | undefined {
  const pathCandidates = (process.env.PATH || "")
    .split(delimiter)
    .filter(Boolean)
    .map((directoryPath) => join(directoryPath, "tmux"));
  const candidates = [
    "/opt/homebrew/bin/tmux",
    "/usr/local/bin/tmux",
    "/opt/local/bin/tmux",
    "/usr/bin/tmux",
    join(homedir(), ".local/bin/tmux"),
    join(homedir(), ".nix-profile/bin/tmux"),
    "/run/current-system/sw/bin/tmux",
    ...pathCandidates,
  ];
  return [...new Set(candidates)].find(isExecutable);
}

export async function hasSharedSession(session: ChatSession): Promise<boolean> {
  const executable = tmuxExecutable();
  if (!executable) return false;
  try {
    await executeFile(executable, ["has-session", "-t", sharedSessionName(session)], {
      timeout: 2_000,
      env: environmentWithoutTmuxClient(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function killSharedSession(session: ChatSession): Promise<boolean> {
  const executable = tmuxExecutable();
  if (!executable) return false;
  try {
    await executeFile(executable, ["kill-session", "-t", sharedSessionName(session)], {
      timeout: 2_000,
      env: environmentWithoutTmuxClient(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function buildSharedSessionCommand(
  session: ChatSession,
  options?: { permissionProfileId?: string },
): Promise<SharedSessionCommand | undefined> {
  const executable = tmuxExecutable();
  if (!executable) return undefined;
  const sessionName = sharedSessionName(session);
  const isAttach = await hasSharedSession(session);

  if (isAttach) {
    const argumentsList = ["-u", ...sharedSessionOptions(sessionName), "attach-session", "-t", sessionName];
    return {
      executable,
      arguments: argumentsList,
      display: [shellQuote(executable), ...argumentsList.map(shellQuote)].join(" "),
      sessionName,
      isAttach: true,
    };
  }

  const resume = buildResumeCommand(session, {
    permissionProfileId: options?.permissionProfileId,
  });
  const resumeShellCommand = `exec ${shellQuote(resume.executable)} ${resume.arguments.map(shellQuote).join(" ")}`;
  const argumentsList = [
    "-u",
    "new-session",
    "-d",
    "-s",
    sessionName,
    "-c",
    session.cwd,
    resumeShellCommand,
    ";",
    ...sharedSessionOptions(sessionName),
    "attach-session",
    "-t",
    sessionName,
  ];
  return {
    executable,
    arguments: argumentsList,
    display: [shellQuote(executable), ...argumentsList.map(shellQuote)].join(" "),
    sessionName,
    isAttach: false,
  };
}

function sharedSessionOptions(sessionName: string): string[] {
  return [
    "set-option",
    "-t",
    sessionName,
    "status",
    "off",
    ";",
    "set-option",
    "-t",
    sessionName,
    "mouse",
    "on",
    ";",
    "set-window-option",
    "-t",
    `${sessionName}:`,
    "history-limit",
    "50000",
    ";",
  ];
}

export async function buildExternalSharedShellCommand(
  session: ChatSession,
  permissionProfileId?: string,
): Promise<string | undefined> {
  const command = await buildSharedSessionCommand(session, { permissionProfileId });
  if (!command) return undefined;
  return ["/usr/bin/env", "-u", "TMUX", "-u", "TMUX_PANE", command.executable, ...command.arguments]
    .map(shellQuote)
    .join(" ");
}

function isExecutable(sourcePath: string): boolean {
  try {
    accessSync(sourcePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function environmentWithoutTmuxClient(): NodeJS.ProcessEnv {
  const processEnvironment = { ...process.env };
  delete processEnvironment.TMUX;
  delete processEnvironment.TMUX_PANE;
  return processEnvironment;
}
