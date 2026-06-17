import { type ChildProcess, exec, type ExecException } from "node:child_process";
import { env } from "../config";
import { showHUD, showToast, Toast } from "@raycast/api";
import { openTerminal } from "./terminalUtils";
import fs from "node:fs";
export function getAllSession(
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return exec(`tmux list-sessions | awk '{print $1}' | sed 's/://'`, { env }, callback);
}

export function directoryExists(directory: string): boolean {
  return fs.existsSync(directory);
}

export function createNewSession(
  sessionName: string,
  sessionDirectory: string,
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  const spaceEscapedSessionDirectory = sessionDirectory.replace(" ", "\\ ");

  return exec(`tmux new-session -d -s ${sessionName} -c ${spaceEscapedSessionDirectory}`, { env }, callback);
}

export function renameSession(
  oldSessionName: string,
  newSessionName: string,
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return exec(`tmux rename-session -t ${oldSessionName} ${newSessionName}`, { env }, callback);
}

export async function switchToSession(session: string, setLoading: (value: boolean) => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });
  setLoading(true);

  exec(`tmux switch -t ${session}`, { env }, async (error, stdout, stderr) => {
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

export async function deleteSession(session: string, setLoading: (value: boolean) => void, callback: () => void) {
  setLoading(true);
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });

  exec(`tmux kill-session -t ${session}`, { env }, (error, stdout, stderr) => {
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
