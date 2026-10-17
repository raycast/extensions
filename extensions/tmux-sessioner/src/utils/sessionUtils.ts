import { type ChildProcess, exec, type ExecException } from "node:child_process";
import { env } from "../config";
import { showHUD, showToast, Toast } from "@raycast/api";
import { openTerminal } from "./terminalUtils";
import { shq } from "./shellUtils";
import { openCommandInTerminal, type OpenTarget, UnsupportedTerminalError } from "./terminalLaunchUtils";
import fs from "node:fs";
export function getAllSession(
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return exec(`tmux list-sessions -F "#{session_name}"`, { env }, callback);
}

export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  lastActivity: Date;
}

export function getAllSessionsWithInfo(
  callback: (error: string | null, sessions: TmuxSession[]) => void,
): ChildProcess {
  return exec(
    `tmux list-sessions -F "#{session_windows}|#{session_attached}|#{session_activity}|#{session_name}"`,
    { env },
    (error, stdout, stderr) => {
      if (error || stderr) {
        const message = error ? error.message : stderr;

        // No server means no sessions, not a failure
        if (message.includes("no server running") || message.includes("error connecting")) {
          callback(null, []);
          return;
        }

        callback(message, []);
        return;
      }

      const sessions = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          // The name goes last in the format string because "|" is legal inside session names
          const [windows, attached, activity, ...nameParts] = line.split("|");

          return {
            name: nameParts.join("|"),
            windows: Number(windows),
            attached: Number(attached) > 0,
            lastActivity: new Date(Number(activity) * 1000),
          };
        });

      callback(null, sessions);
    },
  );
}

export function directoryExists(directory: string): boolean {
  return fs.existsSync(directory);
}

export function createNewSession(
  sessionName: string,
  sessionDirectory: string,
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return exec(`tmux new-session -d -s ${shq(sessionName)} -c ${shq(sessionDirectory)}`, { env }, callback);
}

export function renameSession(
  oldSessionName: string,
  newSessionName: string,
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return exec(`tmux rename-session -t ${shq("=" + oldSessionName)} ${shq(newSessionName)}`, { env }, callback);
}

export async function switchToSession(session: string, setLoading: (value: boolean) => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });
  setLoading(true);

  exec(`tmux switch -t ${shq("=" + session)}`, { env }, async (error, stdout, stderr) => {
    if (error || stderr) {
      console.error(`exec error: ${error || stderr}`);

      toast.style = Toast.Style.Failure;
      toast.title = "No tmux client found 😢";
      toast.message = error ? error.message : stderr;
      setLoading(false);

      return;
    }

    try {
      await openTerminal();

      toast.style = Toast.Style.Success;
      toast.title = `Switched to session ${session}`;
      await showHUD(`Switched to session ${session}`);
      setLoading(false);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Terminal not supported 😢";
      setLoading(false);
    }
    return;
  });
}

export function sendStartupCommand(
  session: string,
  command: string,
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  // Typing the command into the session shell (instead of making it the
  // session command) keeps the session alive after the command exits.
  // send-keys takes a pane target, where exact session match is "=name:"
  return exec(`tmux send-keys -t ${shq("=" + session + ":")} ${shq(command)} Enter`, { env }, callback);
}

export function killSessions(
  sessions: string[],
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  const commands = sessions.map((session) => `kill-session -t ${shq("=" + session)}`).join(" \\; ");

  return exec(`tmux ${commands}`, { env }, callback);
}

export function attachCommand(session: string): string {
  return `tmux attach-session -t ${shq("=" + session)}`;
}

export async function openSessionInTerminal(session: string, target: OpenTarget, setLoading: (value: boolean) => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });
  setLoading(true);

  // Fully awaited (no floating exec callback) so callers can popToRoot
  // afterwards without tearing down the command before the work is done
  const sessionExists = await new Promise<{ exists: boolean; message: string }>((resolve) => {
    exec(`tmux has-session -t ${shq("=" + session)}`, { env }, (error, _stdout, stderr) => {
      resolve({ exists: !error && !stderr, message: error ? error.message : stderr });
    });
  });

  if (!sessionExists.exists) {
    console.error(`exec error: ${sessionExists.message}`);

    toast.style = Toast.Style.Failure;
    toast.title = `Session ${session} no longer exists 😢`;
    toast.message = sessionExists.message;
    setLoading(false);

    return;
  }

  try {
    await openCommandInTerminal(target, attachCommand(session));

    toast.style = Toast.Style.Success;
    toast.title = `Opened session ${session} in new ${target}`;
    await showHUD(`Opened session ${session} in new ${target}`);
  } catch (e) {
    toast.style = Toast.Style.Failure;

    if (e instanceof UnsupportedTerminalError) {
      toast.title = "Not supported 😢";
      toast.message = `${e.message} — use Switch to Selected Session instead`;
    } else {
      toast.title = `Failed to open session in new ${target} 😢`;
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  setLoading(false);
}

export async function deleteSession(session: string, setLoading: (value: boolean) => void, callback: () => void) {
  setLoading(true);
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });

  exec(`tmux kill-session -t ${shq("=" + session)}`, { env }, (error, stdout, stderr) => {
    if (error || stderr) {
      console.error(`exec error: ${error || stderr}`);

      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong 😢";
      toast.message = error ? error.message : stderr;
      setLoading(false);
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = `Deleted session ${session}`;
    callback();
    setLoading(false);
  });
}
